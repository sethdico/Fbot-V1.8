const axios = require("axios");

module.exports = {
    name: "google",
    aliases: ["g", "search", "find"],
    usePrefix: false,
    usage: "google <topic>",
    version: "3.0",
    description: "Search Google and return the top 5 results (Powered by Popcat).",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const query = args.join(" ");

        if (!query) {
            return api.sendMessage("⚠️ Please provide a topic to search.\nUsage: /google <topic>", threadID, messageID);
        }

        try {
            // 1. React to indicate searching
            api.setMessageReaction("🔎", messageID, () => {}, true);

            // 2. Call the API (Popcat - Stable & Free)
            const apiUrl = `https://api.popcat.xyz/google?q=${encodeURIComponent(query)}`;
            
            const response = await axios.get(apiUrl);
            
            // Popcat returns the array directly
            const results = response.data;

            if (results && results.length > 0) {
                // 3. Format Top 5 Results
                let msg = `🔍 **Google Search: "${query}"**\n━━━━━━━━━━━━━━━━\n`;

                // Loop through first 5 items (or less if fewer results)
                const count = Math.min(results.length, 5);
                
                for (let i = 0; i < count; i++) {
                    const item = results[i];
                    msg += `${i + 1}. **${item.title}**\n🔗 ${item.link}\n📝 ${item.snippet || "No description."}\n\n`;
                }

                msg += `━━━━━━━━━━━━━━━━`;
                
                api.setMessageReaction("✅", messageID, () => {}, true);
                return api.sendMessage(msg, threadID, messageID);
            } else {
                throw new Error("No results returned");
            }

        } catch (error) {
            console.error("Google Search Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            // Fallback suggestion
            return api.sendMessage("❌ Google Search failed. Try using /perplexity or /copilot for answers instead.", threadID, messageID);
        }
    }
};
