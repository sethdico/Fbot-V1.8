const fs = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');

// --- GLOBAL STATE ---
global.isLoggedIn = false;
global.commands = new Map();
global.events = new Map();
const cooldowns = new Map();

// --- CONFIGURATION: ONLY USE config.json ---
console.log("🔧 Loading configuration from config.json...");
const configPath = path.resolve(__dirname, 'config.json');

// Validate config.json exists
if (!fs.existsSync(configPath)) {
    console.error("\n❌ FATAL ERROR: config.json is missing!");
    console.error("👉 Create it with this format:");
    console.error(JSON.stringify({
        prefix: "/",
        ownerID: "YOUR_FACEBOOK_ID",
        admin: ["YOUR_FACEBOOK_ID"],
        autoRestart: true,
        aiApiKey: "Koja",
        xdashApiKey: "3884224f549d964644816c61b1b65d84"
    }, null, 2));
    process.exit(1);
}

// Parse and validate config.json
let config;
try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log("✅ config.json loaded successfully!");
} catch (e) {
    console.error("\n❌ FATAL ERROR: config.json is invalid!");
    console.error("👉 Fix the JSON syntax error (missing comma or quote)");
    console.error("👉 Use a JSON validator: https://jsonlint.com/");
    process.exit(1);
}

// Validate required fields
const requiredFields = ['ownerID'];
for (const field of requiredFields) {
    if (!config[field]) {
        console.error(`\n❌ FATAL ERROR: config.json missing required field "${field}"`);
        process.exit(1);
    }
}

// Ensure all IDs are STRINGS (fixes 90% of permission issues)
config.ownerID = String(config.ownerID);
config.admin = Array.isArray(config.admin) 
    ? config.admin.map(id => String(id)) 
    : [config.ownerID];

// Set defaults for optional fields
config.prefix = config.prefix || "/";
config.autoRestart = config.autoRestart !== undefined ? config.autoRestart : true;
config.aiApiKey = config.aiApiKey || "Koja";
config.xdashApiKey = config.xdashApiKey || "3884224f549d964644816c61b1b65d84";
const botPrefix = config.prefix;
global.config = config; // Make available globally for all commands

console.log(`👑 Bot Owner ID (STRING): ${config.ownerID}`);
console.log(`👥 Admin IDs: ${config.admin.join(', ')}`);
console.log(`⌨️ Command Prefix: "${botPrefix}"`);

// --- 🔧 LOAD LOGIN LIBRARY ---
console.log("🔌 Loading Facebook API library...");
let loginModule;
let login;
try {
    loginModule = require('ws3-fca');
    if (typeof loginModule === 'function') login = loginModule;
    else if (loginModule && typeof loginModule.default === 'function') login = loginModule.default;
    else if (loginModule && typeof loginModule.login === 'function') login = loginModule.login;
    else throw new Error("Login function not found in ws3-fca");
    console.log("✅ Facebook API library loaded!");
} catch (e) {
    console.error("\n❌ FATAL ERROR: Could not load 'ws3-fca'.");
    console.error("👉 Run: npm install ws3-fca");
    process.exit(1);
}

// --- CUSTOM SCHEDULER ---
const scheduleTasks = require('./custom');

// --- 🌐 WEB SERVER SETUP ---
const app = express();
const PORT = 3000; // Fixed port, no env vars

// Middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(express.static(path.join(__dirname)));

// --- API ENDPOINTS ---
// Homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Status endpoint (safe even if bot isn't logged in)
app.get('/api/status', (req, res) => {
    res.json({
        status: "Running",
        isLoggedIn: global.isLoggedIn,
        ownerID: config.ownerID,
        uptime: process.uptime(),
        time: new Date().toISOString()
    });
});

