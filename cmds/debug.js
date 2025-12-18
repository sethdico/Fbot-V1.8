module.exports = {
    name: "debug",
    admin: true,
    description: "System Stats",
    execute: ({ api, event, config }) => {
        const memory = process.memoryUsage().heapUsed / 1024 / 1024;
        const uptime = process.uptime();
        const msg = `🛠️ **DEBUG**
━━━━━━━━━━━━━━━━
👑 Owner: ${config.ownerID}
📊 RAM: ${Math.round(memory * 100) / 100} MB
⏱️ Uptime: ${Math.floor(uptime)}s
🛡️ Safe Mode: ${config.safeMode ? "ON" : "OFF"}`;
        
        api.sendMessage(msg, event.threadID);
    }
};
