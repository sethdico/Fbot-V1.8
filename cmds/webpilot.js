// cmds/webpilot.js
const axios = require("axios");

module.exports = {
    name: "webpilot",
    aliases: ["web", "searchweb", "pilot"],
    usePrefix: false,
    usage: "webpilot <query>",
    description: "Search the web with AI-powered answers.",
    cooldown: 12,
    execute: async ({ api, event, args }) => {
        const query = args.join(" ").trim();
        if (!query) {
            return api.sendMessage("🌐 Usage: webpilot DanDaDan S2 release date", event.threadID, event.messageID);
        }

        try {
            api.setMessageReaction("🌐", event.messageID, () => {}, true);
            const loadingMsg = await api.sendMessage(`🌐 Searching WebPilot...\n> _${query}_`, event.threadID);

            const res = await axios.get("https://betadash-api-swordslush-production.up.railway.app/webpilot", {
                params: { search: query },
                timeout: 35000
            });

            const answer = res.data?.response?.trim();
            if (!answer) throw new Error("No data");

            api.unsendMessage(loadingMsg.messageID);
            api.sendMessage(`🌐 **WebPilot**\n━━━━━━━━━━━━━━━━\n${answer}\n━━━━━━━━━━━━━━━━`, event.threadID, event.messageID);
            api.setMessageReaction("✅", event.messageID, () => {}, true);
        } catch (error) {
            if (typeof loadingMsg !== 'undefined' && loadingMsg?.messageID) {
                api.unsendMessage(loadingMsg.messageID);
            }
            api.setMessageReaction("❌", event.messageID, () => {}, true);
            if (error.code === "ECONNABORTED") {
                return api.sendMessage("⏳ WebPilot is slow. Try again in 30s.", event.threadID, event.messageID);
            }
            return api.sendMessage("❌ WebPilot is down.", event.threadID, event.messageID);
        }
    }
};
