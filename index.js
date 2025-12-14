// ================================================
// FILE: index.js
// ================================================
const fs = require('fs');
const path = require('path');
const express = require('express');
const login = require('ws3-fca');
const scheduleTasks = require('./custom');

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Helper: Load JSON safely
function loadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`❌ Error loading ${filePath}:`, err);
    return {};
  }
}

const config = loadJson(path.resolve(__dirname, 'config.json'));
const appState = loadJson(path.resolve(__dirname, 'appState.json'));

const botPrefix = String(config.prefix || '/').trim();
const cooldowns = new Map();

global.events = new Map();
global.commands = new Map();

// --- 🛡️ HUMANIZATION & ANTI-BAN LOGIC 🛡️ ---

// 1. Random Integer Helper
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// 2. Sleep Helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 3. Human Delay Calculation
// Simulates reading speed + thinking speed based on input length
const getHumanDelay = (textLength) => {
    const readingSpeed = rnd(50, 100); // ms per character
    const thinkingTime = rnd(1000, 3000); // Base thinking time
    return (textLength * readingSpeed) + thinkingTime;
};

// ------------------------------------------

function loadFiles() {
  const eventsDir = path.resolve(__dirname, 'events');
  const cmdsDir = path.resolve(__dirname, 'cmds');

  if (fs.existsSync(eventsDir)) {
    fs.readdirSync(eventsDir).forEach(file => {
      if (file.endsWith('.js')) {
        const event = require(path.join(eventsDir, file));
        if (event.name) global.events.set(event.name, event);
      }
    });
  }

  if (fs.existsSync(cmdsDir)) {
    fs.readdirSync(cmdsDir).forEach(file => {
      if (file.endsWith('.js')) {
        const cmd = require(path.join(cmdsDir, file));
        if (cmd.name) {
          global.commands.set(cmd.name, cmd);
          if (cmd.aliases) cmd.aliases.forEach(a => global.commands.set(a, cmd));
        }
      }
    });
  }
}

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`🌐 Server running on Port ${PORT}`));

loadFiles();

function userCooldownCheck(userId, cmdName, cooldownTime) {
  const key = `${userId}-${cmdName}`;
  const now = Date.now();
  const gap = (cooldownTime || 5) * 1000; // Increased default cooldown for safety
  const last = cooldowns.get(key) || 0;
  
  if (now - last < gap) return { ok: false, wait: gap - (now - last) };
  
  cooldowns.set(key, now);
  return { ok: true };
}

const getUserName = (api, uid) => {
    return new Promise((resolve) => {
        api.getUserInfo(uid, (err, ret) => {
            if (err) return resolve("Unknown");
            if (ret[uid]) return resolve(ret[uid].name);
            return resolve("Unknown");
        });
    });
};

const startBot = async () => {
  login({ appState }, (err, api) => {
    if (err) {
      console.error('❌ Login Failed:', err);
      return;
    }

    // 🛡️ SECURITY: Use modern User Agent and suppress logs
    api.setOptions({
      forceLogin: true,
      listenEvents: true,
      logLevel: "silent",
      selfListen: false,
      updatePresence: true, // Appears 'Active' like a human
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    });

    console.log('🤖 Bot is online & Humanized!');
    if (config.ownerID) scheduleTasks(config.ownerID, api, config);

    api.listenMqtt(async (listenErr, event) => {
      if (listenErr) return;

      // Handle Events
      if (global.events.has(event.type)) {
        try { await global.events.get(event.type).execute({ api, event }); } catch (e) {}
      }

      if (event.body && event.body.startsWith(botPrefix)) {
        const args = event.body.slice(botPrefix.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        const cmd = global.commands.get(cmdName);

        if (cmd) {
          // Admin Check
          if (cmd.admin) {
              const senderID = event.senderID;
              const isIdAdmin = config.admin.includes(senderID) || config.ownerID === senderID;
              if (!isIdAdmin) {
                  return api.sendMessage("❌ Restricted command.", event.threadID);
              }
          }

          // Cooldown Check
          const cooldownCheck = userCooldownCheck(event.senderID, cmd.name, cmd.cooldown);
          if (!cooldownCheck.ok) {
            // Don't reply to cooldowns instantly every time (spammy)
            if (Math.random() > 0.5) {
                return api.sendMessage(`⏳ Chill... wait ${Math.ceil(cooldownCheck.wait / 1000)}s.`, event.threadID);
            }
            return; 
          }

          // 🛡️ HUMAN BEHAVIOR SIMULATION 🛡️
          try {
            // 1. Calculate realistic delay based on input length
            const humanDelay = getHumanDelay(event.body.length);
            
            // 2. Wait (Simulate reading)
            await sleep(humanDelay);

            // 3. Mark as Read (Crucial for human appearance)
            api.markAsRead(event.threadID);

            // 4. Send Typing Indicator (Simulate typing response)
            // Typing duration is random but related to estimated processing time
            const typingDuration = rnd(2000, 5000); 
            api.sendTypingIndicator(event.threadID, (err) => {
                if(err) return;
                // Stop typing indicator happens automatically when message sends, 
                // but we add a small delay before sending execution
            });

            await sleep(typingDuration);

            // 5. Execute Command
            await cmd.execute({ api, event, args });

          } catch (e) {
            console.error(`Error executing ${cmdName}:`, e);
            // Don't error message instantly
            await sleep(2000);
            api.sendMessage("❌ I tripped over a wire.", event.threadID);
          }
        }
      }
    });
  });
};

startBot();
