// cmds/phind.js
const axios = require("axios");

module.exports = {
    name: "phind",
    aliases: ["ph", "searchph", "phindai"],
    usePrefix: false,
    usage: "phind <question>",
    version: "1.0 (optimized)",
    description: "Search the web using Phind AI (great for up-to-date info, news, and release dates!).",
    cooldown: 10,
    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const query = args.join(" ").trim();

        // Input validation
        if (!query) {
            return api.sendMessage(
                "🔍 **Phind AI Help**\nAsk anything and get real-time answers!\n📌 Usage: `phind When is DanDaDan S2 releasing?`",
                threadID,
                messageID
            );
        }

        let loadingMsgID;
        try {
            // User feedback: reaction + loading message
            api.setMessageReaction("🔍", messageID, () => {}, true);
            loadingMsgID = await api.sendMessage(`🧠 Asking Phind AI...\n> _${query}_`, threadID);

            // Call the API with proper encoding
            const response = await axios.get(
                "https://api.ccprojectsapis-jonell.gleeze.com/api/phindai",
                {
                    params: { q: query }, // axios auto-encodes
                    timeout: 30000, // 30s timeout
                    headers: {
                        "User-Agent": "Fbot-V1.8 (+https://github.com/sethdico/Fbot-V1.8)"
                    }
                }
            );

            const answer = response.data?.result?.trim();

            if (!answer || answer.toLowerCase().includes("error") || answer.length < 5) {
                throw new Error("Invalid or empty response");
            }

            // Clean up loading message
            if (loadingMsgID?.messageID) {
                api.unsendMessage(loadingMsgID.messageID);
            }

            // Send final formatted reply
            const finalMsg = `🧠 **Phind AI**\n` +
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
                    "⏳ Phind AI is taking too long. The server might be busy — try again in a few seconds.",
                    threadID,
                    messageID
                );
            }

            if (error.response?.status === 429) {
                return api.sendMessage("⚠️ Too many requests. Please wait before trying again.", threadID, messageID);
            }

            console.error("❌ Phind AI Error:", error.message);
            return api.sendMessage(
                "❌ Phind AI is currently unavailable. Try again later or use `/webcopilot` as an alternative.",
                threadID,
                messageID
            );
        }
    }
};
