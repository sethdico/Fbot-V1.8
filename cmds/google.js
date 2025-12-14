const axios = require("axios");

module.exports = {
    name: "google",
    aliases: ["g", "search", "find"],
    usePrefix: false,
    usage: "google <topic>",
    version: "2.0",
    description: "Search Google and return the top 5 results.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const query = args.join(" ");

        if (!query) {
            return api.sendMessage("⚠️ Please provide a topic to search.\nUsage: /google <topic>", threadID, messageID);
        }

        try {
            // 1. React to indicate searching
            api.setMessageReaction("🔍", messageID, () => {}, true);

            // 2. Call the new API (Deku - Free & Stable)
            const apiUrl = `https://deku-rest-api.gleeze.com/search/google?q=${encodeURIComponent(query)}`;
            
            const response = await axios.get(apiUrl);
            const data = response.data;
            
            // The API returns the list in 'result'
            const results = data.result;

            if (results && results.length > 0) {
                // 3. Format Top 5 Results
                let msg = `🔍 **Google Search: "${query}"**\n━━━━━━━━━━━━━━━━\n`;

                // Loop through first 5 items
                const topResults = results.slice(0, 5);
                topResults.forEach((item, index) => {
                    msg += `${index + 1}. **${item.title}**\n🔗 ${item.url}\n📝 ${item.description || "No description."}\n\n`;
                });

                msg += `━━━━━━━━━━━━━━━━`;
                
                api.setMessageReaction("✅", messageID, () => {}, true);
                return api.sendMessage(msg, threadID, messageID);
            } else {
                throw new Error("No results returned");
            }

        } catch (error) {
            console.error("Google Search Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ No results found or the search API is currently busy.", threadID, messageID);
        }
    }
};
