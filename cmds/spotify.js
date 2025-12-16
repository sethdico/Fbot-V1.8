const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "spotify",
    aliases: ["spt", "music", "song"],
    usePrefix: false,
    usage: "spotify <song title>",
    description: "Play music from Spotify.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const title = args.join(" ");

        if (!title) return api.sendMessage("⚠️ Please provide a song title.", threadID, messageID);

        try {
            api.setMessageReaction("🎧", messageID, () => {}, true);
            api.sendMessage(`🎧 Searching for "${title}"...`, threadID, messageID);

            // 1. Fetch Song Data
            const res = await axios.get(`https://betadash-api-swordslush-production.up.railway.app/spt?title=${encodeURIComponent(title)}`);
            const data = res.data;

            // Adjust these keys based on what the API actually returns
            // Common keys: download, audio, url, link
            const downloadUrl = data.download || data.audio || data.url || data.link;
            const songName = data.name || data.title || title;
            const artist = data.artist || "Unknown Artist";
            const coverImage = data.image || data.thumbnail || data.cover;

            if (!downloadUrl) {
                return api.sendMessage("❌ Song not found or no download link available.", threadID, messageID);
            }

            // 2. Download Audio Stream
            const cachePath = path.join(__dirname, "..", "cache", `spt_${Date.now()}.mp3`);
            // Ensure cache directory exists
            if (!fs.existsSync(path.dirname(cachePath))) fs.mkdirSync(path.dirname(cachePath), { recursive: true });

            const audioStream = await axios({
                url: downloadUrl,
                method: "GET",
                responseType: "stream"
            });

            const writer = fs.createWriteStream(cachePath);
            audioStream.data.pipe(writer);

            writer.on("finish", () => {
                // 3. Send Message with Audio Attachment
                const msgBody = `🎧 **Spotify Player**\n━━━━━━━━━━━━━━━━\n🎶 **Title:** ${songName}\n👤 **Artist:** ${artist}\n━━━━━━━━━━━━━━━━`;
                
                api.sendMessage({
                    body: msgBody,
                    attachment: fs.createReadStream(cachePath)
                }, threadID, () => {
                    // Cleanup: Delete file after sending
                    fs.unlinkSync(cachePath);
                }, messageID);
                
                api.setMessageReaction("✅", messageID, () => {}, true);
            });

            writer.on("error", () => {
                api.sendMessage("❌ Failed to download audio.", threadID, messageID);
            });

        } catch (e) {
            console.error("Spotify Error:", e);
            api.sendMessage("❌ An error occurred while fetching the song.", threadID, messageID);
        }
    }
};
