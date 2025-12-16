const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "spotify",
    aliases: ["spt"],
    usePrefix: false,
    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const title = args.join(" ");
        if (!title) return api.sendMessage("⚠️ Enter song title.", threadID);

        try {
            api.setMessageReaction("🎧", messageID, () => {}, true);
            api.sendMessage(`🎧 Searching "${title}"...`, threadID);

            const res = await axios.get(`https://betadash-api-swordslush-production.up.railway.app/spt?title=${encodeURIComponent(title)}`, {
                headers: { "User-Agent": "Mozilla/5.0" }
            });
            const data = res.data;
            const dlUrl = data.download || data.audio || data.url;

            if (!dlUrl) return api.sendMessage("❌ Song not found.", threadID);

            const cachePath = path.join(__dirname, "..", "cache", `music_${Date.now()}.mp3`);
            if (!fs.existsSync(path.dirname(cachePath))) fs.mkdirSync(path.dirname(cachePath), { recursive: true });

            const audioRes = await axios({
                url: dlUrl,
                method: "GET",
                responseType: "stream",
                headers: { "User-Agent": "Mozilla/5.0" }
            });

            const writer = fs.createWriteStream(cachePath);
            audioRes.data.pipe(writer);

            writer.on("finish", () => {
                api.sendMessage({
                    body: `🎶 **${data.name || title}**\n👤 ${data.artist || "Unknown"}`,
                    attachment: fs.createReadStream(cachePath)
                }, threadID, () => fs.unlinkSync(cachePath));
                api.setMessageReaction("✅", messageID, () => {}, true);
            });

        } catch (e) {
            api.sendMessage("❌ Spotify Error.", threadID, messageID);
        }
    }
};
