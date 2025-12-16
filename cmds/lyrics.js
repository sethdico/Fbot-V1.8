const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "lyrics",
    aliases: ["ly", "sing"],
    usePrefix: false,
    usage: "lyrics <song name>",
    description: "Find song lyrics.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const title = args.join(" ");

        if (!title) return api.sendMessage("⚠️ Please provide a song title.", threadID, messageID);

        try {
            api.setMessageReaction("🎵", messageID, () => {}, true);

            const res = await axios.get(`https://betadash-api-swordslush-production.up.railway.app/lyrics-finder?title=${encodeURIComponent(title)}`);
            const data = res.data;

            // API usually returns { title: "...", artist: "...", lyrics: "...", image: "..." }
            const lyrics = data.lyrics || "No lyrics found.";
            const artist = data.artist || "Unknown";
            const songTitle = data.title || title;
            const imageUrl = data.image || data.thumb || data.thumbnail;

            let msg = `🎵 **${songTitle}**\n👤 **${artist}**\n━━━━━━━━━━━━━━━━\n${lyrics}\n━━━━━━━━━━━━━━━━`;

            // If there's an image, send it with the text
            if (imageUrl) {
                const imgPath = path.join(__dirname, "..", "cache", `lyrics_${Date.now()}.jpg`);
                
                // Ensure cache dir exists
                if (!fs.existsSync(path.dirname(imgPath))) fs.mkdirSync(path.dirname(imgPath), { recursive: true });

                const imgRes = await axios.get(imageUrl, { responseType: "stream" });
                const writer = fs.createWriteStream(imgPath);
                imgRes.data.pipe(writer);

                writer.on("finish", () => {
                    api.sendMessage({
                        body: msg,
                        attachment: fs.createReadStream(imgPath)
                    }, threadID, () => fs.unlinkSync(imgPath), messageID);
                });
            } else {
                api.sendMessage(msg, threadID, messageID);
            }
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (e) {
            console.error(e);
            api.sendMessage("❌ Lyrics not found.", threadID, messageID);
        }
    }
};
