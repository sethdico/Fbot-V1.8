const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "say",
    aliases: ["tts", "speak"],
    usePrefix: false,
    description: "Convert text to speech (Audio).",
    usage: "say <text> | say -tl <text>",
    
    execute: async ({ api, event, args }) => {
        let text = args.join(" ");
        let lang = "en";

        // Check for language flag (e.g., say -tl kamusta)
        if (args[0].startsWith("-")) {
            lang = args[0].substring(1);
            text = args.slice(1).join(" ");
        }

        if (!text) return api.sendMessage("⚠️ Usage: say <text> or say -tl <text>", event.threadID);

        try {
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
            
            const filePath = path.resolve(__dirname, "../cache", `tts_${event.timestamp}.mp3`);
            
            // Download audio
            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            writer.on('finish', () => {
                api.sendMessage({
                    attachment: fs.createReadStream(filePath)
                }, event.threadID, () => fs.unlinkSync(filePath)); // Delete after sending
            });

        } catch (e) {
            api.sendMessage("❌ Error generating audio.", event.threadID);
        }
    }
};
