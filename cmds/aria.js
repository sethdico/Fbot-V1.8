const axios = require("axios");

module.exports = {
    name: "aria",
    aliases: ["ar"],
    usePrefix: false,
    usage: "aria <question>",
    version: "1.0",
    description: "Chat with Aria AI.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const prompt = args.join(" ");

        if (!prompt) {
            return api.sendMessage("⚠️ Please provide a question.\nUsage: /aria <question>", threadID, messageID);
        }

        try {
            // 1. React to indicate processing
            api.setMessageReaction("💬", messageID, () => {}, true);

            // 2. Call the API
            const apiUrl = "https://rapido.zetsu.xyz/api/aria";
            
            const response = await axios.get(apiUrl, {
                params: {
                    prompt: prompt,
                    apikey: "rapi_566265dea6d44e16b5149ee816dcf143"
                }
            });

            const data = response.data;
            
            // Check for common response keys
            const reply = data.result || data.response || data.message || data.answer;

            if (reply) {
                // 3. Send the result
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                const finalMessage = `🤖 **Aria AI**\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                return api.sendMessage(finalMessage, threadID, messageID);
            } else {
                throw new Error("Empty response from API");
            }

        } catch (error) {
            console.error("❌ Aria Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ An error occurred while contacting Aria AI.", threadID, messageID);
        }
    }
};
