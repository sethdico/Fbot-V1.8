const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "define",
    aliases: ["dict", "dictionary", "word", "meaning"],
    usePrefix: false,
    description: "Look up a word in the professional dictionary with audio support.",
    usage: "define <word>",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const word = args[0]?.toLowerCase();

        if (!word) return api.sendMessage("⚠️ Please provide a word to define.", threadID, messageID);

        api.setMessageReaction("📖", messageID, () => {}, true);

        // --- THE DUAL-ENGINE LOGIC ---
        const getDefinition = async (query) => {
            // Source 1: DictionaryAPI.dev (Detailed)
            try {
                const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${query}`, { timeout: 5000 });
                const data = res.data[0];
                return {
                    word: data.word,
                    phonetic: data.phonetic || "",
                    meanings: data.meanings.slice(0, 2).map(m => ({
                        pos: m.partOfSpeech,
                        definition: m.definitions[0].definition,
                        example: m.definitions[0].example || ""
                    })),
                    audio: data.phonetics.find(p => p.audio !== "")?.audio || null,
                    source: "Source Alpha"
                };
            } catch (err) {
                // Source 2: FreeDictionaryAPI.com (Reliable Fallback)
                try {
                    const res = await axios.get(`https://freedictionaryapi.com/api/v1/entries/en/${query}`, { timeout: 5000 });
                    const data = res.data;
                    const entry = data.entries[0];
                    return {
                        word: data.word,
                        phonetic: entry.pronunciations?.[0]?.text || "",
                        meanings: data.entries.slice(0, 2).map(e => ({
                            pos: e.partOfSpeech,
                            definition: e.senses[0].definition,
                            example: e.senses[0].examples?.[0] || ""
                        })),
                        audio: null,
                        source: "Source Beta"
                    };
                } catch (err2) {
                    throw new Error("Word not found in any database.");
                }
            }
        };

        try {
            const result = await getDefinition(word);

            let msg = `📖 **DICTIONARY: ${result.word.toUpperCase()}**\n`;
            msg += `━━━━━━━━━━━━━━━━━━\n`;
            if (result.phonetic) msg += `🗣️ Pronunciation: ${result.phonetic}\n\n`;

            result.meanings.forEach((m, i) => {
                msg += `🔹 [${m.pos.toUpperCase()}]\n`;
                msg += `→ ${m.definition}\n`;
                if (m.example) msg += `📝 *Ex: "${m.example}"*\n`;
                msg += `\n`;
            });

            msg += `📍 ${result.source}`;

            // Handle Audio if available
            if (result.audio) {
                const audioPath = path.resolve(__dirname, "../cache", `voice_${messageID}.mp3`);
                try {
                    const audioRes = await axios({ method: 'GET', url: result.audio, responseType: 'stream' });
                    const writer = fs.createWriteStream(audioPath);
                    audioRes.data.pipe(writer);

                    writer.on('finish', () => {
                        api.sendMessage({ body: msg, attachment: fs.createReadStream(audioPath) }, threadID, () => {
                            if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
                        }, messageID);
                    });
                } catch (audioErr) {
                    api.sendMessage(msg, threadID, messageID);
                }
            } else {
                api.sendMessage(msg, threadID, messageID);
            }

            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (e) {
            api.sendMessage(`❌ Word "${word}" not found. Try another word.`, threadID, messageID);
            api.setMessageReaction("❓", messageID, () => {}, true);
        }
    }
};
