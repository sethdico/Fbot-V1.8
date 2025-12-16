const axios = require("axios");

module.exports = {
    name: "you",
    usePrefix: false,
    usage: "you <question>",
    description: "Chat with You.com smart AI.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const chat = args.join(" ");

        if (!chat) return api.sendMessage("⚠️ Please ask a question.", threadID, messageID);

        try {
            api.setMessageReaction("🟢", messageID, () => {}, true);

            const res = await axios.get(`https://betadash-api-swordslush-production.up.railway.app/you?chat=${encodeURIComponent(chat)}`);
            const reply = res.data.message || res.data.result || res.data;

            api.sendMessage(`🟢 **You AI**\n━━━━━━━━━━━━━━━━\n${reply}`, threadID, messageID);
            api.setMessageReaction("✅", messageID, () => {}, true);
        } catch (e) {
            api.sendMessage("❌ AI is busy.", threadID, messageID);
        }
    }
};
