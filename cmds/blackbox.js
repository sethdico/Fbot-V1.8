const axios = require("axios");

module.exports = {
    name: "blackbox",
    aliases: ["bb", "box"],
    usePrefix: false,
    usage: "blackbox <message>",
    version: "2.0",
    description: "Conversational Blackbox AI. It remembers who you are.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID } = event;
        const prompt = args.join(" ");

        // Check if user provided input
        if (!prompt) {
            return api.sendMessage("⚠️ Please provide a message.\nUsage: /blackbox <message>", threadID, messageID);
        }

        try {
            // 1. React to indicate processing
            api.setMessageReaction("⏳", messageID, () => {}, true);

            // 2. Call the New API URL
            const apiUrl = "https://api.zetsu.xyz/api/blackbox";
            
            const response = await axios.get(apiUrl, {
                params: {
                    prompt: prompt,
                    uid: senderID // Passes User ID for conversational context
                }
            });

            const data = response.data;
            
            // 3. Extract the answer (Handles common response variations)
            const reply = data.response || data.message || data.result || data.answer;

            if (reply) {
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                const finalMessage = `⬛ **Blackbox AI**\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                return api.sendMessage(finalMessage, threadID, messageID);
            } else {
                throw new Error("Empty response from API");
            }

        } catch (error) {
            console.error("❌ Blackbox Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ An error occurred while connecting to Blackbox AI.", threadID, messageID);
        }
    }
};
