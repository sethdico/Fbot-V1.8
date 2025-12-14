const axios = require("axios");

module.exports = {
    name: "venice",
    aliases: ["ven", "vc"],
    usePrefix: false,
    usage: "venice <question>",
    version: "1.0",
    description: "Chat with Venice AI.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const question = args.join(" ");

        if (!question) {
            return api.sendMessage("⚠️ Please provide a question.\nUsage: /venice <question>", threadID, messageID);
        }

        try {
            // 1. React to indicate processing
            api.setMessageReaction("⏳", messageID, () => {}, true);

            // 2. API Configuration
            const apiUrl = "https://shin-apis.onrender.com/ai/venice";
            
            const response = await axios.get(apiUrl, {
                params: {
                    question: question,
                    systemPrompt: "You are a helpful and intelligent AI assistant." // You can change this personality here
                }
            });

            const data = response.data;
            
            // Check for various common response keys since APIs vary
            const reply = data.response || data.answer || data.message || data.result;

            if (reply) {
                // 3. Send the result
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                // Optional: Add a header to make it look nice
                const finalMessage = `🤖 **Venice AI**\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                return api.sendMessage(finalMessage, threadID, messageID);
            } else {
                throw new Error("Empty response from API");
            }

        } catch (error) {
            console.error("❌ Venice AI Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ An error occurred while contacting Venice AI.", threadID, messageID);
        }
    }
};
