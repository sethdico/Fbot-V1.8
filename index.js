const fs = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');

// --- 🔧 ROBUST LIBRARY LOADER (The Fix) ---
let login;
try {
    const loginModule = require('ws3-fca');
    // Check all possible export locations
    if (typeof loginModule === 'function') login = loginModule;
    else if (loginModule && typeof loginModule.default === 'function') login = loginModule.default;
    else if (loginModule && typeof loginModule.login === 'function') login = loginModule.login;
    else {
        throw new Error("Could not find login function in ws3-fca");
    }
} catch (e) {
    console.error("❌ CRITICAL ERROR: ws3-fca library failed to load.");
    console.error("Details:", e.message);
    process.exit(1);
}

// --- GLOBAL STATE ---
global.isLoggedIn = false;
global.commands = new Map();
global.events = new Map();
const cooldowns = new Map();
const threadRateLimit = new Map();

// --- CONFIGURATION ---
console.log("🔧 Loading configuration...");
const configPath = path.resolve(__dirname, 'config.json');

if (!fs.existsSync(configPath)) {
    console.error("❌ FATAL ERROR: config.json is missing!");
    process.exit(1);
}

let config;
try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
    console.error("❌ FATAL ERROR: config.json is invalid!");
    process.exit(1);
}

config.ownerID = String(config.ownerID);
config.admin = Array.isArray(config.admin) ? config.admin.map(id => String(id)) : [config.ownerID];
config.prefix = config.prefix || "/";
global.config = config;

console.log(`👑 Owner ID: ${config.ownerID}`);
console.log(`🛡️ Safe Mode: ${config.safeMode ? "ON" : "OFF"}`);

// --- 🛡️ QUEUE SYSTEM ---
const msgQueue = [];
let queueProcessing = false;

const processQueue = async () => {
    if (queueProcessing || msgQueue.length === 0) return;
    queueProcessing = true;

    const task = msgQueue.shift();
    try {
        await task.execute();
    } catch (e) {
        console.error("⚠️ Queue Task Error:", e.message);
    }

    setTimeout(() => {
        queueProcessing = false;
        processQueue();
    }, config.messageDelay || 2000);
};

// --- API WRAPPER ---
const createSafeApi = (rawApi) => {
    return {
        ...rawApi,
        sendMessage: (msg, threadID, callback = null, replyID = null) => {
            return new Promise((resolve, reject) => {
                msgQueue.push({
                    execute: () => {
                        return new Promise((done) => {
                            rawApi.sendMessage(msg, threadID, (err, info) => {
                                if (err) {
                                    if (callback) callback(err, null);
                                    reject(err);
                                } else {
                                    if (callback) callback(null, info);
                                    resolve(info);
                                }
                                done();
                            }, replyID);
                        });
                    }
                });
                processQueue();
            });
        },
        setMessageReaction: rawApi.setMessageReaction,
        sendMessageStream: async (text, stream, threadID) => {
             msgQueue.push({
                execute: () => {
                    return new Promise((done) => {
                        rawApi.sendMessage({ body: text, attachment: stream }, threadID, () => done());
                    });
                }
            });
            processQueue();
        }
    };
};

// --- 🌐 WEB SERVER ---
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/api/status', (req, res) => {
    res.json({
        status: "Running",
        isLoggedIn: global.isLoggedIn,
        queueLength: msgQueue.length,
        uptime: process.uptime()
    });
});

app.listen(PORT, () => {
    console.log(`🌐 Web interface: http://localhost:${PORT}`);
});

// --- FILE LOADER ---
function loadFiles() {
    console.log("\n📦 Loading system files...");
    const eventsDir = path.resolve(__dirname, 'events');
    const cmdsDir = path.resolve(__dirname, 'cmds');

    if (fs.existsSync(eventsDir)) {
        fs.readdirSync(eventsDir).forEach(file => {
            if (!file.endsWith('.js')) return;
            try {
                const event = require(path.join(eventsDir, file));
                if (event.name) global.events.set(event.name, event);
            } catch (e) { console.error(`❌ Event Load Error (${file}):`, e.message); }
        });
    }

    if (fs.existsSync(cmdsDir)) {
        fs.readdirSync(cmdsDir).forEach(file => {
            if (!file.endsWith('.js')) return;
            try {
                const cmd = require(path.join(cmdsDir, file));
                if (cmd.name) {
                    global.commands.set(cmd.name.toLowerCase(), cmd);
                    if (cmd.aliases) cmd.aliases.forEach(a => global.commands.set(a.toLowerCase(), cmd));
                }
            } catch (e) { console.error(`❌ Command Load Error (${file}):`, e.message); }
        });
    }
    console.log(`✅ Loaded ${global.commands.size} commands & ${global.events.size} events`);
}
loadFiles();

