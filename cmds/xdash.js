// cmds/xdash.js
const axios = require("axios");

module.exports = {
    name: "xdash",
    aliases: ["x", "dash", "searchx"],
    usePrefix: false,
    usage: "xdash <query>",
    description: "Fast AI-powered search for facts, news, and updates (e.g., anime release dates).",
    cooldown: 8,
    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const query = args.join(" ").trim();

        if (!query) {
            return api.sendMessage(
                "🔍 **XDash Help**\nAsk anything and get instant answers!\n📌 Usage: `xdash When is DanDaDan Season 2 releasing?`",
                threadID,
                messageID
            );
        }

        let loadingMsgID;
        try {
            // User feedback: reaction + loading message
            api.setMessageReaction("⚡", messageID, () => {}, true);
            loadingMsgID = await api.sendMessage(`⚡ Searching with XDash...\n> _${query}_`, threadID);

            // Call the API
            const response = await axios.get(
                "https://api.zetsu.xyz/api/xdash",
                {
                    params: { query },
                    timeout: 25000,
                    headers: {
                        "User-Agent": "Fbot-V1.8 (+https://github.com/sethdico/Fbot-V1.8)"
                    }
                }
            );

            let answer = response.data?.result || response.data?.response || response.data?.message || response.data;

            // Handle string or object responses
            if (typeof answer === 'object') {
                answer = answer.text || answer.output || JSON.stringify(answer);
            }

            answer = (answer || "").toString().trim();

            if (!answer || answer.length < 5) {
                throw new Error("Empty or invalid response");
            }

            // Clean up loading message
            if (loadingMsgID?.messageID) {
                api.unsendMessage(loadingMsgID.messageID);
            }

            // Send final reply
            const finalMsg = `⚡ **XDash AI**\n` +
                `━━━━━━━━━━━━━━━━\n` +
                `${answer}\n` +
                `━━━━━━━━━━━━━━━━`;

            api.sendMessage(finalMsg, threadID, messageID);
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            // Clean up loading message
            if (loadingMsgID?.messageID) {
                api.unsendMessage(loadingMsgID.messageID);
            }

            api.setMessageReaction("❌", messageID, () => {}, true);

            if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
                return api.sendMessage(
                    "⏳ XDash is taking too long. The server may be sleeping or busy. Try again in 30 seconds.",
                    threadID,
                    messageID
                );
            }

            if (error.response?.status === 400 || error.response?.status === 422) {
                return api.sendMessage("⚠️ Invalid query. Please ask a clearer question.", threadID, messageID);
            }

            console.error("❌ XDash Error:", error.message);
            return api.sendMessage(
                "❌ XDash is currently unavailable. Try `/webcopilot` or `/phind` as alternatives.",
                threadID,
                messageID
            );
        }
    }
};
