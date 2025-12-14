const axios = require("axios");

module.exports = {
    name: "webcopilot",
    aliases: ["web", "search", "askweb"], // Shortcuts
    usePrefix: false,
    usage: "webcopilot <question>",
    version: "1.0",
    description: "Search the web and generate responses using WebPilot AI.",
    cooldown: 15, // High cooldown because this API is slow

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const question = args.join(" ");

        if (!question) {
            return api.sendMessage("⚠️ Please provide a topic or question.\nUsage: /webcopilot <question>", threadID, messageID);
        }

        try {
            // 1. React to indicate processing
            api.setMessageReaction("⏳", messageID, () => {}, true);

            // 2. Send a waiting message because this API takes ~30 seconds
            const waitMsg = await api.sendMessage("🔍 Searching the web... (This may take up to 30 seconds)", threadID);

            // 3. Call the API
            const apiUrl = `https://shin-apis.onrender.com/ai/webcopilot?question=${encodeURIComponent(question)}`;
            const response = await axios.get(apiUrl);
            
            const data = response.data;

            if (data && data.answer) {
                // 4. Send the result
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                // Unsend the "Searching..." message to keep chat clean
                api.unsendMessage(waitMsg.messageID);

                const finalMessage = `🌐 **WebPilot AI**\n━━━━━━━━━━━━━━━━\n${data.answer}\n━━━━━━━━━━━━━━━━`;
                return api.sendMessage(finalMessage, threadID, messageID);
            } else {
                throw new Error("Empty answer from API");
            }

        } catch (error) {
            console.error("❌ WebCopilot Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ Error: The search timed out or the API is down.", threadID, messageID);
        }
    }
};
