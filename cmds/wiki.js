const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "wiki",
    aliases: ["wikipedia", "whatis", "whois"],
    usePrefix: false,
    usage: "wiki <topic>",
    version: "2.0",
    description: "Fetches a summary and image from Wikipedia.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const query = args.join(" ");

        if (!query) return api.sendMessage("⚠️ Usage: wiki <topic>", threadID, messageID);

        try {
            api.setMessageReaction("🧠", messageID, () => {}, true);

            // Official Wikipedia API (No key needed)
            const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
            const response = await axios.get(apiUrl);
            const data = response.data;

            if (data.type === "disambiguation") {
                return api.sendMessage(`⚠️ "${query}" is too vague. Please be more specific.`, threadID, messageID);
            }

            const summary = data.extract;
            const title = data.title;
            const link = data.content_urls.desktop.page;
            
            let msg = {
                body: `📚 **${title}**\n━━━━━━━━━━━━━━━━\n${summary}\n━━━━━━━━━━━━━━━━\n🔗 More info: ${link}`
            };

            // If there is an image, download and attach it
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
                // If no image, just send text
                api.sendMessage(msg, threadID, messageID);
            }
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            console.error("Wiki Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            if (error.response && error.response.status === 404) {
                return api.sendMessage("❌ Topic not found on Wikipedia.", threadID, messageID);
            }
            api.sendMessage("❌ An error occurred.", threadID, messageID);
        }
    }
};
