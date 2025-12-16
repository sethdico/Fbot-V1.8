// cmds/lyrics.js
const axios = require("axios");

module.exports = {
    name: "lyrics",
    aliases: ["ly"],
    usePrefix: false,
    usage: "lyrics <song title>",
    description: "Get song lyrics by title.",
    cooldown: 6,
    execute: async ({ api, event, args }) => {
        const title = args.join(" ").trim();
        if (!title) {
            return api.sendMessage("🎵 Usage: lyrics 16 mirrors", event.threadID, event.messageID);
        }

        try {
            api.setMessageReaction("🎵", event.messageID, () => {}, true);
            const res = await axios.get("https://betadash-api-swordslush-production.up.railway.app/lyrics-finder", {
                params: { title },
                timeout: 20000
            });

            const lyrics = res.data?.lyrics?.trim();
            if (!lyrics) throw new Error("Not found");

            // Truncate if too long (Messenger limit ~5k chars)
            const safeLyrics = lyrics.length > 4000 ? lyrics.substring(0, 4000) + "\n\n[...truncated]" : lyrics;

            api.sendMessage(`🎵 **Lyrics: ${title}**\n━━━━━━━━━━━━━━━━\n${safeLyrics}`, event.threadID, event.messageID);
            api.setMessageReaction("✅", event.messageID, () => {}, true);
        } catch (error) {
            api.setMessageReaction("❌", event.messageID, () => {}, true);
            return api.sendMessage("❌ Lyrics not found.", event.threadID, event.messageID);
        }
    }
};
