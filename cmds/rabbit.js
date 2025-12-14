const axios = require("axios");

module.exports = {
    name: "rabbit",
    aliases: ["rb"],
    usePrefix: false,
    usage: "rabbit <question>",
    version: "1.0",
    description: "Chat with Rabbit AI (Testing New API).",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const prompt = args.join(" ");

        if (!prompt) {
            return api.sendMessage("⚠️ Please provide a question.\nUsage: /rabbit <question>", threadID, messageID);
        }

        try {
            // 1. React to indicate processing
            api.setMessageReaction("⏳", messageID, () => {}, true);

            // 2. Call the New API URL
            // Note: Your other commands use 'rapido.zetsu.xyz', but this uses 'api.zetsu.xyz'
            const apiUrl = "https://api.zetsu.xyz/api/rabbit";
            
            const response = await axios.get(apiUrl, {
                params: {
                    prompt: prompt
                }
            });

            const data = response.data;
            
            // 3. Log data to console for debugging if it fails
            console.log("Rabbit AI Response:", data);

            // 4. Check for common response keys
            const reply = data.response || data.result || data.message || data.answer;

            if (reply) {
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                const finalMessage = `🐰 **Rabbit AI**\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                return api.sendMessage(finalMessage, threadID, messageID);
            } else {
                throw new Error("Empty response or unknown JSON structure.");
            }

        } catch (error) {
            console.error("❌ Rabbit AI Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            
            // Send detailed error to help you debug
            return api.sendMessage(`❌ Failed to fetch from Rabbit AI.\nError: ${error.message}\n\nCheck your console for more details.`, threadID, messageID);
        }
    }
};
