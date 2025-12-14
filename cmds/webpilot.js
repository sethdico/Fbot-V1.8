const axios = require("axios");

module.exports = {
    name: "webcopilot",
    aliases: ["web", "search", "askweb"],
    usePrefix: false,
    usage: "webcopilot <question>",
    version: "2.0", 
    description: "Searches the web using Bing to find answers. Good for news and facts!",
    cooldown: 10,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const question = args.join(" ");

        if (!question) {
            return api.sendMessage("⚠️ Please provide a topic to search.\nUsage: /webcopilot <topic>", threadID, messageID);
        }

        try {
            api.setMessageReaction("🔎", messageID, () => {}, true);
            const waitMsg = await api.sendMessage(`🔍 Searching the web for: "${question}"...`, threadID);

            const apiUrl = "https://shin-apis.onrender.com/ai/copilot";
            
            const response = await axios.get(apiUrl, {
                params: {
                    message: `Search the web and answer this specifically: ${question}`,
                    model: "gpt-5"
                }
            });

            const data = response.data;
            const reply = data.result || data.response || data.answer || data.message;

            if (reply) {
                api.unsendMessage(waitMsg.messageID); 
                api.setMessageReaction("✅", messageID, () => {}, true);

                const finalMessage = `🌐 **Web Search Result**\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                return api.sendMessage(finalMessage, threadID, messageID);
            } else {
                throw new Error("Empty response");
            }

        } catch (error) {
            console.error("❌ WebSearch Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ The search engine is currently busy.", threadID, messageID);
        }
    }
};
