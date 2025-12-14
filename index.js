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

// --- 🛡️ SAFETY & ANTI-BAN FUNCTIONS 🛡️ ---

// 1. Simulate Human Typing
function simulateTyping(api, threadID, duration = 3000) {
  api.sendTypingIndicator(threadID, (err) => {
    if (err) return;
    setTimeout(() => {
        // Just stops the visual indicator after duration
        api.sendTypingIndicator(threadID, () => {}); 
    }, duration);
  });
}

// 2. Random Delay (1s to 3s)
const randomDelay = () => new Promise(r => setTimeout(r, Math.floor(Math.random() * 2000) + 1000));

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
  const last = cooldowns.get(key) || 0;
  const gap = (cooldownTime || 2) * 1000;
  
  if (now - last < gap) return { ok: false, wait: gap - (now - last) };
  
  cooldowns.set(key, now);
  return { ok: true };
}

const startBot = async () => {
  login({ appState }, (err, api) => {
    if (err) {
      console.error('❌ Login Failed:', err);
      return;
    }

    // Recommended Anti-Ban Options
    api.setOptions({
      forceLogin: true,
      listenEvents: true,
      logLevel: "silent",
      selfListen: false,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    });

    console.log('🤖 Bot is online & Secure!');

    // Initialize Scheduler
    if (config.ownerID) scheduleTasks(config.ownerID, api, config);

    api.listenMqtt(async (listenErr, event) => {
      if (listenErr) return;

      // Handle Events
      if (global.events.has(event.type)) {
        try { await global.events.get(event.type).execute({ api, event }); } catch (e) {}
      }

      // Handle Commands
      if (event.body && event.body.startsWith(botPrefix)) {
        const args = event.body.slice(botPrefix.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        const cmd = global.commands.get(cmdName);

        if (cmd) {
          // Cooldown Check
          const cooldownCheck = userCooldownCheck(event.senderID, cmd.name, cmd.cooldown);
          if (!cooldownCheck.ok) {
            return api.sendMessage(`⏳ Please wait ${Math.ceil(cooldownCheck.wait / 1000)}s.`, event.threadID);
          }

          try {
            // 🛡️ HUMANIZATION: Show typing + wait slightly
            simulateTyping(api, event.threadID); 
            await randomDelay(); 

            await cmd.execute({ api, event, args });
          } catch (e) {
            console.error(`Error executing ${cmdName}:`, e);
            api.sendMessage("❌ Error executing command.", event.threadID);
          }
        }
      }
    });
  });
};

startBot();
