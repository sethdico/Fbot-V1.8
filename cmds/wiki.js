const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "wiki",
    aliases: ["wikipedia", "whatis", "def"],
    usePrefix: false,
    usage: "wiki <topic>",
    version: "4.0", // "Old School" Version
    description: "Fetches Wikipedia summaries using the robust Action API.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const query = args.join(" ");

        if (!query) return api.sendMessage("⚠️ Usage: wiki <topic>", threadID, messageID);

        try {
            api.setMessageReaction("📚", messageID, () => {}, true);

            // 1. Use the "Action API" (older, but harder to block)
            // We ask for the extract (text) and the pageimage (picture) in one go
            const apiUrl = "https://en.wikipedia.org/w/api.php";
            const params = {
                action: "query",
                format: "json",
                prop: "extracts|pageimages",
                exintro: true,
                explaintext: true,
                pithumbsize: 600, // Image size
                redirects: 1,     // Auto-fix spelling/redirects
                titles: query,
                origin: "*"       // CORS hack
            };

            const response = await axios.get(apiUrl, { params });
            const pages = response.data.query.pages;

            // The API returns an object with a random ID key (e.g., "12345": { content... })
            // We need to grab the first object regardless of the ID
            const pageId = Object.keys(pages)[0];
            const data = pages[pageId];

            // Check if page exists (ID -1 means missing)
            if (pageId === "-1") {
                return api.sendMessage(`❌ "${query}" not found on Wikipedia.`, threadID, messageID);
            }

            const title = data.title;
            const summary = data.extract;
            
            // Clean up empty summaries
            if (!summary) {
                return api.sendMessage(`⚠️ Found "${title}", but it has no summary text available.`, threadID, messageID);
            }

            const msg = {
                body: `📚 **${title}**\n━━━━━━━━━━━━━━━━\n${summary}\n━━━━━━━━━━━━━━━━`
            };

            // 2. Handle Image (if it exists)
            if (data.thumbnail && data.thumbnail.source) {
                const imageUrl = data.thumbnail.source;
                const cacheDir = path.resolve(__dirname, "..", "cache");
                const filePath = path.join(cacheDir, `wiki_${Date.now()}.jpg`);

                // Create cache if missing
                if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

                const imageResponse = await axios({
                    url: imageUrl,
                    method: "GET",
                    responseType: "stream"
                });

                const writer = fs.createWriteStream(filePath);
                imageResponse.data.pipe(writer);

                writer.on("finish", () => {
                    msg.attachment = fs.createReadStream(filePath);
                    api.sendMessage(msg, threadID, () => fs.unlinkSync(filePath));
                });
            } else {
                // Send text only
                api.sendMessage(msg, threadID, messageID);
            }
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            console.error("Wiki Action API Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            api.sendMessage("❌ Error fetching Wikipedia data.", threadID, messageID);
        }
    }
};
