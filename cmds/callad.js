const config = require("../config.json");

module.exports = {
    name: "callad",
    aliases: ["report", "feedback"],
    usePrefix: false,
    description: "Send a message to the bot owner.",
    usage: "callad <message>",
    cooldown: 60, // High cooldown to prevent spamming your inbox

    execute: async ({ api, event, args }) => {
        const message = args.join(" ");
        if (!message) return api.sendMessage("⚠️ Please enter a message to send to the admin.", event.threadID);

        const senderID = event.senderID;
        const senderName = (await api.getUserInfo(senderID))[senderID].name;

        // Message format for you
        const reportMsg = `
📞 **USER REPORT**
━━━━━━━━━━━━
👤 **From:** ${senderName}
🆔 **ID:** ${senderID}
📂 **Group:** ${event.threadID}
━━━━━━━━━━━━
📝 **Message:**
${message}
`;

        // Send to Owner
        try {
            await api.sendMessage(reportMsg, config.ownerID);
            api.sendMessage("✅ Message sent to the admin!", event.threadID);
        } catch (e) {
            api.sendMessage("❌ Failed to contact admin. They might be unavailable.", event.threadID);
        }
    }
};
