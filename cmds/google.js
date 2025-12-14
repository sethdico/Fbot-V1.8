const axios = require("axios");

module.exports = {
    name: "google",
    aliases: ["g", "search"],
    usePrefix: false,
    usage: "google <topic>",
    version: "1.0",
    description: "Search Google and get top results.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const query = args.join(" ");

        if (!query) {
            return api.sendMessage("⚠️ Please provide a topic to search.\nUsage: /google <topic>", threadID, messageID);
        }

        try {
            // 1. React to indicate processing
            api.setMessageReaction("🔍", messageID, () => {}, true);

            // 2. Call the API
            const apiUrl = "https://rapido.zetsu.xyz/api/google";
            
            const response = await axios.get(apiUrl, {
                params: {
                    q: query,
                    apikey: "rapi_566265dea6d44e16b5149ee816dcf143"
                }
            });

            const data = response.data;
            
            // APIs usually return results in 'result', 'data', or 'items'
            const results = data.result || data.data || data.items;

            // Handle if results is an array (List of websites)
            if (Array.isArray(results) && results.length > 0) {
                // Get Top 3 results only to avoid spam
                const topResults = results.slice(0, 3).map((item, index) => {
                    return `${index + 1}. **${item.title}**\n🔗 ${item.link}\n📝 ${item.snippet || "No description."}`;
                }).join("\n\n");

                const msg = `🔍 **Google Search: "${query}"**\n━━━━━━━━━━━━━━━━\n${topResults}\n━━━━━━━━━━━━━━━━`;
                
                api.setMessageReaction("✅", messageID, () => {}, true);
                return api.sendMessage(msg, threadID, messageID);
            } 
            
            // Handle if it returns just text (unlikely for Google, but possible)
            else if (typeof results === 'string') {
                 api.setMessageReaction("✅", messageID, () => {}, true);
                 return api.sendMessage(`🔍 **Google Result:**\n${results}`, threadID, messageID);
            }
            
            else {
                throw new Error("No results found");
            }

        } catch (error) {
            console.error("❌ Google Search Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ No results found or API error.", threadID, messageID);
        }
    }
};
