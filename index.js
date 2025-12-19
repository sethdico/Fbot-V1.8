const fs = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables FIRST
dotenv.config();

// --- 🔧 ROBUST LIBRARY LOADER ---
let login;
try {
    const loginModule = require('ws3-fca');
    // Handle different export styles of the library
    if (loginModule && typeof loginModule.login === 'function') {
        login = loginModule.login;
    } else if (typeof loginModule === 'function') {
        login = loginModule;
    } else if (loginModule && typeof loginModule.default === 'function') {
        login = loginModule.default;
    } else {
        throw new Error("Could not find login function in ws3-fca module.");
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
global.config = {};
const cooldowns = new Map();
const threadRateLimit = new Map();
const commandUsage = new Map();

// --- CONFIGURATION LOADER ---
const loadConfig = () => {
    console.log("🔧 Loading configuration...");
    
    // Load from .env first
    const envConfig = {
        ownerID: process.env.OWNER_ID || '',
        chippApiKey: process.env.CHIPP_API_KEY || '',
        autoRestart: process.env.AUTO_RESTART === 'true',
        messageDelay: parseInt(process.env.MESSAGE_DELAY) || 2000,
        safeMode: process.env.SAFE_MODE === 'true',
        prefix: process.env.PREFIX || '/',
        botName: process.env.BOT_NAME || 'Fbot V1.8'
    };

    // Load from config.json if exists
    const configPath = path.resolve(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
        try {
            const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            // Merge configs, prioritizing env vars
            Object.assign(envConfig, fileConfig);
        } catch (e) {
            console.error("⚠️ config.json is invalid. Using environment variables only.");
        }
    }

    // Validate critical config
    if (!envConfig.ownerID) {
        console.error("❌ FATAL ERROR: OWNER_ID is not set in .env or config.json!");
        process.exit(1);
    }

    // Ensure proper types
    envConfig.ownerID = String(envConfig.ownerID);
    envConfig.admin = Array.isArray(envConfig.admin) 
        ? envConfig.admin.map(id => String(id)) 
        : [envConfig.ownerID];
    
    global.config = envConfig;
    console.log(`👑 Owner ID: ${envConfig.ownerID}`);
    console.log(`🛡️ Safe Mode: ${envConfig.safeMode ? "ON" : "OFF"}`);
    console.log(`⏱️ Message Delay: ${envConfig.messageDelay}ms`);
    return envConfig;
};

const config = loadConfig();

// --- 🛡️ QUEUE SYSTEM WITH RATE LIMITING ---
const msgQueue = [];
let queueProcessing = false;

// Anti-spam tracking
const spamTracking = new Map();
const spamThreshold = 5; // messages
const spamWindow = 30000; // 30 seconds

const isSpam = (threadID) => {
    const now = Date.now();
    const threadData = spamTracking.get(threadID) || [];
    const recent = threadData.filter(t => now - t < spamWindow);
    
    if (recent.length >= spamThreshold) {
        return true;
    }
    
    recent.push(now);
    spamTracking.set(threadID, recent);
    return false;
};

const processQueue = async () => {
    if (queueProcessing || msgQueue.length === 0) return;
    queueProcessing = true;
    
    const task = msgQueue.shift();
    try {
        await task.execute();
    } catch (e) {
        console.error("⚠️ Queue Task Error:", e.message);
    }
    
    // Wait delay before processing next message
    setTimeout(() => {
        queueProcessing = false;
        processQueue();
    }, config.messageDelay || 2000);
};

// --- ENHANCED API WRAPPER ---
const createSafeApi = (rawApi) => {
    return {
        ...rawApi,
        
        // Enhanced sendMessage with queueing and validation
        sendMessage: (msg, threadID, arg3 = null, arg4 = null) => {
            return new Promise((resolve, reject) => {
                // Validate threadID
                if (!threadID || typeof threadID !== 'string') {
                    return reject(new Error("Invalid threadID"));
                }
                
                let callback = null;
                let replyID = null;
                
                // Handle different argument patterns
                if (typeof arg3 === 'function') {
                    callback = arg3;
                    replyID = arg4;
                } else if (typeof arg3 === 'string' || typeof arg3 === 'number') {
                    replyID = String(arg3);
                    callback = typeof arg4 === 'function' ? arg4 : null;
                }
                
                // Add to queue
                msgQueue.push({
                    execute: async () => {
                        try {
                            // Check for spam before sending
                            if (isSpam(threadID)) {
                                console.log(`🛡️ Blocked spam message to thread: ${threadID}`);
                                if (callback) callback(null, null);
                                resolve(null);
                                return;
                            }
                            
                            // Handle different message types
                            let messageData = msg;
                            if (typeof msg === 'string') {
                                messageData = { body: msg };
                            }
                            
                            // Execute the raw API call
                            const result = await rawApi.sendMessage(
                                messageData, 
                                threadID, 
                                replyID || null
                            );
                            
                            if (callback) callback(null, result);
                            resolve(result);
                        } catch (err) {
                            console.error("❌ SendMessage Error:", err.message || err);
                            if (callback) callback(err, null);
                            reject(err);
                        }
                    }
                });
                
                processQueue();
            });
        },
        
        // Enhanced reaction handling
        setMessageReaction: (emoji, messageID, callback = null, force = false) => {
            if (!messageID) return;
            
            // Add to queue with lower priority
            msgQueue.push({
                execute: () => rawApi.setMessageReaction(
                    emoji, 
                    String(messageID), 
                    callback, 
                    force
                )
            });
            
            processQueue();
        },
        
        // Stream helper with queueing
        sendMessageStream: async (text, stream, threadID) => {
            if (!threadID || !stream) return;
            
            msgQueue.push({
                execute: () => rawApi.sendMessage(
                    { body: text, attachment: stream }, 
                    String(threadID)
                )
            });
            
            processQueue();
        },
        
        // Get user info with caching
        getUserInfoSafe: async (userID) => {
            try {
                const data = await rawApi.getUserInfo(String(userID));
                return data[String(userID)] || data;
            } catch (e) {
                console.error(`❌ Failed to get user info for ${userID}:`, e.message);
                return null;
            }
        }
    };
};

// --- 🌐 ENHANCED WEB SERVER ---
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(express.static(path.join(__dirname)));

// Health check endpoint
app.get('/health', (req, res) => {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    res.json({
        status: "healthy",
        uptime: `${hours}h ${minutes}m ${seconds}s`,
        memory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
        version: "1.8.1",
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/api/status', (req, res) => {
    res.json({
        status: "Running",
        isLoggedIn: global.isLoggedIn,
        queueLength: msgQueue.length,
        commandCount: global.commands.size,
        eventCount: global.events.size,
        uptime: process.uptime(),
        memory: process.memoryUsage().heapUsed / 1024 / 1024
    });
});

// AI command endpoint for web interface
app.post('/api/ai', async (req, res) => {
    if (!global.isLoggedIn) {
        return res.status(401).json({ error: "Bot is not logged in" });
    }

    const { command, query } = req.body;
    if (!command || !query) {
        return res.status(400).json({ error: "Missing command or query" });
    }

    try {
        const cmd = global.commands.get(command.toLowerCase());
        if (!cmd) {
            return res.status(404).json({ error: `Command "${command}" not found` });
        }

        // Simulate event for web interface
        const mockEvent = {
            threadID: config.ownerID,
            messageID: Date.now().toString(),
            senderID: config.ownerID,
            isGroup: false,
            body: `/${command} ${query}`
        };

        // Execute command
        let result = "";
        const mockApi = {
            sendMessage: (msg, threadID, callback) => {
                if (typeof msg === 'object' && msg.body) {
                    result = msg.body;
                } else {
                    result = msg;
                }
                if (callback) callback(null, { messageID: Date.now().toString() });
                return Promise.resolve({ messageID: Date.now().toString() });
            },
            setMessageReaction: () => {},
            getUserInfoSafe: () => ({ name: "Web User" })
        };

        await cmd.execute({
            api: mockApi,
            event: mockEvent,
            args: query.split(' '),
            config: global.config
        });

        res.json({
            reply: result,
            reaction: "✅"
        });
    } catch (error) {
        console.error("Web AI Error:", error);
        res.status(500).json({
            error: error.message || "AI command failed",
            reaction: "❌"
        });
    }
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🌐 Web interface: http://localhost:${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});

// --- GRACEFUL SHUTDOWN ---
const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    
    // Stop accepting new connections
    server.close(() => {
        console.log('HTTP server closed');
        
        // Save any critical state if needed
        if (global.api && typeof global.api.logout === 'function') {
            global.api.logout(() => {
                console.log('Facebook session logged out');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    });
    
    // Force shutdown after 5 seconds
    setTimeout(() => {
        console.log('Forcing shutdown after timeout');
        process.exit(1);
    }, 5000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGQUIT', () => shutdown('SIGQUIT'));

// --- ENHANCED FILE LOADER ---
const loadFiles = () => {
    console.log("\n📦 Loading system files...");
    
    // Clear old commands/events
    global.commands.clear();
    global.events.clear();
    
    const eventsDir = path.resolve(__dirname, 'events');
    const cmdsDir = path.resolve(__dirname, 'cmds');
    
    // Load Events
    if (fs.existsSync(eventsDir)) {
        const eventFiles = fs.readdirSync(eventsDir).filter(file => 
            file.endsWith('.js') && !file.startsWith('_')
        );
        
        console.log(`🔍 Found ${eventFiles.length} event files`);
        eventFiles.forEach(file => {
            const filePath = path.join(eventsDir, file);
            try {
                delete require.cache[require.resolve(filePath)];
                const event = require(filePath);
                if (event.name) {
                    global.events.set(event.name, event);
                    console.log(`✅ Loaded event: ${event.name}`);
                } else {
                    console.warn(`⚠️ Event file missing name: ${file}`);
                }
            } catch (e) { 
                console.error(`❌ Event Load Error (${file}):`, e.message || e);
            }
        });
    }
    
    // Load Commands
    if (fs.existsSync(cmdsDir)) {
        const cmdFiles = fs.readdirSync(cmdsDir).filter(file => 
            file.endsWith('.js') && !file.startsWith('_')
        );
        
        console.log(`🔍 Found ${cmdFiles.length} command files`);
        cmdFiles.forEach(file => {
            const filePath = path.join(cmdsDir, file);
            try {
                delete require.cache[require.resolve(filePath)];
                const cmd = require(filePath);
                
                // Validate command structure
                if (!cmd.name) {
                    console.warn(`⚠️ Command file missing name: ${file}`);
                    return;
                }
                
                // Set default properties
                cmd.cooldown = cmd.cooldown || 3;
                cmd.aliases = cmd.aliases || [];
                cmd.admin = cmd.admin || false;
                
                // Register command
                global.commands.set(cmd.name.toLowerCase(), cmd);
                cmd.aliases.forEach(alias => {
                    if (alias) global.commands.set(alias.toLowerCase(), cmd);
                });
                
                console.log(`✅ Loaded command: ${cmd.name} (${cmd.aliases.length} aliases)`);
            } catch (e) { 
                console.error(`❌ Command Load Error (${file}):`, e.message || e);
            }
        });
    }
    
    console.log(`✅ System loaded: ${global.commands.size} commands & ${global.events.size} events`);
};

// --- 🤖 BOT STARTUP WITH ERROR HANDLING ---
const appStatePath = path.resolve(__dirname, 'appState.json');

const startBot = async () => {
    if (!fs.existsSync(appStatePath)) {
        console.error("❌ appState.json missing! Please place your Facebook cookies file in the root directory.");
        console.error("ℹ️ You can get this file using a browser extension like 'EditThisCookie' on Facebook.");
        return;
    }
    
    let appState;
    try {
        appState = JSON.parse(fs.readFileSync(appStatePath, 'utf8'));
        if (!Array.isArray(appState)) {
            throw new Error("appState.json must be an array of cookie objects");
        }
    } catch(e) {
        console.error("❌ appState.json is corrupt or invalid format.");
        console.error("ℹ️ appState.json should contain Facebook cookies in array format.");
        return;
    }
    
    console.log("🤖 Starting bot login...");
    
    try {
        login({ appState }, async (err, rawApi) => {
            if (err) {
                console.error("❌ LOGIN FAILED:", err);
                if (err.error === "Invalid appstate") {
                    console.error("ℹ️ Your appState.json has expired. Please get fresh Facebook cookies.");
                }
                return process.exit(1);
            }
            
            global.isLoggedIn = true;
            
            // Wrap API for Safety & Features
            const api = createSafeApi(rawApi);
            global.api = api;
            
            // Set API options
            api.setOptions({
                forceLogin: true,
                listenEvents: true,
                logLevel: "silent",
                selfListen: false,
                userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            });
            
            console.log("✅ Bot logged in successfully");
            
            // Start Scheduler if enabled
            if (config.autoRestart) {
                try {
                    const schedulerPath = path.resolve(__dirname, 'custom.js');
                    if (fs.existsSync(schedulerPath)) {
                        const scheduleTasks = require(schedulerPath);
                        scheduleTasks(config.ownerID, api, config);
                        console.log("✅ Auto-restart scheduler initialized");
                    }
                } catch(e) {
                    console.error("⚠️ Scheduler initialization failed:", e.message);
                }
            }
            
            // Initialize Events
            global.events.forEach(event => {
                if (event.onStart) {
                    try {
                        event.onStart(api);
                        console.log(`✅ Event started: ${event.name}`);
                    } catch (e) {
                        console.error(`❌ Event start error (${event.name}):`, e.message);
                    }
                }
            });
            
            console.log(`✅ BOT STARTED | SAFE MODE: ${config.safeMode ? "ACTIVE" : "OFF"}`);
            console.log(`📚 Available commands: ${Array.from(global.commands.keys()).join(', ')}`);
            
            // Listen for messages with enhanced error handling
            api.listenMqtt(async (err, event) => {
                if (err) {
                    console.error("👂 Listener Error:", err);
                    return;
                }
                
                // Standardize IDs to strings
                if (event.messageID) event.messageID = String(event.messageID);
                if (event.threadID) event.threadID = String(event.threadID);
                if (event.senderID) event.senderID = String(event.senderID);
                
                try {
                    // Handle Global Events (like Welcome)
                    if (global.events.has(event.type)) {
                        try { 
                            await global.events.get(event.type).execute({ api, event, config }); 
                        } catch(e) {
                            console.error(`❌ Event execution error (${event.type}):`, e.message);
                        }
                    }
                    
                    // Process message content
                    if (event.body) {
                        // Anti-Raid: Ignore spamming groups
                        const now = Date.now();
                        const threadData = threadRateLimit.get(event.threadID) || [];
                        const recent = threadData.filter(t => now - t < 10000); 
                        
                        if (recent.length > 8) {
                            if (recent.length === 9) {
                                console.log(`🛡️ Rate limiting spam in thread: ${event.threadID}`);
                                
                                // Log the spam attempt
                                const spamLog = `[${new Date().toISOString()}] SPAM DETECTED in thread ${event.threadID} from user ${event.senderID}
Message: ${event.body.substring(0, 100)}${event.body.length > 100 ? '...' : ''}
Count: ${recent.length + 1} messages in 10s\n`;
                                
                                fs.appendFile(path.join(__dirname, 'spam_log.txt'), spamLog, () => {});
                            }
                            return; 
                        }
                        
                        recent.push(now);
                        threadRateLimit.set(event.threadID, recent.slice(-10)); // Keep only last 10
                        
                        // Command Handling
                        if (event.body.startsWith(config.prefix)) {
                            const args = event.body.slice(config.prefix.length).trim().split(/ +/);
                            const cmdName = args.shift().toLowerCase();
                            const cmd = global.commands.get(cmdName);
                            
                            if (cmd) {
                                // Track command usage
                                const usageKey = `${event.threadID}:${cmd.name}`;
                                commandUsage.set(usageKey, (commandUsage.get(usageKey) || 0) + 1);
                                
                                // Check permissions
                                const isOwner = event.senderID === config.ownerID;
                                const isAdmin = config.admin.includes(event.senderID);
                                
                                if (cmd.admin && !isOwner && !isAdmin) {
                                    console.log(`🔒 Permission denied: ${event.senderID} tried to use admin command ${cmd.name}`);
                                    return api.setMessageReaction("🔒", event.messageID, () => {}, true);
                                }
                                
                                // Check cooldown
                                const cdKey = `${event.senderID}_${cmdName}`;
                                const now = Date.now();
                                
                                if (cooldowns.has(cdKey)) {
                                    const expiration = cooldowns.get(cdKey);
                                    if (now < expiration) {
                                        const remaining = Math.ceil((expiration - now) / 1000);
                                        console.log(`⏳ Cooldown active: ${event.senderID} for ${cmd.name} (${remaining}s remaining)`);
                                        return api.setMessageReaction("⏳", event.messageID, () => {}, true);
                                    }
                                }
                                
                                // Set new cooldown
                                cooldowns.set(cdKey, now + (cmd.cooldown || 3) * 1000);
                                
                                // Execute command
                                try {
                                    // Show typing indicator
                                    if (typeof api.sendTypingIndicator === 'function') {
                                        api.sendTypingIndicator(true, event.threadID);
                                    }
                                    
                                    console.log(`🔧 Executing command: ${cmd.name} by ${event.senderID} in ${event.threadID}`);
                                    
                                    await cmd.execute({ api, event, args, config });
                                    
                                    // Reaction on success
                                    if (event.messageID) {
                                        api.setMessageReaction("✅", event.messageID, () => {}, true);
                                    }
                                    
                                    // Log successful command
                                    const successLog = `[${new Date().toISOString()}] COMMAND: ${cmd.name} by ${event.senderID} in ${event.threadID}
Args: ${args.join(' ') || '(none)'}
Result: SUCCESS\n`;
                                    
                                    fs.appendFile(path.join(__dirname, 'command_log.txt'), successLog, () => {});
                                    
                                } catch (e) {
                                    console.error(`❌ CMD Error [${cmdName}]:`, e.message || e);
                                    
                                    // Send error reaction
                                    if (event.messageID) {
                                        api.setMessageReaction("❌", event.messageID, () => {}, true);
                                    }
                                    
                                    // Send error message in development mode
                                    if (process.env.NODE_ENV !== 'production' && event.senderID === config.ownerID) {
                                        api.sendMessage(`❌ Command Error: ${e.message || 'Unknown error'}`, event.threadID);
                                    }
                                    
                                    // Log failed command
                                    const errorLog = `[${new Date().toISOString()}] COMMAND ERROR: ${cmd.name} by ${event.senderID} in ${event.threadID}
Args: ${args.join(' ') || '(none)'}
Error: ${e.message || 'Unknown error'}
Stack: ${e.stack || 'No stack trace'}\n`;
                                    
                                    fs.appendFile(path.join(__dirname, 'error_log.txt'), errorLog, () => {});
                                } finally {
                                    // Always turn off typing indicator
                                    if (typeof api.sendTypingIndicator === 'function') {
                                        api.sendTypingIndicator(false, event.threadID);
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error("❌ Event processing error:", e.message);
                }
            });
            
            // Memory cleanup interval
            setInterval(() => {
                // Clear old cooldowns
                const now = Date.now();
                cooldowns.forEach((expire, key) => {
                    if (now > expire) cooldowns.delete(key);
                });
                
                // Clear old thread rate limits
                threadRateLimit.forEach((timestamps, threadID) => {
                    const recent = timestamps.filter(t => now - t < 10000);
                    if (recent.length === 0) {
                        threadRateLimit.delete(threadID);
                    } else {
                        threadRateLimit.set(threadID, recent);
                    }
                });
                
                // Clear spam tracking
                spamTracking.forEach((timestamps, threadID) => {
                    const recent = timestamps.filter(t => now - t < spamWindow);
                    if (recent.length === 0) {
                        spamTracking.delete(threadID);
                    } else {
                        spamTracking.set(threadID, recent);
                    }
                });
                
                // Log memory usage
                const memory = process.memoryUsage().heapUsed / 1024 / 1024;
                if (memory > 200) { // 200MB threshold
                    console.warn(`⚠️ High memory usage: ${memory.toFixed(2)} MB`);
                }
            }, 60000); // Run every minute
            
        });
    } catch (e) {
        console.error("❌ Bot startup failed:", e.message);
        process.exit(1);
    }
};

// Start the bot
console.log("🚀 Starting Fbot V1.8.1...");
loadFiles();
startBot();

// --- CRASH PREVENTION ---
process.on('uncaughtException', (err) => {
    console.error("🔥 Uncaught Exception:", err.message || err);
    console.error("Stack:", err.stack);
    
    // Try to log to file
    const crashLog = `[${new Date().toISOString()}] UNCAUGHT EXCEPTION
Message: ${err.message || 'Unknown error'}
Stack: ${err.stack || 'No stack trace'}
Memory: ${process.memoryUsage().heapUsed / 1024 / 1024} MB\n`;
    
    fs.appendFile(path.join(__dirname, 'crash_log.txt'), crashLog, () => {});
    
    // Don't exit immediately - give time for logs to write
    setTimeout(() => {
        process.exit(1);
    }, 5000);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error("🔥 Unhandled Rejection at:", promise);
    console.error("Reason:", reason.message || reason);
    
    // Try to log to file
    const rejectionLog = `[${new Date().toISOString()}] UNHANDLED REJECTION
Reason: ${reason.message || 'Unknown reason'}
Promise: ${JSON.stringify(promise, null, 2) || 'Unknown promise'}\n`;
    
    fs.appendFile(path.join(__dirname, 'rejection_log.txt'), rejectionLog, () => {});
});
