const config = require("../config.json");

module.exports = {
    name: "restart",
    usePrefix: false,
    admin: true, // Only admins can reach this point now
    description: "Restarts the bot instance.",
    
    execute: async ({ api, event }) => {
        // --- 🟢 FIX: FORCE STRING COMPARISON ---
        // Even if config.json has numbers, we convert both to Strings here
        if (String(event.senderID) !== String(config.ownerID)) {
            return api.sendMessage("🔒 Only the Bot Owner can fully stop and restart the process.", event.threadID);
        }

        await api.sendMessage("🔄 System restarting...", event.threadID);
        
        // This kills the process. If you are using Replit, Render, or PM2, 
        // it will automatically start back up again immediately.
        process.exit(1);
    }
};
