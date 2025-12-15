// events/mention.js
module.exports = {
    name: "message", // ⚠️ CRITICAL: Must be "message" to trigger on all texts
    execute: async ({ api, event, config }) => {
        // Only process text messages
        if (!event.body || typeof event.body !== "string") return;

        const botID = api.getCurrentUserID();
        const prefix = config.prefix || "/";
        const threadID = event.threadID;
        const isGroup = event.isGroup;

        // ➤ In GROUPS: only respond if explicitly mentioned with @[BOT_ID]
        if (isGroup) {
            if (event.body.includes(`@[${botID}]`)) {
                return api.sendMessage(
                    `🤖 Hello! I am online.\nMy prefix is: ${prefix}\nType ${prefix}help to see commands.`,
                    threadID,
                    event.messageID
                );
            }
        }
        // ➤ In PRIVATE CHATS: treat any message that looks like a greeting as a mention
        else {
            const lowerBody = event.body.trim().toLowerCase();
            if (
                lowerBody === "hi" ||
                lowerBody === "hello" ||
                lowerBody === "hey" ||
                lowerBody.startsWith("hello") ||
                lowerBody.startsWith("hi ") ||
                lowerBody.includes("help") ||
                lowerBody.startsWith("@")
            ) {
                return api.sendMessage(
                    `🤖 Hello! I'm online.\nMy prefix is: ${prefix}\nTry ${prefix}help to see commands.`,
                    threadID,
                    event.messageID
                );
            }
        }
    }
};
