// Improved index.js
// - clearer structure, safer loads, consistent error handling
// - preserves original behavior: serves static site, loads events & cmds, logs in with ws3-fca, listens to mqtt events,
//   detects URLs, runs commands and uses cooldown map.
//
// Before replacing: create a branch or backup the current file.

const fs = require('fs');
const path = require('path');
const express = require('express');
const login = require('ws3-fca');
const scheduleTasks = require('./custom');

const app = express();
const DEFAULT_PORT = 3000;
const PORT = Number(process.env.PORT || DEFAULT_PORT);

// small helper to read JSON config safely
function loadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Missing ${filePath}!`);
      process.exit(1);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`❌ Error loading ${filePath}:`, err);
    process.exit(1);
  }
}

const config = loadJson(path.resolve(__dirname, 'config.json'));
const appState = loadJson(path.resolve(__dirname, 'appState.json'));

const botPrefix = String(config.prefix || '/').trim();
const cooldowns = new Map();

global.events = new Map();
global.commands = new Map();

// Load event handler files from ./events
function loadEvents() {
  const eventsDir = path.resolve(__dirname, 'events');
  if (!fs.existsSync(eventsDir)) {
    console.log('ℹ️ No events folder found, skipping events load.');
    return;
  }
  try {
    const files = fs.readdirSync(eventsDir).filter(f => f.endsWith('.js'));
    for (const file of files) {
      try {
        const event = require(path.join(eventsDir, file));
        if (event && event.name && typeof event.execute === 'function') {
          global.events.set(event.name, event);
          console.log(`✅ Loaded event: ${event.name}`);
        } else {
          console.warn(`⚠️ Skipped invalid event file: ${file}`);
        }
      } catch (err) {
        console.error(`❌ Error loading event file ${file}:`, err);
      }
    }
  } catch (err) {
    console.error('❌ Error reading events directory:', err);
  }
}

// Load command files from ./cmds
function loadCommands() {
  const cmdsDir = path.resolve(__dirname, 'cmds');
  if (!fs.existsSync(cmdsDir)) {
    console.log('ℹ️ No cmds folder found, skipping commands load.');
    return;
  }
  try {
    const files = fs.readdirSync(cmdsDir).filter(f => f.endsWith('.js'));
    for (const file of files) {
      try {
        const cmd = require(path.join(cmdsDir, file));
        if (cmd && cmd.name && typeof cmd.execute === 'function') {
          global.commands.set(cmd.name, cmd);
          console.log(`✅ Loaded command: ${cmd.name}`);
          // also register aliases if present
          if (Array.isArray(cmd.aliases)) {
            for (const a of cmd.aliases) {
              if (!global.commands.has(a)) global.commands.set(a, cmd);
            }
          }
        } else {
          console.warn(`⚠️ Skipped invalid command file: ${file}`);
        }
      } catch (err) {
        console.error(`❌ Error loading command file ${file}:`, err);
      }
    }
  } catch (err) {
    console.error('❌ Error reading cmds directory:', err);
  }
}

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🌐 Web Server running at http://localhost:${PORT}`);
});

loadEvents();
loadCommands();

function sendToOwner(api, text) {
  if (!config.ownerID) return;
  // Add a callback function (err) => {} to catch errors so the bot doesn't crash
  api.sendMessage(text, config.ownerID, (err) => {
    if (err) {
       console.log("⚠️ Could not send startup message to owner. (Check if you are friends with the bot).");
    }
  });
}

function userCooldownCheck(userId) {
  const now = Date.now();
  const last = cooldowns.get(userId) || 0;
  const gap = config.cooldownMs || 2000; // default 2s if not set
  if (now - last < gap) {
    return { ok: false, wait: gap - (now - last) };
  }
  cooldowns.set(userId, now);
  return { ok: true };
}

function parseCommandFromBody(body) {
  if (!body || typeof body !== 'string') return null;
  const text = body.trim();
  if (!text.startsWith(botPrefix)) return null;
  const after = text.slice(botPrefix.length).trim();
  if (!after) return null;
  const parts = after.split(/\s+/);
  const name = parts[0].toLowerCase();
  const args = parts.slice(1);
  return { name, args, raw: after };
}

const urlRegex = /(https?:\/\/[^\s]+)/gi;

const startBot = async () => {
  try {
    login({ appState }, (err, api) => {
      if (err) {
        console.error('❌ Login failed:', err);
        return;
      }

      console.clear();
      api.setOptions(config.option || {});
      console.log('🤖 Bot is now online!');
      sendToOwner(api, '🤖 Bot has started successfully!');

      // run onStart for events
      for (const handler of global.events.values()) {
        try {
          if (typeof handler.onStart === 'function') handler.onStart(api);
        } catch (err) {
          console.error('❌ Event onStart error:', err);
        }
      }

      // listen to messages/events
      api.listenMqtt(async (listenErr, event) => {
        if (listenErr) {
          console.error('❌ Event error:', listenErr);
          try { api.sendMessage('❌ Error while listening to events.', config.ownerID); } catch (e) {}
          return;
        }

        try {
          // Call custom event handlers if matching
          if (event && event.type && global.events.has(event.type)) {
            try {
              await global.events.get(event.type).execute({ api, event });
            } catch (e) {
              console.error(`❌ Event '${event.type}' failed:`, e);
            }
          }

          // URL detection logic
          if (event && event.body && urlRegex.test(event.body)) {
            const urlCommand = global.commands.get('url');
            if (urlCommand) {
              // avoid duplicate processing per thread+url
              const detectedKey = `${event.threadID}-${event.body.match(urlRegex)[0]}`;
              // Use a simple per-process set to prevent repeating in short time
              if (!global._detectedURLs) global._detectedURLs = new Set();
              if (global._detectedURLs.has(detectedKey)) {
                // already handled recently
              } else {
                global._detectedURLs.add(detectedKey);
                // auto clean after 60s
                setTimeout(() => global._detectedURLs.delete(detectedKey), 60_000);
                // run the url command
                try {
                  await urlCommand.execute({ api, event, args: [event.body] });
                } catch (e) {
                  console.error('❌ url command failed:', e);
                }
              }
            }
          }

          // Command handling (prefix-based)
          if (event && (event.body || event.message)) {
            const bodyText = event.body || (event.message && event.message.conversation) || '';
            const cmdParsed = parseCommandFromBody(bodyText);
            if (cmdParsed) {
              const cmd = global.commands.get(cmdParsed.name);
              if (!cmd) {
                // optional: reply for unknown commands
                // api.sendMessage(`Unknown command: ${cmdParsed.name}`, event.threadID);
                return;
              }

              // cooldown check per sender
              const userId = event.senderID || event.threadID || event.sender && event.sender.id;
              const allowed = userCooldownCheck(userId || 'unknown');
              if (!allowed.ok) {
                // notify user to wait
                try {
                  await api.sendMessage(`Please wait ${Math.ceil(allowed.wait/1000)}s before using another command.`, event.threadID);
                } catch (e) {}
                return;
              }

              // Execute the command
              try {
                await cmd.execute({ api, event, args: cmdParsed.args, text: bodyText });
              } catch (e) {
                console.error(`❌ Command ${cmdParsed.name} failed:`, e);
                try { api.sendMessage('An error occurred running that command.', event.threadID); } catch (err) {}
              }
            }
          }
        } catch (err) {
          console.error('❌ Unexpected handler error:', err);
        }
      });
    });
  } catch (err) {
    console.error('❌ Failed to start bot:', err);
    process.exit(1);
  }
};

startBot();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down...');
  process.exit(0);
});
