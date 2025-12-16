const axios = require("axios");

module.exports = {
    name: "you",
    usePrefix: false,
    usage: "you <question>",
    description: "Chat with You.com AI.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const chat = args.join(" ");
        if (!chat) return api.sendMessage("⚠️ Ask something.", threadID, messageID);

        try {
            api.setMessageReaction("🟢", messageID, () => {}, true);

            const res = await axios.get(`https://betadash-api-swordslush-production.up.railway.app/you?chat=${encodeURIComponent(chat)}`, {
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36" }
            });

            const reply = res.data.message || res.data.result || res.data;
            api.sendMessage(`🟢 **You AI**\n━━━━━━━━━━━━━━━━\n${reply}`, threadID, messageID);
            api.setMessageReaction("✅", messageID, () => {}, true);
        } catch (e) {
            api.sendMessage("❌ API Error: Host is unreachable.", threadID, messageID);
        }
    }
};
