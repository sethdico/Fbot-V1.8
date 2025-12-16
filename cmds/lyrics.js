const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "lyrics",
    aliases: ["ly"],
    usePrefix: false,
    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const title = args.join(" ");
        if (!title) return api.sendMessage("⚠️ Enter song name.", threadID);

        try {
            api.setMessageReaction("🎵", messageID, () => {}, true);

            const res = await axios.get(`https://betadash-api-swordslush-production.up.railway.app/lyrics-finder?title=${encodeURIComponent(title)}`, {
                headers: { "User-Agent": "Mozilla/5.0" }
            });
            
            const { lyrics, artist, title: songTitle, image } = res.data;
            if (!lyrics) throw new Error("No lyrics");

            const msg = `🎵 **${songTitle || title}**\n👤 **${artist || "Unknown"}**\n━━━━━━━━━━━━━━━━\n${lyrics}`;

            // Try to send with image
            if (image) {
                try {
                    const imgPath = path.join(__dirname, "..", "cache", `ly_${Date.now()}.jpg`);
                    const imgRes = await axios.get(image, { responseType: "stream" });
                    const writer = fs.createWriteStream(imgPath);
                    imgRes.data.pipe(writer);

                    writer.on("finish", () => {
                        api.sendMessage({ body: msg, attachment: fs.createReadStream(imgPath) }, threadID, () => fs.unlinkSync(imgPath));
                    });
                    return;
                } catch (e) {} // If image fails, ignore and send text below
            }

            // Fallback: Send Text Only
            api.sendMessage(msg, threadID);
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (e) {
            api.sendMessage("❌ Lyrics not found.", threadID, messageID);
        }
    }
};
