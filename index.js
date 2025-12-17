const fs = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');

// --- GLOBAL STATE ---
global.isLoggedIn = false;
global.commands = new Map();
global.events = new Map();
const cooldowns = new Map();

// --- 🔧 LOAD LOGIN LIBRARY ---
let loginModule;
let login;
try {
    loginModule = require('ws3-fca');
    if (typeof loginModule === 'function') login = loginModule;
    else if (loginModule && typeof loginModule.default === 'function') login = loginModule.default;
    else if (loginModule && typeof loginModule.login === 'function') login = loginModule.login;
    else throw new Error("Login function not found in ws3-fca");
} catch (e) {
    console.error("\n❌ CRITICAL ERROR: Could not load 'ws3-fca'.");
    process.exit(1);
}

const scheduleTasks = require('./custom');
const app = express();
const PORT = Number(process.env.PORT || 3000);

// --- ⚙️ LOAD CONFIGURATION (ENV VARS FIRST, THEN config.json) ---
const config = {
    ownerID: process.env.OWNER_ID || null,
    prefix: process.env.BOT_PREFIX || "/",
    admin: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [],
    autoRestart: (process.env.AUTO_RESTART || "true").toLowerCase() === "true",
    aiApiKey: process.env.AI_API_KEY || "Koja",
    xdashApiKey: process.env.XDASH_API_KEY || "3884224f549d964644816c61b1b65d84"
};

// Fallback: If no env vars, try config.json (for local dev)
const configPath = path.resolve(__dirname, 'config.json');
if (!process.env.OWNER_ID && fs.existsSync(configPath)) {
    try {
        const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config.ownerID = fileConfig.ownerID || config.ownerID;
        config.prefix = fileConfig.prefix || config.prefix;
        config.admin = fileConfig.admin || config.admin;
        config.autoRestart = fileConfig.autoRestart !== undefined ? fileConfig.autoRestart : config.autoRestart;
        config.aiApiKey = fileConfig.aiApiKey || config.aiApiKey;
        config.xdashApiKey = fileConfig.xdashApiKey || config.xdashApiKey;
    } catch (e) {
        console.error("❌ config.json is invalid. Using env vars only.");
    }
}

const botPrefix = config.prefix;

// ===============================================
// --- 🌐 WEB SERVER & API ENDPOINTS ---
// ===============================================
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- API 1: STATUS ---
app.get('/api/status', (req, res) => {
    res.json({
        status: "Running",
        isLoggedIn: global.isLoggedIn,
        time: Date.now()
    });
});

// --- API 2: AI COMMANDS (Delegates to cmd files + captures reactions) ---
app.post('/api/ai', async (req, res) => {
    const { command, query } = req.body;
    const allowedWebCommands = ['ai', 'webpilot', 'gemini'];
    if (!allowedWebCommands.includes(command)) {
        return res.json({ error: `Command '${command}' not supported on web.`, reaction: '❌' });
    }

    const cmd = global.commands.get(command);
    if (!cmd || typeof cmd.execute !== 'function') {
        return res.json({ error: `Command '${command}' not found.`, reaction: '❓' });
    }

    let webReply = null;
    let webReaction = '💬';

    const mockApi = {
        sendMessage: (content) => {
            if (typeof content === 'string') webReply = content;
            else if (content?.body) webReply = content.body;
        },
        setMessageReaction: (emoji) => { webReaction = emoji; },
        getCurrentUserID: () => 'web_user',
        getThreadInfo: () => Promise.resolve({ isGroup: false, threadName: 'Web Chat' }),
        getUserInfo: () => Promise.resolve({})
    };

    const mockEvent = {
        threadID: 'web',
        messageID: `web_${Date.now()}`,
        senderID: 'web_user',
        body: `${command} ${query}`,
        isGroup: false,
        mentions: {},
        messageReply: null,
        attachments: []
    };

    try {
        await cmd.execute({
            api: mockApi,
            event: mockEvent,
            args: query.trim() ? query.split(' ') : [],
            config: config
        });
        res.json({ reply: webReply || null, reaction: webReaction });
    } catch (e) {
        console.error(`Web API Error [${command}]:`, e.message || e);
        res.json({ error: 'Command execution failed.', reaction: '❌' });
    }
});

app.listen(PORT, () => console.log(`🌐 Server running on Port ${PORT}`));

