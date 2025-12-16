const axios = require("axios");

module.exports = {
    name: "aria",
    aliases: ["ar"],
    usePrefix: false,
    usage: "aria <question>",
    description: "Aria AI conversational with real-time information.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID } = event;
        const query = args.join(" ").trim();

        if (!query) {
            return api.sendMessage("🤖 Usage: aria What is the capital of France?", threadID, messageID);
        }

        try {
            api.setMessageReaction("💬", messageID, () => {}, true);

            // sending both 'userid' and 'uid' to ensure the API catches the ID for memory
            const res = await axios.get("https://betadash-api-swordslush-production.up.railway.app/Aria", {
                params: {
                    ask: query,
                    userid: String(senderID), // Ensuring it is sent as a string
                    uid: String(senderID)     // Some APIs look for 'uid' instead of 'userid'
                }
            });

            const answer = res.data.response || res.data.message || res.data.result || res.data.answer;

            if (!answer) throw new Error("Empty response");

            api.sendMessage(`🤖 **Aria AI**\n━━━━━━━━━━━━━━━━\n${answer}\n━━━━━━━━━━━━━━━━`, threadID, messageID);
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            api.setMessageReaction("❌", messageID, () => {}, true);
            if (error.code === "ECONNABORTED") {
                return api.sendMessage("⏳ Aria took too long to answer. Please try again.", threadID, messageID);
            }
            return api.sendMessage("❌ Aria is currently offline.", threadID, messageID);
        }
    }
};
