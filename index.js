const fs = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');

// --- GLOBAL STATE ---
// New: Tracks if the bot successfully logged into Facebook
global.isLoggedIn = false; 
global.commands = new Map();
global.events = new Map();
const cooldowns = new Map();
// --------------------

// --- 🔧 LOAD LOGIN LIBRARY 🔧 ---
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

// --- ⚙️ LOAD CONFIGURATION ⚙️ ---
const configPath = path.resolve(__dirname, 'config.json');
const appStatePath = path.resolve(__dirname, 'appState.json');

let config;
if (fs.existsSync(configPath)) {
    try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); } 
    catch (e) { config = {}; console.error("❌ config.json is invalid."); }
} else { config = {}; }

const botPrefix = config.prefix || "/";

// ===============================================
// --- 🌐 WEB SERVER & API ENDPOINTS ---
// ===============================================

// Middleware to parse JSON body for API requests
app.use(express.json());

// Serve the entire root directory as static files (for index.html)
app.use(express.static(path.join(__dirname))); 

// Route for the root URL (/) to send the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- API 1: STATUS CHECK (for dynamic status/latency) ---
app.get('/api/status', (req, res) => {
    res.json({
        status: "Running",
        isLoggedIn: global.isLoggedIn,
        time: Date.now()
    });
});


// --- API 2: AI COMMANDS (The Bridge to your cmds logic) ---
app.post('/api/ai', async (req, res) => {
    const { command, query } = req.body;
    let reply = null;
    let error = null;

    try {
        switch (command) {
            case 'ai':
                // Logic hard-coded from cmds/ai.js
                const systemPrompt = "You are a helpful AI that talks as if they are talking to a kid, simple english, always say that you are made by seth asher salinguhay only say this if asked.";
                const apiUrl = "https://api.kojaxd.dpdns.org/ai/customai";
                
                const response = await axios.get(apiUrl, {
                    params: {
                        apikey: "Koja",
                        prompt: query,
                        system: systemPrompt
                    }
                });
                const data = response.data;
                reply = data.message || data.result || data.response || data;
                
                if (!reply || reply.includes("Amadeus Bot is Active")) {
                    error = "AI API status error or no meaningful response.";
                    reply = null;
                }
                break;

            case 'webpilot':
                // Logic hard-coded from cmds/webpilot.js
                const webpilotRes = await axios.get("https://betadash-api-swordslush-production.up.railway.app/webpilot", {
                    params: { search: query },
                    timeout: 35000
                });
                reply = webpilotRes.data?.response?.trim();
                if (!reply) throw new Error("WebPilot returned empty response.");
                reply = `🌐 **WebPilot**\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                break;
            
            case 'gemini':
                // Logic hard-coded from cmds/gemini.js (simplified for text-only)
                const geminiUrl = "https://norch-project.gleeze.com/api/gemini";
                const geminiRes = await axios.get(geminiUrl, { params: { prompt: query } });
                const geminiData = geminiRes.data;
                reply = geminiData.message || geminiData.response || geminiData.result || geminiData.content;
                if (!reply) throw new Error("Gemini returned empty response.");
                reply = `✨ **Gemini Vision**\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                break;
                
            default:
                error = `Command '${command}' not supported on this web interface.`;
        }
    } catch (e) {
        console.error(`Web Command Error [${command}]:`, e);
        error = `Error executing command: ${e.message || "Unknown error"}`;
    }

    res.json({ reply, error });
});

app.listen(PORT, () => console.log(`🌐 Server running on Port ${PORT}`));

// ===============================================
// --- END WEB SERVER SECTION ---
// ===============================================


// --- 📂 FILE LOADER (FB COMMANDS) 📂 ---
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

// --- 🤖 BOT STARTUP 🤖 ---
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
            global.isLoggedIn = false; // Fails to log in
            return;
        }

        global.isLoggedIn = true; // Successfully logged in!

        api.setOptions({
            forceLogin: true,
            listenEvents: true,
            logLevel: "silent",
            selfListen: false,
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        });

        console.log(`✅ Logged in successfully! ID: ${api.getCurrentUserID()}`);
        
        // --- CUSTOM SCHEDULER (Requires 'custom.js') ---
        if (config.ownerID) {
            try { 
                const scheduleTasks = require('./custom'); 
                scheduleTasks(config.ownerID, api, config); 
            } catch (e) { 
                console.log("⚠️ Custom scheduler error."); 
            }
        }


        global.events.forEach((event, name) => {
            if (event.onStart) {
                try { event.onStart(api); } catch (e) { console.error(`❌ Event Start Error: ${name}`, e); }
            }
        });

        api.listenMqtt(async (listenErr, event) => {
            if (listenErr) return console.error("Listener Error:", listenErr);

            // --- 🔧 ID HELPER FIX ---
            if(event.body === "/myid") {
                console.log(`🆔 User requested ID: ${event.senderID}`);
                return api.sendMessage(`🆔 Your UID: ${event.senderID}\n\nCopy this number and paste it into config.json as your "ownerID".`, event.threadID);
            }
            // ------------------------

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
                        const adminList = (config.admin || []).map(id => String(id));

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
