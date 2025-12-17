module.exports = {
    name: "restart",
    aliases: ["reboot", "reload"],
    usePrefix: false,
    admin: true,
    cooldown: 5,
    version: "2.0",
    usage: "restart",
    description: "Restarts the bot instance. Owner only.",
    execute: async ({ api, event, config }) => {
        // Use global config, not direct require
        const ownerID = String(config.ownerID);
        const senderID = String(event.senderID);
        
        if (senderID !== ownerID) {
            return api.sendMessage("🔒 Only the Bot Owner can restart the system.", event.threadID);
        }
        
        await api.sendMessage("🔄 System restarting...", event.threadID);
        console.log(`✅ Bot restarted by owner ${senderID}`);
        process.exit(1);
    }
};
