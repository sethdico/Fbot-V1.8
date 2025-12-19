const fs = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');
const { createHash } = require('crypto');

// --- 🔧 LIBRARY LOADER WITH FLEXIBLE IMPORT ---
let login;
try {
    const loginModule = require('ws3-fca');
    if (loginModule && typeof loginModule.login === 'function') {
        login = loginModule.login;
    } else if (typeof loginModule === 'function') {
        login = loginModule;
    } else if (loginModule && typeof loginModule.default === 'function') {
        login = loginModule.default;
    } else {
        throw new Error("Could not find login function in ws3-fca module");
    }
    console.log("✅ ws3-fca library loaded successfully");
} catch (e) {
    console.error("❌ CRITICAL ERROR: Failed to load ws3-fca library");
    console.error("Details:", e.message || e);
    process.exit(1);
}

// --- GLOBAL STATE ---
global.isLoggedIn = false;
global.commands = new Map();
global.events = new Map();
global.config = {};
const cooldowns = new Map();
const threadRateLimit = new Map();
const spamTracking = new Map();
global.startTime = Date.now();

// --- CONFIGURATION LOADER WITH FALLBACKS ---
const loadConfig = () => {
    console.log("🔧 Loading configuration...");
    
    let config = {};
    const configPath = path.resolve(__dirname, 'config.json');
    
    // Try to load config.json first
    if (fs.existsSync(configPath)) {
        try {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            console.log("✅ Configuration loaded from config.json");
        } catch (e) {
            console.error("⚠️ config.json is invalid. Using default configuration.");
        }
    }
    
    // Set default values if missing
    config = {
        ownerID: config.ownerID || process.env.OWNER_ID || "123456789",
        admin: config.admin || [config.ownerID].filter(id => id),
        prefix: config.prefix || "/",
        botName: config.botName || "Fbot V1.8",
        chippApiKey: config.chippApiKey || process.env.CHIPP_API_KEY || "",
        autoRestart: config.autoRestart !== undefined ? config.autoRestart : true,
        safeMode: config.safeMode !== undefined ? config.safeMode : true,
        messageDelay: config.messageDelay || 2000
    };
    
    // Ensure proper types
    config.ownerID = String(config.ownerID);
    config.admin = Array.isArray(config.admin) 
        ? config.admin.map(id => String(id)) 
        : [config.ownerID];
    
    // Validate critical config
    if (config.ownerID === "123456789") {
        console.warn("⚠️ Default owner ID detected. Update your config.json with your real Facebook ID.");
    }
    
    global.config = config;
    console.log(`👑 Owner ID: ${config.ownerID}`);
    console.log(`🛡️ Safe Mode: ${config.safeMode ? "ON" : "OFF"}`);
    
    return config;
};

const config = loadConfig();

// --- 🛡️ ADVANCED QUEUE SYSTEM WITH RATE LIMITING ---
const msgQueue = [];
let queueProcessing = false;
const spamThreshold = 5;
const spamWindow = 30000; // 30 seconds

const isSpam = (threadID) => {
    const now = Date.now();
    const threadData = spamTracking.get(threadID) || [];
    const recent = threadData.filter(t => now - t < spamWindow);
    
    if (recent.length >= spamThreshold) {
        if (recent.length === spamThreshold) {
            console.log(`🛡️ Rate limiting spam in thread: ${threadID}`);
        }
        return true;
    }
    
    recent.push(now);
    spamTracking.set(threadID, recent.slice(-10)); // Keep only last 10
    return false;
};

const processQueue = async () => {
    if (queueProcessing || msgQueue.length === 0) return;
    
    queueProcessing = true;
    const task = msgQueue.shift();
    
    try {
        await task.execute();
    } catch (e) {
        console.error("⚠️ Queue Task Error:", e.message || e);
    } finally {
        setTimeout(() => {
            queueProcessing = false;
            processQueue();
        }, config.messageDelay || 2000);
    }
};

