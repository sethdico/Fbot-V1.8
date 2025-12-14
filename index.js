const fs = require('fs');
const path = require('path');
const express = require('express');
const login = require('ws3-fca');
const scheduleTasks = require('./custom');

const app = express();
const PORT = Number(process.env.PORT || 3000);

// --- ⚙️ CONFIGURATION LOADING ⚙️ ---
function loadJson(filePath) {
    try {
        if (!fs.existsSync(filePath)) return {};
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        return {};
    }
}

const config = loadJson(path.resolve(__dirname, 'config.json'));
const appState = loadJson(path.resolve(__dirname, 'appState.json'));
const botPrefix = config.prefix || "/";

// Global Maps
global.events = new Map();
global.commands = new Map();
const cooldowns = new Map();

// --- 🛡️ HUMANIZATION HELPERS 🛡️ ---
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Simulate reading speed + thinking time
const getHumanDelay = (textLength) => {
    const readingSpeed = rnd(50, 150); // ms per character
    const thinkingTime = rnd(2000, 5000); // Base thinking time
    return (textLength * readingSpeed) + thinkingTime;
};

// --- 📂 FILE LOADER 📂 ---
function loadFiles() {
    const eventsDir = path.resolve(__dirname, 'events');
    const cmdsDir = path.resolve(__dirname, 'cmds');

    // Load Events
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

    // Load Commands
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

// --- 🌐 WEB SERVER (FOR RENDER) 🌐 ---
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.send('🤖 Bot is Active & Humanized.'));
app.listen(PORT, () => console.log(`🌐 Server running on Port ${PORT}`));

loadFiles();

// --- 🤖 BOT LOGIC 🤖 ---
const startBot = async () => {
    login({ appState }, (err, api) => {
        if (err) {
            console.error('❌ Login Failed. Check appState.json!', err);
            return;
        }

        // 🛡️ SECURITY OPTIONS
        api.setOptions({
            forceLogin: true,
            listenEvents: true,
            logLevel: "info", // Changed to INFO for debugging
            selfListen: false,
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        });

        console.log(`✅ Logged in as: ${api.getCurrentUserID()}`);

        // 1. Initialize Scheduler
        if (config.ownerID) scheduleTasks(config.ownerID, api, config);

        // 2. FIX: Initialize "onStart" events (AutoPost, etc.)
        global.events.forEach((event, name) => {
            if (event.onStart) {
                try {
                    event.onStart(api);
                    console.log(`✨ Started event module: ${name}`);
                } catch (e) {
                    console.error(`❌ Failed to start event ${name}:`, e);
                }
            }
        });

        // 3. Listen for Messages
        api.listenMqtt(async (listenErr, event) => {
            if (listenErr) return console.error("Listener Error:", listenErr);

            // Handle Events (Welcome, etc.)
            if (global.events.has(event.type)) {
                try { await global.events.get(event.type).execute({ api, event }); } catch (e) {}
            }

            // Handle Commands
            if (event.body && event.body.startsWith(botPrefix)) {
                const args = event.body.slice(botPrefix.length).trim().split(/ +/);
                const cmdName = args.shift().toLowerCase();
                const cmd = global.commands.get(cmdName);

                if (cmd) {
                    // Admin Check
                    if (cmd.admin) {
                        const isOwner = event.senderID === config.ownerID;
                        const isAdmin = config.admin && config.admin.includes(event.senderID);
                        if (!isOwner && !isAdmin) return api.sendMessage("🔒 Admin only.", event.threadID);
                    }

                    // Cooldown Check
                    const now = Date.now();
                    const key = `${event.senderID}-${cmdName}`;
                    const cooldownAmount = (cmd.cooldown || 5) * 1000;
                    if (cooldowns.has(key)) {
                        const expiration = cooldowns.get(key) + cooldownAmount;
                        if (now < expiration) {
                            // Don't reply to spam, just ignore
                            return; 
                        }
                    }
                    cooldowns.set(key, now);

                    // 🎭 HUMAN BEHAVIOR 🎭
                    try {
                        // 1. Wait (Read time)
                        await sleep(getHumanDelay(event.body.length));

                        // 2. Mark Read
                        api.markAsRead(event.threadID);

                        // 3. Type
                        api.sendTypingIndicator(event.threadID, () => {});
                        await sleep(rnd(1500, 4000)); // Typing time

                        // 4. Execute
                        await cmd.execute({ api, event, args });

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
