const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "wiki",
    aliases: ["wikipedia", "whatis", "define"],
    usePrefix: false,
    usage: "wiki <topic>",
    version: "2.1",
    description: "Search Wikipedia for a summary and image.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const query = args.join(" ");

        if (!query) return api.sendMessage("⚠️ Usage: wiki <topic>", threadID, messageID);

        try {
            api.setMessageReaction("🔍", messageID, () => {}, true);

            // 1. Search for the title using OpenSearch
            const searchRes = await axios.get("https://en.wikipedia.org/w/api.php", {
                params: { action: "opensearch", search: query, limit: 1, format: "json" }
            });

            const title = searchRes.data[1][0];
            const url = searchRes.data[3][0];

            if (!title) {
                api.setMessageReaction("❌", messageID, () => {}, true);
                return api.sendMessage("❌ No results found.", threadID, messageID);
            }

            // 2. Get details (Summary + Image)
            // FIXED: Added User-Agent header to prevent blocking
            const detailRes = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
                headers: { "User-Agent": "Fbot/2.0 (mailto:contact@example.com)" }
            });

            const data = detailRes.data;
            const summary = data.extract || "No description available.";
            const imageUrl = data.thumbnail ? data.thumbnail.source : null;

            const msgBody = `📚 **${data.title}**\n━━━━━━━━━━━━━━━━\n${summary}\n━━━━━━━━━━━━━━━━\n🔗 ${url}`;

            if (imageUrl) {
                // Download Image
                const imagePath = path.join(__dirname, "cache", `wiki_${Date.now()}.jpg`);
                const writer = fs.createWriteStream(imagePath);
                
                const imgStream = await axios({
                    url: imageUrl,
                    method: "GET",
                    responseType: "stream"
                });

                imgStream.data.pipe(writer);

                writer.on("finish", () => {
                    api.setMessageReaction("✅", messageID, () => {}, true);
                    api.sendMessage({ body: msgBody, attachment: fs.createReadStream(imagePath) }, threadID, () => {
                        fs.unlinkSync(imagePath);
                    });
                });
            } else {
                api.setMessageReaction("✅", messageID, () => {}, true);
                api.sendMessage(msgBody, threadID, messageID);
            }

        } catch (error) {
            console.error("Wiki Error:", error);
            api.sendMessage("❌ Wikipedia is blocking requests right now. Try again later.", threadID, messageID);
        }
    }
};