// --- ENHANCED API WRAPPER WITH ERROR HANDLING ---
const createSafeApi = (rawApi) => {
    const safeApi = {
        ...rawApi,
        
        // Enhanced sendMessage with queueing and validation
        sendMessage: (msg, threadID, arg3 = null, arg4 = null) => {
            return new Promise((resolve, reject) => {
                if (!threadID) {
                    return reject(new Error("Invalid threadID"));
                }
                
                // Standardize threadID to string
                threadID = String(threadID);
                
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
                
                // Queue the message
                msgQueue.push({
                    execute: async () => {
                        try {
                            // Anti-spam check
                            if (isSpam(threadID)) {
                                if (callback) callback(null, null);
                                resolve(null);
                                return;
                            }
                            
                            // Handle different message types
                            const messageData = typeof msg === 'string' ? { body: msg } : msg;
                            
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
            
            msgQueue.push({
                execute: () => {
                    try {
                        return rawApi.setMessageReaction(
                            emoji, 
                            String(messageID), 
                            callback, 
                            force
                        );
                    } catch (err) {
                        console.error("Reaction Error:", err.message);
                        if (callback) callback(err, null);
                    }
                }
            });
            
            processQueue();
        },
        
        // Get user info with error handling
        getUserInfoSafe: async (userID) => {
            try {
                const data = await rawApi.getUserInfo(String(userID));
                return data[String(userID)] || data;
            } catch (e) {
                console.error(`❌ Failed to get user info for ${userID}:`, e.message);
                return null;
            }
        },
        
        // Get thread info with error handling
        getThreadInfoSafe: async (threadID) => {
            try {
                return await rawApi.getThreadInfo(String(threadID));
            } catch (e) {
                console.error(`❌ Failed to get thread info for ${threadID}:`, e.message);
                return null;
            }
        },
        
        // Logout with cleanup
        logoutSafe: async () => {
            try {
                await rawApi.logout();
                console.log("✅ Successfully logged out from Facebook");
                global.isLoggedIn = false;
            } catch (e) {
                console.error("❌ Logout error:", e.message);
            }
        }
    };
    
    return safeApi;
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
        version: "1.8.1",
        isLoggedIn: global.isLoggedIn,
        queueLength: msgQueue.length,
        commandCount: global.commands.size,
        eventCount: global.events.size,
        uptime: process.uptime(),
        memory: process.memoryUsage().heapUsed / 1024 / 1024,
        ownerID: config.ownerID,
        prefix: config.prefix,
        safeMode: config.safeMode
    });
});

// --- GRACEFUL SHUTDOWN ---
const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    
    // Stop processing new messages
    queueProcessing = true;
    
    // Wait for queue to clear
    const queueWait = new Promise((resolve) => {
        const checkQueue = setInterval(() => {
            if (msgQueue.length === 0) {
                clearInterval(checkQueue);
                resolve();
            }
        }, 100);
        
        // Timeout after 10 seconds
        setTimeout(() => {
            clearInterval(checkCheck);
            resolve();
        }, 10000);
    });
    
    await queueWait;
    
    // Logout if logged in
    if (global.isLoggedIn && global.api && typeof global.api.logoutSafe === 'function') {
        await global.api.logoutSafe();
    }
    
    console.log('✅ Graceful shutdown complete');
    process.exit(0);
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
                cmd.usePrefix = cmd.usePrefix !== undefined ? cmd.usePrefix : true;
                
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

// --- 🤖 BOT STARTUP WITH ENHANCED ERROR HANDLING ---
const appStatePath = path.resolve(__dirname, 'appState.json');

const startBot = async () => {
    if (!fs.existsSync(appStatePath)) {
        console.error("❌ appState.json missing! Please place your Facebook cookies file in the root directory.");
        console.error("ℹ️ You can get this file using a browser extension like 'EditThisCookie' on Facebook.");
        console.log("🌐 Starting web server only (no Facebook login)");
        global.isLoggedIn = false;
        return;
    }
    
    let appState;
    try {
        appState = JSON.parse(fs.readFileSync(appStatePath, 'utf8'));
        if (!Array.isArray(appState) || appState.length === 0) {
            throw new Error("appState.json must be a non-empty array of cookie objects");
        }
        console.log(`✅ Loaded ${appState.length} cookies from appState.json`);
    } catch(e) {
        console.error("❌ appState.json is corrupt or invalid format.");
        console.error("ℹ️ appState.json should contain Facebook cookies in array format.");
        console.log("🌐 Starting web server only (no Facebook login)");
        global.isLoggedIn = false;
        return;
    }
    
    console.log("🤖 Attempting to login to Facebook...");
    
    try {
        const loginOptions = {
            appState: appState,
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            logLevel: "silent",
            forceLogin: true,
            listenEvents: true,
            selfListen: false
        };
        
        login(loginOptions, async (err, rawApi) => {
            if (err) {
                console.error("❌ LOGIN FAILED:", err);
                
                // Provide specific guidance based on error type
                if (err.error === "Invalid appstate" || err.message?.includes("userID")) {
                    console.error("\n🔥 CRITICAL AUTHENTICATION FAILURE");
                    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                    console.error("Common causes:");
                    console.error("1. Your Facebook cookies have EXPIRED (most common)");
                    console.error("2. Facebook blocked login from this IP/location");
                    console.error("3. Your account has login approvals enabled");
                    console.error("\n✅ SOLUTION STEPS:");
                    console.error("1. Get FRESH Facebook cookies using Cookie Editor extension");
                    console.error("2. Try logging in from the SAME DEVICE/LOCATION as your bot");
                    console.error("3. Temporarily disable 2FA on your Facebook account");
                    console.error("4. Wait 1 hour if you've tried logging in multiple times");
                    console.error("\n💡 TIP: Run this command to get help with cookies:");
                    console.error("node -e \"console.log('Visit: https://chrome.google.com/webstore/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm')\"");
                    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
                }
                
                // Start web server anyway
                console.log("🌐 Starting web server in diagnostic mode only");
                global.isLoggedIn = false;
                return;
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
                userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
            });
            
            console.log("✅ Bot logged in successfully");
            console.log(`👤 Logged in as: ${api.getCurrentUserID()}`);
            
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
            
            // Memory cleanup interval
            setInterval(() => {
                const now = Date.now();
                
                // Clear old cooldowns
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
                
                // Clear old spam tracking
                spamTracking.forEach((timestamps, threadID) => {
                    const recent = timestamps.filter(t => now - t < spamWindow);
                    if (recent.length === 0) {
                        spamTracking.delete(threadID);
                    } else {
                        spamTracking.set(threadID, recent);
                    }
                });
                
                // Memory usage warning
                const memory = process.memoryUsage().heapUsed / 1024 / 1024;
                if (memory > 200) {
                    console.warn(`⚠️ High memory usage: ${memory.toFixed(2)} MB`);
                }
            }, 60000);
            
            // Listen for messages
            api.listenMqtt(async (err, event) => {
                if (err) {
                    console.error("👂 Listener Error:", err);
                    if (err.message?.includes("Rate limit")) {
                        console.error("⚠️ Facebook rate limit hit. Waiting 1 minute before resuming...");
                        setTimeout(() => {
                            console.log("✅ Resuming message listening after rate limit cooldown");
                        }, 60000);
                    }
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
                        } catch (e) {
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
                            }
                            return;
                        }
                        
                        recent.push(now);
                        threadRateLimit.set(event.threadID, recent.slice(-10));
                        
                        // Command Handling
                        if (event.body.startsWith(config.prefix)) {
                            const args = event.body.slice(config.prefix.length).trim().split(/ +/);
                            const cmdName = args.shift().toLowerCase();
                            const cmd = global.commands.get(cmdName);
                            
                            if (cmd) {
                                // Check permissions
                                const isOwner = event.senderID === config.ownerID;
                                const isAdmin = config.admin.includes(event.senderID);
                                
                                if (cmd.admin && !isOwner && !isAdmin) {
                                    console.log(`🔒 Permission denied: ${event.senderID} tried to use admin command ${cmd.name}`);
                                    if (event.messageID) {
                                        api.setMessageReaction("🔒", event.messageID, () => {}, true);
                                    }
                                    return;
                                }
                                
                                // Check cooldown
                                const cdKey = `${event.senderID}_${cmdName}`;
                                const now = Date.now();
                                
                                if (cooldowns.has(cdKey)) {
                                    const expiration = cooldowns.get(cdKey);
                                    if (now < expiration) {
                                        const remaining = Math.ceil((expiration - now) / 1000);
                                        if (event.messageID) {
                                            api.setMessageReaction("⏳", event.messageID, () => {}, true);
                                        }
                                        return;
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
                                } catch (e) {
                                    console.error(`❌ CMD Error [${cmd.name}]:`, e.message || e);
                                    
                                    // Send error reaction
                                    if (event.messageID) {
                                        api.setMessageReaction("❌", event.messageID, () => {}, true);
                                    }
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
        });
    } catch (e) {
        console.error("❌ Bot startup failed:", e.message);
        console.log("🌐 Starting web server in diagnostic mode only");
        global.isLoggedIn = false;
    }
};

// Start server
const server = app.listen(PORT, () => {
    console.log(`🌐 Web interface: http://localhost:${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log(`🌐 API status: http://localhost:${PORT}/api/status`);
});

// Start the bot
console.log("🚀 Starting Fbot V1.8.1...");
loadFiles();
startBot();

// --- CRASH PREVENTION ---
process.on('uncaughtException', (err) => {
    console.error("🔥 Uncaught Exception:", err.message || err);
    console.error("Stack:", err.stack || 'No stack trace');
    
    // Don't exit immediately - give time for logs to write
    setTimeout(() => {
        process.exit(1);
    }, 5000);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error("🔥 Unhandled Rejection at:", promise);
    console.error("Reason:", reason.message || reason);
    
    // Don't exit immediately
    setTimeout(() => {
        process.exit(1);
    }, 5000);
});

// --- FINAL CHECKS ---
process.on('exit', (code) => {
    console.log(`🔚 Process exiting with code ${code}`);
});
