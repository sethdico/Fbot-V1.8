const axios = require("axios");

module.exports = {
    name: "webcopilot",
    aliases: ["web", "search", "askweb", "copilotweb"],
    usePrefix: false,
    usage: "webcopilot <question>",
    version: "2.1 (optimized)",
    description: "Searches the web in real-time using AI to answer your questions. Great for facts, news, and explanations!",
    cooldown: 12, // Increased slightly to prevent abuse + API sleep
    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const question = args.join(" ").trim();

        if (!question) {
            return api.sendMessage(
                "🔍 **WebCopilot Help**\n" +
                "Ask anything and I’ll search the web!\n" +
                "📌 Usage: `webcopilot What is quantum computing?`",
                threadID,
                messageID
            );
        }

        let loadingMsgID;
        try {
            // Show processing reaction + message
            api.setMessageReaction("🌐", messageID, () => {}, true);
            loadingMsgID = await api.sendMessage(`🔍 Searching the web for:\n> _${question}_`, threadID);

            // Call your working API
            const response = await axios.get(
                "https://shin-apis.onrender.com/ai/webcopilot",
                {
                    params: { question },
                    timeout: 35000 // 35s timeout (Render apps sleep)
                }
            );

            const data = response.data;
            const answer = data.answer?.trim();

            if (!answer) {
                throw new Error("No answer returned");
            }

            // Clean up loading message
            if (loadingMsgID?.messageID) {
                api.unsendMessage(loadingMsgID.messageID);
            }

            // Send final answer with formatting
            const finalMsg = `🌐 **WebCopilot Result**\n` +
                `━━━━━━━━━━━━━━━━\n` +
                `${answer}\n` +
                `━━━━━━━━━━━━━━━━\n` +
                `⏱️ Responded in ${data.responseTime || "N/A"}`;

            api.sendMessage(finalMsg, threadID, messageID);
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            // Clean up loading message if it exists
            if (loadingMsgID?.messageID) {
                api.unsendMessage(loadingMsgID.messageID);
            }

            api.setMessageReaction("❌", messageID, () => {}, true);

            if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
                return api.sendMessage(
                    "⏳ The search engine is waking up (Render sleep). Please wait 1 minute and try again.",
                    threadID,
                    messageID
                );
            }

            if (error.response?.status === 429) {
                return api.sendMessage("⚠️ Too many requests. Please wait before trying again.", threadID, messageID);
            }

            console.error("❌ WebCopilot Error:", error.message);
            return api.sendMessage(
                "❌ Failed to get a response from the web search engine. The service may be overloaded or offline.",
                threadID,
                messageID
            );
        }
    }
};
