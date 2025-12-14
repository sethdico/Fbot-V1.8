const fs = require("fs");
const axios = require("axios");
const path = require("path");

module.exports = {
    name: "say",
    aliases: ["tts", "speak"],
    usePrefix: false,
    usage: "say <text>",
    version: "2.0", // Bumped version
    cooldown: 5,
    admin: false,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;

        if (args.length === 0) {
            return api.sendMessage("⚠️ Please provide text.\nUsage: say Hello world", threadID, messageID);
        }

        const text = args.join(" ");
        // Google TTS URL (Reliable)
        // tl=en sets language to English. Change to 'tl=tl' for Tagalog if you prefer.
        const apiUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`;
        
        // Save to the main cache folder so we don't clutter the cmds folder
        const cacheDir = path.resolve(__dirname, "..", "cache");
        const filePath = path.join(cacheDir, `tts_${Date.now()}.mp3`);

        // Ensure cache folder exists
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        try {
            api.setMessageReaction("🗣️", messageID, () => {}, true);

            const response = await axios({
                url: apiUrl,
                method: "GET",
                responseType: "stream",
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                }
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            writer.on("finish", () => {
                api.setMessageReaction("✅", messageID, () => {}, true);

                const msg = {
                    body: `🗣️ Saying: "${text}"`,
                    attachment: fs.createReadStream(filePath)
                };

                api.sendMessage(msg, threadID, (err) => {
                    // Delete the file immediately after sending
                    fs.unlink(filePath, (e) => { if(e) console.error(e); });

                    if (err) {
                        console.error("❌ Error sending audio:", err);
                        api.sendMessage("❌ Failed to send audio.", threadID, messageID);
                    }
                });
            });

            writer.on("error", (err) => {
                console.error("❌ Stream Error:", err);
                api.sendMessage("❌ Failed to process audio.", threadID, messageID);
            });

        } catch (error) {
            console.error("❌ Google TTS Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            api.sendMessage("❌ Failed to generate speech.", threadID, messageID);
        }
    },
};
