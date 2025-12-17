// cmds/wiki.js
const axios = require("axios");

module.exports = {
    name: "wiki",
    aliases: ["wikipedia", "w"],
    usePrefix: false,
    usage: "wiki <topic>",
    description: "Searches Wikipedia and returns a short summary with a link.",
    cooldown: 5,
    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const query = args.join(" ").trim();

        if (!query) {
            return api.sendMessage(
                "🔍 Usage: wiki <topic>\nExample: wiki Albert Einstein",
                threadID,
                messageID
            );
        }

        try {
            api.setMessageReaction("🔍", messageID, () => {}, true);

            // ✅ Use proper encodeURIComponent for the page title
            const safeQuery = query.replace(/\s+/g, '_'); // Wikipedia uses underscores
            const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(safeQuery)}`;
            
            const response = await axios.get(searchUrl, { timeout: 10000 });
            const data = response.data;

            if (!data || data.type === "disambiguation" || !data.extract) {
                throw new Error("No valid summary found");
            }

            let summary = data.extract.replace(/\n+/g, " ").trim();
            if (summary.length > 800) {
                summary = summary.substring(0, 800).trim() + "...";
            }

            const title = data.title;
            const url = data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${safeQuery}`;

            const message = `📘 **Wikipedia: ${title}**
━━━━━━━━━━━━━━━━
${summary}
━━━━━━━━━━━━━━━━
🔗 [Read full article](${url})`;

            api.sendMessage(message, threadID, messageID);
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            console.error("Wikipedia Error Details:", error.response?.status, error.message);

            if (error.response?.status === 404) {
                api.sendMessage("❌ No Wikipedia article found for that topic.", threadID, messageID);
            } else if (error.code === 'ECONNABORTED') {
                api.sendMessage("⏳ Wikipedia is slow. Try again in a few seconds.", threadID, messageID);
            } else if (error.message?.includes("disambiguation")) {
                api.sendMessage("❓ The topic is ambiguous. Try: `wiki Marie Curie scientist`", threadID, messageID);
            } else {
                api.sendMessage("❌ Failed to fetch Wikipedia data. Try a simpler topic.", threadID, messageID);
            }

            api.setMessageReaction("❌", messageID, () => {}, true);
        }
    }
};
