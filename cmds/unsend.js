module.exports = {
    name: "unsend",
    aliases: ["delete", "remove"],
    usePrefix: false,
    admin: false,
    cooldown: 5,
    version: "1.2",
    usage: "unsend (reply to bot message)",
    description: "Deletes a message sent by the bot. Reply to the message you want to remove.",
    execute: async ({ api, event }) => {
        if (!event.messageReply) {
            return api.sendMessage("⚠️ Please reply to a bot message to unsend it.\nUsage: Reply to my message with 'unsend'", event.threadID, event.messageID);
        }
        
        const { messageReply } = event;
        const botID = api.getCurrentUserID();
        
        // Check if the replied message was sent by the bot
        if (String(messageReply.senderID) !== String(botID)) {
            return api.sendMessage("⚠️ You can only unsend messages sent by the bot!", event.threadID, event.messageID);
        }
        
        try {
            await api.unsendMessage(messageReply.messageID);
            console.log(`✅ Message unsent: ${messageReply.messageID}`);
        } catch (error) {
            console.error("❌ Error unsending message:", error);
            api.sendMessage("❌ Failed to unsend the message. This might be due to Facebook rate limits.", event.threadID, event.messageID);
        }
    },
};
