const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "wiki",
    aliases: ["whatis", "define", "ddg"],
    usePrefix: false,
    usage: "wiki <topic>",
    version: "3.0",
    description: "Fetches wiki summary.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const query = args.join(" ");

        if (!query) return api.sendMessage("⚠️ Usage: wiki <topic>", threadID, messageID);

        try {
            api.setMessageReaction("🦆", messageID, () => {}, true);

            // DuckDuckGo API (Safe, reliable, allows bots)
            // format=json makes it computer-readable
            const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;
            
            const response = await axios.get(apiUrl);
            const data = response.data;

            // Check if we got an abstract (summary)
            if (!data.AbstractText) {
                return api.sendMessage(`⚠️ No instant summary found for "${query}". Try a different spelling.`, threadID, messageID);
            }

            const summary = data.AbstractText;
            const title = data.Heading;
            const link = data.AbstractURL;
            const imageUrl = data.Image; // DuckDuckGo provides an image URL sometimes

            let msg = {
                body: `🦆 **${title}**\n━━━━━━━━━━━━━━━━\n${summary}\n━━━━━━━━━━━━━━━━\n🔗 ${link}`
            };

            // Handle Image (DuckDuckGo images are sometimes relative URLs)
            if (imageUrl && !imageUrl.includes("placeholder")) {
                // Fix relative URLs (e.g., "/i/..." becomes "https://duckduckgo.com/i/...")
                const fullImageUrl = imageUrl.startsWith("http") ? imageUrl : `https://duckduckgo.com${imageUrl}`;
                
                const cacheDir = path.resolve(__dirname, "..", "cache");
                const filePath = path.join(cacheDir, `wiki_${Date.now()}.jpg`);

                if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

                try {
                    const imageResponse = await axios({
                        url: fullImageUrl,
                        method: "GET",
                        responseType: "stream"
                    });

                    const writer = fs.createWriteStream(filePath);
                    imageResponse.data.pipe(writer);

                    writer.on("finish", () => {
                        msg.attachment = fs.createReadStream(filePath);
                        api.sendMessage(msg, threadID, () => fs.unlinkSync(filePath));
                    });
                } catch (e) {
                    // If image fails, just send text
                    api.sendMessage(msg, threadID, messageID);
                }
            } else {
                api.sendMessage(msg, threadID, messageID);
            }
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            console.error("DDG Wiki Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            api.sendMessage("❌ Error fetching data.", threadID, messageID);
        }
    }
};
