const axios = require("axios");

module.exports = {
    name: "aria",
    usePrefix: false,
    usage: "aria <question>",
    description: "Chat with Aria.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID } = event;
        const ask = args.join(" ");
        if (!ask) return api.sendMessage("⚠️ Ask something.", threadID, messageID);

        try {
            api.setMessageReaction("🌸", messageID, () => {}, true);

            const res = await axios.get("https://betadash-api-swordslush-production.up.railway.app/Aria", {
                params: { 
                    ask: ask, 
                    userid: senderID, 
                    stream: "" // Required by your API
                },
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36" }
            });

            const reply = res.data.message || res.data.answer || res.data.result || res.data;
            api.sendMessage(`🌸 **Aria**\n━━━━━━━━━━━━━━━━\n${reply}`, threadID, messageID);
            api.setMessageReaction("✅", messageID, () => {}, true);
        } catch (e) {
            api.sendMessage("❌ Aria API is offline.", threadID, messageID);
        }
    }
};
