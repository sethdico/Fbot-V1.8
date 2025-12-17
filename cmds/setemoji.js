module.exports = {
    name: "setemoji",
    usePrefix: false,
    admin: false,
    description: "Change the group chat emoji.",
    usage: "setemoji <emoji>",
    
    execute: async ({ api, event, args }) => {
        const newEmoji = args[0];
        if (!newEmoji) return api.sendMessage("⚠️ Usage: setemoji 🐧", event.threadID);

        try {
            await api.emoji(newEmoji, event.threadID);
            api.sendMessage(`✅ Group emoji changed to: ${newEmoji}`, event.threadID);
        } catch (e) {
            api.sendMessage("❌ Failed. (Make sure it's a valid emoji)", event.threadID);
        }
    }
};
