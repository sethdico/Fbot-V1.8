module.exports = {
    name: "mention_reply",
    // ⚠️ CRITICAL: The name must not conflict with other events. 
    // We use a specific name here, but the trigger is handled by the index.js logic.
    
    execute: async ({ api, event, config }) => {
        const { body, mentions, threadID, messageID, senderID } = event;
        const botID = api.getCurrentUserID();

        // 1. Check if the bot's ID is in the mentions object
        const isMentioned = mentions && Object.keys(mentions).some(id => String(id) === String(botID));

        // 2. Logic: If mentioned OR if it's a private chat (and not self)
        if (isMentioned) {
            const prefix = config.prefix || "/";
            
            return api.sendMessage(
                {
                    body: `🤖 **System Online**\n━━━━━━━━━━━━━━━━\nHello! My prefix is: \`${prefix}\`\nType \`${prefix}help\` to see commands.`,
                    mentions: [{ tag: "@User", id: senderID }]
                },
                threadID,
                messageID
            );
        }
    }
};
