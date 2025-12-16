const axios = require("axios");

module.exports = {
    name: "aria",
    usePrefix: false,
    usage: "aria <question>",
    description: "Chat with Aria (Beta).",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID } = event;
        const ask = args.join(" ");

        if (!ask) return api.sendMessage("⚠️ Please ask a question.", threadID, messageID);

        try {
            api.setMessageReaction("🌸", messageID, () => {}, true);

            const res = await axios.get("https://betadash-api-swordslush-production.up.railway.app/Aria", {
                params: {
                    ask: ask,
                    userid: senderID,
                    stream: "" // Keep empty as per your link
                }
            });

            const reply = res.data.message || res.data.answer || res.data.result || res.data;
            
            api.sendMessage(`🌸 **Aria**\n━━━━━━━━━━━━━━━━\n${reply}`, threadID, messageID);
            api.setMessageReaction("✅", messageID, () => {}, true);
        } catch (e) {
            api.sendMessage("❌ Aria is unavailable.", threadID, messageID);
        }
    }
};