// ===============================================
// --- FILE LOADER ---
// ===============================================
function loadFiles() {
    const eventsDir = path.resolve(__dirname, 'events');
    const cmdsDir = path.resolve(__dirname, 'cmds');
    if (fs.existsSync(eventsDir)) {
        fs.readdirSync(eventsDir).forEach(file => {
            if (file.endsWith('.js')) {
                try {
                    const event = require(path.join(eventsDir, file));
                    if (event.name) global.events.set(event.name, event);
                } catch (e) { console.error(`❌ Error loading event ${file}:`, e); }
            }
        });
    }
    if (fs.existsSync(cmdsDir)) {
        fs.readdirSync(cmdsDir).forEach(file => {
            if (file.endsWith('.js')) {
                try {
                    const cmd = require(path.join(cmdsDir, file));
                    if (cmd.name) {
                        global.commands.set(cmd.name, cmd);
                        if (cmd.aliases) cmd.aliases.forEach(a => global.commands.set(a, cmd));
                    }
                } catch (e) { console.error(`❌ Error loading cmd ${file}:`, e); }
            }
        });
    }
    console.log(`📦 Loaded ${global.commands.size} commands & ${global.events.size} events.`);
}
loadFiles();

// ===============================================
// --- 🤖 BOT STARTUP ---
// ===============================================
const appStatePath = path.resolve(__dirname, 'appState.json');
const startBot = async () => {
    if (!fs.existsSync(appStatePath)) {
        console.error("\n❌ STOP: appState.json is missing.");
        return;
    }
    let appState;
    try { appState = JSON.parse(fs.readFileSync(appStatePath, 'utf8')); } 
    catch (err) { console.error("❌ ERROR: appState.json is broken."); return; }

    login({ appState }, (err, api) => {
        if (err) {
            console.error('❌ Login Failed. Cookies might be expired.', err);
            global.isLoggedIn = false;
            return;
        }
        global.isLoggedIn = true;
        api.setOptions({
            forceLogin: true,
            listenEvents: true,
            logLevel: "silent",
            selfListen: false,
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        });
        console.log(`✅ Logged in successfully! ID: ${api.getCurrentUserID()}`);

        if (config.ownerID) {
            try { scheduleTasks(config.ownerID, api, config); }
            catch (e) { console.log("⚠️ Custom scheduler error."); }
        }

        global.events.forEach((event, name) => {
            if (event.onStart) {
                try { event.onStart(api); } catch (e) { console.error(`❌ Event Start Error: ${name}`, e); }
            }
        });

        api.listenMqtt(async (listenErr, event) => {
            if (listenErr) return console.error("Listener Error:", listenErr);
            if(event.body === "/myid") {
                console.log(`🆔 User requested ID: ${event.senderID}`);
                return api.sendMessage(`🆔 Your UID: ${event.senderID}\nCopy this number and paste it into config.json as your "ownerID".`, event.threadID);
            }
            if (global.events.has(event.type)) {
                try { await global.events.get(event.type).execute({ api, event, config }); } catch (e) {}
            }
            if (event.body && event.body.startsWith(botPrefix)) {
                const args = event.body.slice(botPrefix.length).trim().split(/ +/);
                const cmdName = args.shift().toLowerCase();
                const cmd = global.commands.get(cmdName);
                if (cmd) {
                    if (cmd.admin) {
                        const senderID = String(event.senderID);
                        const ownerID = String(config.ownerID);
                        const adminList = (Array.isArray(config.admin) ? config.admin : []).map(id => String(id));
                        const isOwner = senderID === ownerID;
                        const isAdmin = adminList.includes(senderID);
                        if (!isOwner && !isAdmin) return api.sendMessage("🔒 Admin only.", event.threadID);
                    }
                    const now = Date.now();
                    const key = `${event.senderID}-${cmdName}`;
                    const cooldownAmount = (cmd.cooldown || 3) * 1000;
                    if (cooldowns.has(key)) {
                        const expiration = cooldowns.get(key) + cooldownAmount;
                        if (now < expiration) return;
                    }
                    cooldowns.set(key, now);
                    try {
                        await cmd.execute({ api, event, args, config });
                    } catch (e) {
                        console.error(`Error in ${cmdName}:`, e);
                        api.sendMessage("❌ Error executing command.", event.threadID);
                    }
                }
            }
        });
    });
};
startBot();
