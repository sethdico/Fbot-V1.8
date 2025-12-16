// cmds/you.js
const axios = require("axios");

module.exports = {
    name: "you",
    aliases: ["y", "youai"],
    usePrefix: false,
    usage: "you <question>",
    description: "Search using You.com AI (real-time web answers).",
    cooldown: 10,
    execute: async ({ api, event, args }) => {
        const query = args.join(" ").trim();
        if (!query) {
            return api.sendMessage("🔍 Usage: you When is DanDaDan S2?", event.threadID, event.messageID);
        }

        try {
            api.setMessageReaction("🔍", event.messageID, () => {}, true);
            const res = await axios.get("https://betadash-api-swordslush-production.up.railway.app/you", {
                params: { chat: query },
                timeout: 30000
            });

            const answer = res.data?.response?.trim();
            if (!answer) throw new Error("No response");

            api.sendMessage(`🔍 **You.com AI**\n━━━━━━━━━━━━━━━━\n${answer}\n━━━━━━━━━━━━━━━━`, event.threadID, event.messageID);
            api.setMessageReaction("✅", event.messageID, () => {}, true);
        } catch (error) {
            api.setMessageReaction("❌", event.messageID, () => {}, true);
            if (error.code === "ECONNABORTED") {
                return api.sendMessage("⏳ You.com is slow. Try again in 30s.", event.threadID, event.messageID);
            }
            return api.sendMessage("❌ You.com AI is unavailable.", event.threadID, event.messageID);
        }
    }
};
