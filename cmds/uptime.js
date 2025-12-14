const os = require("os");

module.exports = {
    name: "uptime",
    aliases: ["up", "stats"],
    usePrefix: false,
    description: "Shows how long the bot has been running and server info.",
    
    execute({ api, event }) {
        const time = process.uptime();
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = Math.floor(time % 60);

        // Memory Usage
        const usedMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        const totalMemory = os.totalmem() / 1024 / 1024 / 1024;

        const returnMsg = `
╔════════════╗
   📊 SYSTEM STATS
╚════════════╝
⏱️ **Uptime:** ${hours}h ${minutes}m ${seconds}s
🧠 **RAM:** ${Math.round(usedMemory * 100) / 100} MB
🖥️ **Server RAM:** ${totalMemory.toFixed(2)} GB
🐧 **OS:** ${os.type()} ${os.arch()}
        `;

        return api.sendMessage(returnMsg, event.threadID);
    }
};
