const config = require("../config.json");

module.exports = {
    name: "restart",
    usePrefix: false,
    admin: true, // Only admins can reach this point now
    description: "Restarts the bot instance.",
    
    execute: async ({ api, event }) => {
        await api.sendMessage("🔄 System restarting...", event.threadID);
        
        // This command is flagged 'admin: true', meaning only Owner/Admins can execute it.
        // We keep a strict OwnerID check *before* the critical process.exit(1) as a final 
        // security gate to ensure only the highest authority can stop the bot.
        if (event.senderID !== config.ownerID) {
            return api.sendMessage("🔒 Only the Bot Owner can fully stop and restart the process.", event.threadID);
        }

        // This kills the process. If you are using Replit, Render, or PM2, 
        // it will automatically start back up again immediately.
        process.exit(1);
    }
};
