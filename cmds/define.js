const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "define",
    aliases: ["dict", "dictionary", "word"],
    usePrefix: false,
    description: "Look up a word in the professional dictionary.",
    usage: "define <word>",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const word = args[0]?.toLowerCase();

        if (!word) return api.sendMessage("⚠️ Please provide a word to define.", threadID, messageID);

        api.setMessageReaction("📖", messageID, () => {}, true);

        try {
            const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            const data = res.data[0];

            let msg = `📖 **DICTIONARY: ${word.toUpperCase()}**\n`;
            msg += `━━━━━━━━━━━━━━━━━━\n`;
            if (data.phonetic) msg += `🗣️ Pronunciation: ${data.phonetic}\n\n`;

            // Limit to top 2 meanings to keep it readable on mobile
            data.meanings.slice(0, 2).forEach((m, i) => {
                msg += `🔹 [${m.partOfSpeech.toUpperCase()}]\n`;
                msg += `→ ${m.definitions[0].definition}\n`;
                if (m.definitions[0].example) {
                    msg += `📝 *Ex: "${m.definitions[0].example}"*\n`;
                }
                msg += `\n`;
            });

            // Handle Audio Pronunciation
            const audioObj = data.phonetics.find(p => p.audio !== "");
            if (audioObj) {
                const audioPath = path.resolve(__dirname, "../cache", `voice_${messageID}.mp3`);
                const response = await axios({
                    method: 'GET',
                    url: audioObj.audio,
                    responseType: 'stream'
                });
                
                const writer = fs.createWriteStream(audioPath);
                response.data.pipe(writer);

                writer.on('finish', () => {
                    api.sendMessage({ body: msg, attachment: fs.createReadStream(audioPath) }, threadID, () => {
                        fs.unlinkSync(audioPath);
                    }, messageID);
                });
            } else {
                api.sendMessage(msg, threadID, messageID);
            }

        } catch (e) {
            api.sendMessage(`❌ Could not find definition for "${word}".`, threadID, messageID);
        }
    }
};
