const config = require("../config.json");

module.exports = {
    name: "restart",
    usePrefix: false,
    admin: true,
    description: "Restarts the bot instance.",
    
    execute: async ({ api, event }) => {
        if (event.senderID !== config.ownerID) return; // Strict Owner Check

        await api.sendMessage("🔄 System restarting...", event.threadID);
        
        // This kills the process. If you are using Replit, Render, or PM2, 
        // it will automatically start back up again immediately.
        process.exit(1);
    }
};
