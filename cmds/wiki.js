const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "wiki",
    aliases: ["wikipedia", "whatis"],
    usePrefix: false,
    usage: "wiki <topic>",
    version: "2.1",
    description: "Fetches a summary from Wikipedia.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const query = args.join(" ");

        if (!query) return api.sendMessage("⚠️ Usage: wiki <topic>", threadID, messageID);

        try {
            api.setMessageReaction("🧠", messageID, () => {}, true);

            // 1. We MUST send a User-Agent or Wikipedia blocks us (403 Error)
            const headers = {
                "User-Agent": "Fbot-StudentProject/1.0 (Contact: yourname@example.com)" 
            };

            const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
            
            const response = await axios.get(apiUrl, { headers });
            const data = response.data;

            if (data.type === "disambiguation") {
                return api.sendMessage(`⚠️ "${query}" is too vague. Be more specific.`, threadID, messageID);
            }

            const summary = data.extract;
            const title = data.title;
            const link = data.content_urls.desktop.page;
            
            let msg = {
                body: `📚 **${title}**\n━━━━━━━━━━━━━━━━\n${summary}\n━━━━━━━━━━━━━━━━\n🔗 Source: ${link}`
            };

            // 2. Image Handling
            if (data.thumbnail && data.thumbnail.source) {
                const imageUrl = data.thumbnail.source;
                const cacheDir = path.resolve(__dirname, "..", "cache");
                const filePath = path.join(cacheDir, `wiki_${Date.now()}.jpg`);

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
                api.sendMessage(msg, threadID, messageID);
            }
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            console.error("Wiki Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            
            if (error.response && error.response.status === 404) {
                return api.sendMessage("❌ Topic not found.", threadID, messageID);
            }
            return api.sendMessage("❌ Could not fetch from Wikipedia.", threadID, messageID);
        }
    }
};
