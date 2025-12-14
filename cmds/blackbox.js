const axios = require("axios");

module.exports = {
    name: "blackbox",
    aliases: ["bb", "box"],
    usePrefix: false,
    usage: "blackbox <question>",
    version: "1.0",
    description: "Chat with Blackbox AI.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID } = event;
        const prompt = args.join(" ");

        if (!prompt) {
            return api.sendMessage("⚠️ Please provide a question.\nUsage: /blackbox <question>", threadID, messageID);
        }

        try {
            // 1. React to indicate processing
            api.setMessageReaction("⏳", messageID, () => {}, true);

            // 2. Call the API
            const apiUrl = "https://rapido.zetsu.xyz/api/blackbox";
            
            const response = await axios.get(apiUrl, {
                params: {
                    query: prompt,
                    id: senderID, // Allows the AI to distinguish users
                    apikey: "rapi_566265dea6d44e16b5149ee816dcf143" // The key you provided
                }
            });

            const data = response.data;
            
            // APIs like this usually return the text in 'message', 'response', or 'data'
            // We check multiple keys just to be safe.
            const reply = data.message || data.response || data.result || data.data;

            if (reply) {
                // 3. Send the result
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                const finalMessage = `⬛ **Blackbox AI**\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                return api.sendMessage(finalMessage, threadID, messageID);
            } else {
                throw new Error("Empty response from API");
            }

        } catch (error) {
            console.error("❌ Blackbox Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ An error occurred while contacting Blackbox.", threadID, messageID);
        }
    }
};
