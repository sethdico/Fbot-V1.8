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

            // Step 1: Search for the best-matching page
            const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
            const response = await axios.get(searchUrl, { timeout: 8000 });

            const data = response.data;
            if (!data || !data.title || data.type === "disambiguation") {
                throw new Error("Disambiguation or no result");
            }

            let summary = data.extract || "No summary available.";
            // Clean up extra newlines
            summary = summary.replace(/\n+/g, " ").trim();

            // Truncate if too long (Messenger has limits)
            if (summary.length > 800) {
                summary = summary.substring(0, 800).trim() + "...";
            }

            const title = data.title;
            const url = data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`;

            const message = `📘 **Wikipedia: ${title}**
━━━━━━━━━━━━━━━━
${summary}
━━━━━━━━━━━━━━━━
🔗 [Read full article](${url})`;

            api.sendMessage(message, threadID, messageID);
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            console.error("Wikipedia Error:", error.message);

            // Handle specific cases
            if (error.response && error.response.status === 404) {
                api.sendMessage("❌ No Wikipedia article found for that topic.", threadID, messageID);
            } else if (error.code === "ECONNABORTED") {
                api.sendMessage("⏳ Wikipedia is slow. Try again in a few seconds.", threadID, messageID);
            } else if (error.message?.includes("Disambiguation")) {
                api.sendMessage("❓ Too many results. Please be more specific (e.g., 'Marie Curie scientist').", threadID, messageID);
            } else {
                api.sendMessage("❌ Failed to fetch Wikipedia data.", threadID, messageID);
            }

            api.setMessageReaction("❌", messageID, () => {}, true);
        }
    }
};
