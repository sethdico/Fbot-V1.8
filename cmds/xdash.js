// cmds/xdash.js
const axios = require("axios");

module.exports = {
    name: "xdash",
    aliases: ["x", "dash", "searchx"],
    usePrefix: false,
    usage: "xdash <query>",
    description: "Fast AI-powered search using XDash (great for news, anime, facts).",
    cooldown: 8,
    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const query = args.join(" ").trim();

        if (!query) {
            return api.sendMessage(
                "⚡ **XDash Help**\nAsk anything and get instant answers!\n📌 Usage: `xdash DanDaDan Season 2 release date`",
                threadID,
                messageID
            );
        }

        try {
            api.setMessageReaction("⚡", messageID, () => {}, true);
            const loadingMsg = await api.sendMessage(`⚡ Searching with XDash...\n> _${query}_`, threadID);

            const response = await axios.get(
                "https://api.zetsu.xyz/api/xdash",
                {
                    params: {
                        query: query,
                        apikey: "3884224f549d964644816c61b1b65d84" // ✅ Your key
                    },
                    timeout: 25000,
                    headers: { "User-Agent": "Fbot-V1.8" }
                }
            );

            let answer = response.data?.result || response.data?.response || response.data;
            if (typeof answer === "object") answer = JSON.stringify(answer);
            answer = (answer || "").toString().trim();

            if (!answer || answer.length < 5) {
                throw new Error("Invalid response");
            }

            api.unsendMessage(loadingMsg.messageID);
            const finalMsg = `⚡ **XDash AI**\n` +
                `━━━━━━━━━━━━━━━━\n` +
                `${answer}\n` +
                `━━━━━━━━━━━━━━━━`;

            api.sendMessage(finalMsg, threadID, messageID);
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            if (typeof loadingMsg !== 'undefined' && loadingMsg?.messageID) {
                api.unsendMessage(loadingMsg.messageID);
            }
            api.setMessageReaction("❌", messageID, () => {}, true);
            if (error.code === "ECONNABORTED") {
                return api.sendMessage("⏳ XDash is waking up. Try again in 30s.", threadID, messageID);
            }
            console.error("XDash Error:", error.message);
            return api.sendMessage("❌ XDash is down or overloaded.", threadID, messageID);
        }
    }
};
