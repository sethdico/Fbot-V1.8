module.exports = {
    name: "spam",
    usePrefix: false,
    admin: true, // STRICTLY ADMIN
    description: "Spam a message X times.",
    usage: "spam <amount> <message>",
    
    execute: async ({ api, event, args }) => {
        const amount = parseInt(args[0]);
        const message = args.slice(1).join(" ");

        if (isNaN(amount) || !message) {
            return api.sendMessage("⚠️ Usage: spam <amount> <text>", event.threadID);
        }

        if (amount > 50) return api.sendMessage("❌ Limit is 50 to prevent bans.", event.threadID);

        api.sendMessage(`🚀 Spamming "${message}" ${amount} times...`, event.threadID);

        for (let i = 0; i < amount; i++) {
            // Slight delay to prevent immediate API block
            setTimeout(() => {
                api.sendMessage(message, event.threadID);
            }, i * 1000); // 1 second delay between messages
        }
    }
};