// --- 🤖 BOT STARTUP ---
const appStatePath = path.resolve(__dirname, 'appState.json');

async function startBot() {
    if (!fs.existsSync(appStatePath)) {
        console.error("❌ appState.json missing!");
        return;
    }

    const appState = JSON.parse(fs.readFileSync(appStatePath, 'utf8'));

    // Fix: Pass object { appState } directly
    login({ appState }, async (err, rawApi) => {
        if (err) {
            console.error("❌ LOGIN FAILED:", err);
            return process.exit(1);
        }

        global.isLoggedIn = true;
        
        // Wrap API for Safety
        const api = createSafeApi(rawApi);
        global.api = api;

        api.setOptions({
            forceLogin: true,
            listenEvents: true,
            logLevel: "silent",
            selfListen: false
        });

        // Start Scheduler
        if (config.autoRestart) {
            try {
                // Ensure custom.js exists, or skip
                if(fs.existsSync('./custom.js')) require('./custom')(config.ownerID, api, config);
            } catch(e) {}
        }

        global.events.forEach(event => {
            if (event.onStart) event.onStart(api);
        });

        console.log(`✅ BOT STARTED | SAFE MODE: ${config.safeMode ? "ACTIVE" : "OFF"}`);

        api.listenMqtt(async (err, event) => {
            if (err) return console.error("Listener Error:", err);

            if (global.events.has(event.type)) {
                try { await global.events.get(event.type).execute({ api, event, config }); } catch(e){}
            }

            if (!event.body) return;

            // Anti-Raid
            const now = Date.now();
            const threadData = threadRateLimit.get(event.threadID) || [];
            const recent = threadData.filter(t => now - t < 10000); 
            if (recent.length > 8) {
                if (recent.length === 9) console.log(`🛡️ Rate limiting spam in thread: ${event.threadID}`);
                return; 
            }
            recent.push(now);
            threadRateLimit.set(event.threadID, recent);

            if (event.body.startsWith(config.prefix)) {
                const args = event.body.slice(config.prefix.length).trim().split(/ +/);
                const cmdName = args.shift().toLowerCase();
                const cmd = global.commands.get(cmdName);

                if (!cmd) return;

                const isOwner = String(event.senderID) === String(config.ownerID);
                const isAdmin = config.admin.includes(String(event.senderID));
                
                if (cmd.admin && !isOwner && !isAdmin) {
                    return api.setMessageReaction("🔒", event.messageID, () => {}, true);
                }

                const cdKey = `${event.senderID}_${cmdName}`;
                if (cooldowns.has(cdKey)) {
                    if (now < cooldowns.get(cdKey)) return api.setMessageReaction("⏳", event.messageID, () => {}, true);
                }
                cooldowns.set(cdKey, now + (cmd.cooldown || 3) * 1000);

                try {
                    api.sendTypingIndicator(true, event.threadID);
                    await cmd.execute({ api, event, args, config });
                    api.sendTypingIndicator(false, event.threadID);
                    if (event.messageID) api.setMessageReaction("✅", event.messageID, () => {}, true);
                } catch (e) {
                    api.sendTypingIndicator(false, event.threadID);
                    console.error(`❌ CMD Error [${cmdName}]:`, e.message);
                    api.setMessageReaction("❌", event.messageID, () => {}, true);
                }
            }
        });
    });
}

startBot();

process.on('uncaughtException', (err) => console.error("🔥 Crash prevented:", err.message));
process.on('unhandledRejection', (err) => console.error("🔥 Rejection prevented:", err.message));
