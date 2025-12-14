const fs = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');
let login = require('ws3-fca');

// Fix for newer library versions
if (typeof login !== 'function' && login.default) {
    login = login.default;
}

const scheduleTasks = require('./custom');

const app = express();
const PORT = Number(process.env.PORT || 3000);

// --- ⚙️ LOAD CONFIGURATION SAFELY ⚙️ ---
const configPath = path.resolve(__dirname, 'config.json');
const appStatePath = path.resolve(__dirname, 'appState.json');

if (!fs.existsSync(configPath)) {
    console.error("❌ FATAL ERROR: config.json is missing! Please create it.");
    process.exit(0);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const botPrefix = config.prefix || "/";

// --- 🌐 WEB SERVER 🌐 ---
app.get('/', (req, res) => res.send('🤖 Bot is Active.'));
app.listen(PORT, () => console.log(`🌐 Server running on Port ${PORT}`));

// Global Maps
global.events = new Map();
global.commands = new Map();
const cooldowns = new Map();

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

loadFiles();

// --- 🤖 BOT STARTUP 🤖 ---
const startBot = async () => {
    // Check for AppState
    if (!fs.existsSync(appStatePath)) {
        console.error("❌ ERROR: appState.json is missing. Please put your cookies there.");
        return;
    }

    let appState;
    try {
        appState = JSON.parse(fs.readFileSync(appStatePath, 'utf8'));
    } catch (err) {
        console.error("❌ ERROR: Your appState.json is broken (invalid JSON).");
        return;
    }

    login({ appState }, (err, api) => {
        if (err) {
            console.error('❌ Login Failed:', err);
            return;
        }

        api.setOptions({
            forceLogin: true,
            listenEvents: true,
            logLevel: "silent",
            selfListen: false,
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        });

        console.log(`✅ Logged in as: ${api.getCurrentUserID()}`);

        if (config.ownerID) scheduleTasks(config.ownerID, api, config);

        // Start specific events
        global.events.forEach((event, name) => {
            if (event.onStart) {
                try { event.onStart(api); } catch (e) { console.error(`❌ Event Start Error: ${name}`, e); }
            }
        });

        // Listen Mqtt
        api.listenMqtt(async (listenErr, event) => {
            if (listenErr) return console.error("Listener Error:", listenErr);

            // Handle Events
            if (global.events.has(event.type)) {
                try { await global.events.get(event.type).execute({ api, event, config }); } catch (e) {}
            }

            // Handle Commands
            if (event.body && event.body.startsWith(botPrefix)) {
                const args = event.body.slice(botPrefix.length).trim().split(/ +/);
                const cmdName = args.shift().toLowerCase();
                const cmd = global.commands.get(cmdName);

                if (cmd) {
                    // Permissions
                    if (cmd.admin) {
                        const isOwner = event.senderID === config.ownerID;
                        const isAdmin = config.admin && config.admin.includes(event.senderID);
                        if (!isOwner && !isAdmin) return api.sendMessage("🔒 Admin only.", event.threadID);
                    }

                    // Cooldowns
                    const now = Date.now();
                    const key = `${event.senderID}-${cmdName}`;
                    const cooldownAmount = (cmd.cooldown || 3) * 1000;
                    if (cooldowns.has(key)) {
                        const expiration = cooldowns.get(key) + cooldownAmount;
                        if (now < expiration) return; // Ignore spam
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
