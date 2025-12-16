const axios = require("axios");

module.exports = {
    name: "webpilot",
    aliases: ["wsearch", "ws"],
    usePrefix: false,
    usage: "webpilot <query>",
    description: "Search the web using AI.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const search = args.join(" ");

        if (!search) return api.sendMessage("⚠️ Please provide a search topic.", threadID, messageID);

        try {
            api.setMessageReaction("🌐", messageID, () => {}, true);

            const res = await axios.get(`https://betadash-api-swordslush-production.up.railway.app/webpilot?search=${encodeURIComponent(search)}`);
            const reply = res.data.message || res.data.result || res.data;

            api.sendMessage(`🌐 **WebPilot**\n━━━━━━━━━━━━━━━━\n${reply}`, threadID, messageID);
            api.setMessageReaction("✅", messageID, () => {}, true);
        } catch (e) {
            api.sendMessage("❌ Search failed.", threadID, messageID);
        }
    }
};
