// events/mention.js
module.exports = {
    name: "message",
    execute: async ({ api, event, config }) => {
        // Only process text messages
        if (!event.body || typeof event.body !== "string") return;

        const botID = api.getCurrentUserID();
        const prefix = config.prefix || "/";
        const threadID = event.threadID;
        const isGroup = event.isGroup;

        // In private chats: if the message looks like a greeting or mention, reply
        if (!isGroup) {
            const lowerBody = event.body.trim().toLowerCase();
            // If user says "hi", "hello", or @botname in DM, reply
            if (
                lowerBody === "hi" ||
                lowerBody === "hello" ||
                lowerBody === "hey" ||
                lowerBody.startsWith("@") ||
                lowerBody.includes(botID.toString())
            ) {
                return api.sendMessage(
                    `🤖 Hello! I'm online.\nMy prefix is: ${prefix}\nTry ${prefix}help to see commands.`,
                    threadID,
                    event.messageID
                );
            }
        }
        // In groups: only respond if explicitly mentioned with @[BOT_ID]
        else {
            if (event.body.includes(`@[${botID}]`)) {
                return api.sendMessage(
                    `🤖 Hello! I'm online.\nMy prefix is: ${prefix}\nTry ${prefix}help to see commands.`,
                    threadID,
                    event.messageID
                );
            }
        }
    }
};
