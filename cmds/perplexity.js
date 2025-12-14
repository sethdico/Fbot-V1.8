const axios = require("axios");

module.exports = {
    name: "perplexity",
    aliases: ["pplx", "ask"],
    usePrefix: false,
    usage: "perplexity <question>",
    version: "1.0",
    description: "Chat with Perplexity AI (Real-time Web Search).",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const prompt = args.join(" ");

        if (!prompt) {
            return api.sendMessage("⚠️ Please provide a question.\nUsage: /perplexity <question>", threadID, messageID);
        }

        try {
            // 1. React to indicate processing
            api.setMessageReaction("🧠", messageID, () => {}, true);

            // 2. Call the API
            const apiUrl = "https://rapido.zetsu.xyz/api/perplexity";
            
            const response = await axios.get(apiUrl, {
                params: {
                    query: prompt, 
                    apikey: "rapi_566265dea6d44e16b5149ee816dcf143"
                }
            });

            const data = response.data;
            
            // Perplexity APIs usually return 'message' or 'response'
            const reply = data.message || data.response || data.result || data.data;

            if (reply) {
                // 3. Send the result
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                // Format nicely
                const finalMessage = `🧠 **Perplexity AI**\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                return api.sendMessage(finalMessage, threadID, messageID);
            } else {
                throw new Error("Empty response from API");
            }

        } catch (error) {
            console.error("❌ Perplexity Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ An error occurred. The API might be down or busy.", threadID, messageID);
        }
    }
};
