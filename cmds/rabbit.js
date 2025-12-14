const axios = require("axios");

module.exports = {
    name: "rabbit",
    aliases: ["rb"],
    usePrefix: false, // You can type "rabbit hi" without a slash
    usage: "rabbit <question>",
    version: "1.0",
    description: "Chat with Rabbit AI.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const prompt = args.join(" ");

        // 1. Check if user typed a message
        if (!prompt) {
            return api.sendMessage("⚠️ Please provide a question.\nUsage: rabbit <question>", threadID, messageID);
        }

        try {
            // 2. React with a Rabbit icon to show it is thinking
            api.setMessageReaction("🐰", messageID, () => {}, true);

            const apiKey = "3884224f549d964644816c61b1b65d84";
            const apiUrl = "https://api.zetsu.xyz/api/rabbit";

            // 3. Request data from the API
            const response = await axios.get(apiUrl, {
                params: {
                    prompt: prompt,
                    apikey: apiKey
                }
            });

            const data = response.data;
            
            // 4. Find the answer in the JSON (Handles different API formats)
            const reply = data.response || data.result || data.message || data.answer;

            if (reply) {
                // 5. Send the result
                api.setMessageReaction("✅", messageID, () => {}, true);
                const finalMsg = `🐰 **Rabbit AI**\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                return api.sendMessage(finalMsg, threadID, messageID);
            } else {
                throw new Error("API returned no message.");
            }

        } catch (error) {
            console.error("Rabbit AI Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ The Rabbit AI is currently sleeping (API Error).", threadID, messageID);
        }
    }
};