// AI commands endpoint (web interface)
app.post('/api/ai', async (req, res) => {
    const { command, query } = req.body;
    const allowedWebCommands = ['ai', 'webpilot', 'gemini', 'you'];

    // Basic validation
    if (!command || !query) {
        return res.status(400).json({ 
            error: "Missing command or query", 
            reaction: '❌' 
        });
    }
    if (!allowedWebCommands.includes(command.toLowerCase())) {
        return res.json({ 
            error: `Command '${command}' not supported on web. Use: ${allowedWebCommands.join(', ')}`, 
            reaction: '❌' 
        });
    }

    const cmd = global.commands.get(command.toLowerCase());
    if (!cmd || typeof cmd.execute !== 'function') {
        return res.json({ 
            error: `Command '${command}' not found or not executable.`, 
            reaction: '❓' 
        });
    }

    // Mock API and Event objects for web execution
    let webReply = "⚠️ No response received.";
    let webReaction = '💬';
    const mockApi = {
        sendMessage: (content) => {
            if (typeof content === 'string') webReply = content;
            else if (content?.body) webReply = content.body;
            else if (content?.attachment) webReply = "[Image/Attachment Response]";
        },
        setMessageReaction: (emoji) => { webReaction = emoji; },
        getCurrentUserID: () => 'web_user',
        getThreadInfo: async () => ({ isGroup: false, threadName: 'Web Chat' }),
        getUserInfo: async () => ({ name: 'Web User' }),
        unsendMessage: () => {},
        createPost: () => Promise.resolve('https://facebook.com')
    };
    const mockEvent = {
        threadID: 'web_chat',
        messageID: `web_${Date.now()}`,
        senderID: 'web_user',
        body: `${command} ${query}`,
        isGroup: false,
        mentions: {},
        messageReply: null,
        attachments: [],
        type: 'message'
    };

    try {
        // Simulate cooldown (10s for web users)
        const now = Date.now();
        const key = `web_user-${command}`;
        const cooldownAmount = 10 * 1000;
        if (cooldowns.has(key)) {
            const expiration = cooldowns.get(key) + cooldownAmount;
            if (now < expiration) {
                const remaining = Math.ceil((expiration - now) / 1000);
                return res.json({ 
                    error: `Slow down! Wait ${remaining} more seconds.`, 
                    reaction: '⏳' 
                });
            }
        }
        cooldowns.set(key, now);

        // Execute command
        await cmd.execute({
            api: mockApi,
            event: mockEvent,
            args: query.trim() ? query.split(' ') : [],
            config: config
        });

        // Return response
        res.json({ 
            reply: webReply || "✅ Command executed successfully", 
            reaction: webReaction 
        });
    } catch (e) {
        console.error(`🌐 Web API Error [${command}]:`, e.message || e);
        res.status(500).json({ 
            error: "Command execution failed. Try again later.",
            details: process.env.NODE_ENV === 'development' ? e.message : undefined,
            reaction: '❌' 
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🌐 Web interface running at http://localhost:${PORT}`);
    console.log(`🚀 Bot starting up...`);
});

// --- FILE LOADER ---
function loadFiles() {
    console.log("\n📦 Loading commands and events...");

    // Create cache directory if missing (prevents file errors)
    const cacheDir = path.resolve(__dirname, 'cache');
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
        console.log("📁 Created cache directory");
    }

    const eventsDir = path.resolve(__dirname, 'events');
    const cmdsDir = path.resolve(__dirname, 'cmds');

    // Load events
    let eventCount = 0;
    if (fs.existsSync(eventsDir)) {
        const eventFiles = fs.readdirSync(eventsDir).filter(f => f.endsWith('.js'));
        console.log(`ControlEvents: Found ${eventFiles.length} event files`);
        for (const file of eventFiles) {
            try {
                delete require.cache[require.resolve(path.join(eventsDir, file))];
                const event = require(path.join(eventsDir, file));
                if (event.name) {
                    global.events.set(event.name, event);
                    eventCount++;
                    console.log(`✅ Loaded event: ${event.name}`);
                } else {
                    console.warn(`⚠️ Skipped ${file}: missing "name" property`);
                }
            } catch (e) {
                console.error(`❌ Failed to load event ${file}:`, e.message);
            }
        }
    }

    // Load commands
    let cmdCount = 0;
    if (fs.existsSync(cmdsDir)) {
        const cmdFiles = fs.readdirSync(cmdsDir).filter(f => f.endsWith('.js'));
        console.log(`ControlEvents: Found ${cmdFiles.length} command files`);
        for (const file of cmdFiles) {
            try {
                delete require.cache[require.resolve(path.join(cmdsDir, file))];
                const cmd = require(path.join(cmdsDir, file));
                if (cmd.name) {
                    // Register main command
                    global.commands.set(cmd.name.toLowerCase(), cmd);
                    cmdCount++;
                    // Register aliases
                    if (cmd.aliases && Array.isArray(cmd.aliases)) {
                        for (const alias of cmd.aliases) {
                            global.commands.set(alias.toLowerCase(), cmd);
                        }
                    }
                    console.log(`✅ Loaded command: ${cmd.name}` + 
                        (cmd.aliases?.length ? ` (aliases: ${cmd.aliases.join(', ')})` : ''));
                } else {
                    console.warn(`⚠️ Skipped ${file}: missing "name" property`);
                }
            } catch (e) {
                console.error(`❌ Failed to load command ${file}:`, e.message);
            }
        }
    }

    console.log(`📊 Loaded ${eventCount} events and ${cmdCount} commands`);
    return { eventCount, cmdCount };
}

// Initial load
const loadResult = loadFiles();

// --- 🤖 BOT STARTUP ---
const appStatePath = path.resolve(__dirname, 'appState.json');
async function startBot() {
    console.log("\n🤖 Starting Facebook bot...");

    // Validate appState.json
    if (!fs.existsSync(appStatePath)) {
        console.error("\n❌ FATAL ERROR: appState.json is missing!");
        console.error("👉 You need valid Facebook cookies to log in");
        console.error("👉 Use a cookie extractor extension to get them");
        return;
    }

    let appState;
    try {
        appState = JSON.parse(fs.readFileSync(appStatePath, 'utf8'));
        console.log("✅ appState.json loaded");
    } catch (err) {
        console.error("\n❌ ERROR: appState.json is invalid or corrupted");
        console.error("👉 Get fresh cookies and replace the file");
        return;
    }

    // Facebook login
    console.log("🔐 Attempting Facebook login...");
    login({ appState, logLevel: "silent" }, async (err, api) => {
        if (err) {
            console.error("\n❌ LOGIN FAILED!");
            if (err.error === 'Error retrieving userID. This can be caused by a lot of things, including getting blocked by Facebook for logging in from an unknown location.') {
                console.error("👉 Your cookies have EXPIRED. Get fresh ones.");
            } else if (err.error === 'Your account is temporarily locked') {
                console.error("👉 Your account is LOCKED. Log in manually on Facebook first.");
            } else {
                console.error("👉 Details:", err);
            }
            global.isLoggedIn = false;
            // Optional: Auto-restart after 5 minutes if failed
            setTimeout(() => {
                console.log("🔃 Attempting auto-restart after login failure...");
                process.exit(1);
            }, 300000);
            return;
        }

        // SUCCESSFUL LOGIN
        global.isLoggedIn = true;
        const botID = api.getCurrentUserID();
        console.log(`✅ SUCCESSFULLY LOGGED IN!`);
        console.log(`👤 Bot User ID: ${botID}`);
        console.log(`👑 Config Owner ID: ${config.ownerID}`);
        console.log(`✅ ID Match: ${String(botID) === String(config.ownerID) ? 'YES' : 'NO'}`);

        // API configuration
        api.setOptions({
            forceLogin: true,
            listenEvents: true,
            logLevel: "silent",
            selfListen: false,
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        });

        // Start scheduler if enabled
        if (config.autoRestart) {
            try {
                scheduleTasks(config.ownerID, api, config);
                console.log("⏰ Auto-restart scheduler activated");
            } catch (e) {
                console.error("⚠️ Scheduler error:", e.message);
            }
        }

        // Event start hooks
        for (const [name, event] of global.events) {
            if (event.onStart && typeof event.onStart === 'function') {
                try {
                    await event.onStart(api);
                    console.log(`🚀 Started event: ${name}`);
                } catch (e) {
                    console.error(`❌ Event start failed: ${name}`, e.message);
                }
            }
        }

        // Message listener
        api.listenMqtt(async (listenErr, event) => {
            if (listenErr) {
                console.error("🔴 Listener error:", listenErr);
                return;
            }

            // Special command: Get your ID
            if (event.body === "/myid" || event.body === `${botPrefix}myid`) {
                console.log(`🆔 User ${event.senderID} requested their ID`);
                const msg = `🆔 Your Facebook User ID:\n${event.senderID}\n` +
                           `💡 To set yourself as bot owner:\n` +
                           `1. Copy this ID\n` +
                           `2. Paste into config.json as "ownerID"\n` +
                           `3. Restart the bot`;
                return api.sendMessage(msg, event.threadID);
            }

            // Debug command (works for anyone)
            if (event.body === "/debug" || event.body === `${botPrefix}debug`) {
                const isOwner = String(event.senderID) === String(config.ownerID);
                const isAdmin = config.admin.includes(String(event.senderID));
                const debugMsg = `🛠️ DEBUG INFORMATION\n` +
                               `━━━━━━━━━━━━━━━━━━━\n` +
                               `👤 Your ID: ${event.senderID}\n` +
                               `👑 Owner ID: ${config.ownerID}\n` +
                               `✅ You are Owner: ${isOwner ? 'YES' : 'NO'}\n` +
                               `✅ You are Admin: ${isAdmin ? 'YES' : 'NO'}\n` +
                               `⚙️ Bot Logged In: ${global.isLoggedIn ? 'YES' : 'NO'}\n` +
                               `📊 Commands Loaded: ${global.commands.size}\n` +
                               `⏱️ Uptime: ${Math.floor(process.uptime())} seconds\n` +
                               `━━━━━━━━━━━━━━━━━━━`;
                return api.sendMessage(debugMsg, event.threadID);
            }

            // Handle events (group joins, reactions, etc)
            if (global.events.has(event.type)) {
                try {
                    await global.events.get(event.type).execute({ api, event, config });
                } catch (e) {
                    console.error(`❌ Event handler failed [${event.type}]:`, e.message);
                }
            }

            // Handle commands
            if (event.body && event.body.startsWith(botPrefix)) {
                const args = event.body.slice(botPrefix.length).trim().split(/ +/);
                const cmdName = args.shift().toLowerCase();
                const cmd = global.commands.get(cmdName);
                if (!cmd) return; // No such command

                // Permission check (before execution)
                const senderID = String(event.senderID);
                const isOwner = senderID === String(config.ownerID);
                const isAdmin = config.admin.includes(senderID);
                if (cmd.admin && !isOwner && !isAdmin) {
                    console.log(`🚫 Permission denied for ${senderID} on command ${cmdName}`);
                    if (Math.random() > 0.7) { // 30% chance to respond
                        return api.sendMessage("🔒 This command is for admins only.", event.threadID);
                    }
                    return;
                }

                // Cooldown check
                const now = Date.now();
                const key = `${senderID}-${cmdName}`;
                const cooldownAmount = (cmd.cooldown || 3) * 1000;
                if (cooldowns.has(key)) {
                    const expiration = cooldowns.get(key) + cooldownAmount;
                    if (now < expiration) {
                        const remaining = Math.ceil((expiration - now) / 1000);
                        if (remaining > 2) { // Don't spam for short cooldowns
                            return api.sendMessage(
                                `⏳ Wait ${remaining} more seconds before using this command again.`,
                                event.threadID
                            );
                        }
                        return;
                    }
                }
                cooldowns.set(key, now);

                // Execute command
                try {
                    console.log(`✅ Executing command: ${cmdName} for user ${senderID}`);
                    // Auto-react to show processing
                    if (cmd.cooldown > 2 && event.messageID) {
                        api.setMessageReaction("🕗", event.messageID, () => {}, true);
                    }
                    await cmd.execute({ api, event, args, config });
                    // Success reaction
                    if (event.messageID) {
                        api.setMessageReaction("✅", event.messageID, () => {}, true);
                    }
                } catch (e) {
                    console.error(`❌ Command failed [${cmdName}]:`, e.message || e);
                    // Error reaction
                    if (event.messageID) {
                        api.setMessageReaction("❌", event.messageID, () => {}, true);
                    }
                    // User-friendly error message (only for owner)
                    if (isOwner) {
                        api.sendMessage(
                            `❌ Command error:\n${e.message || 'Unknown error'}`,
                            event.threadID
                        );
                    }
                }
            }
        });

        // Auto-restart on uncaught errors
        process.on('uncaughtException', (err) => {
            console.error('🔥 UNCAUGHT EXCEPTION:', err);
            api.sendMessage('⚠️ Bot crashed but is restarting...', config.ownerID);
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('🔥 UNHANDLED REJECTION:', reason);
        });

        console.log("\n🎉 BOT IS NOW FULLY OPERATIONAL!");
        console.log(`💬 Use ${botPrefix}help to see available commands`);
        console.log(`🌐 Web interface: http://localhost:${PORT}`);

        // Send startup notification to owner
        setTimeout(() => {
            api.sendMessage(
                `✅ Bot restarted successfully!\n` +
                `⏱️ Uptime: ${Math.floor(process.uptime())} seconds\n` +
                `📊 Commands: ${global.commands.size}\n` +
                `👥 Admins: ${config.admin.length}\n` +
                `🌐 Web: http://localhost:${PORT}`,
                config.ownerID
            );
        }, 5000);
    });
}

// Start everything
startBot();

// Auto-reload commands on change (development only)
if (process.env.NODE_ENV !== 'production') {
   
