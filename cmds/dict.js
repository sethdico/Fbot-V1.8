const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "dict",
    aliases: ["define", "meaning", "whatis"],
    usePrefix: false,
    usage: "dict <word>",
    version: "3.0", // Robust Version
    description: "Get the definition of a word.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const word = args.join(" ");

        if (!word) {
            return api.sendMessage("⚠️ Please provide a word.\nUsage: dict hello", threadID, messageID);
        }

        try {
            api.setMessageReaction("📖", messageID, () => {}, true);

            // 1. Fetch Data
            const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
            const response = await axios.get(apiUrl);

            // API returns an array. If empty or error, it catches below.
            const data = response.data[0];

            // 2. Extract Details safely
            const header = `📖 **${data.word}**`;
            const phonetic = data.phonetic ? `\n🗣️ ${data.phonetic}` : "";
            
            // Get first valid meaning
            const meanings = data.meanings[0];
            const partOfSpeech = meanings.partOfSpeech || "noun";
            const definition = meanings.definitions[0].definition;
            const example = meanings.definitions[0].example ? `\n\n💡 *"${meanings.definitions[0].example}"*` : "";

            const textMessage = `${header}${phonetic}\n(${partOfSpeech})\n━━━━━━━━━━━━━━━━\n📝 ${definition}${example}\n━━━━━━━━━━━━━━━━`;

            // 3. SEND TEXT FIRST (So you always get a reply)
            await api.sendMessage(textMessage, threadID);
            api.setMessageReaction("✅", messageID, () => {}, true);

            // 4. Handle Audio Separately (Optional)
            // We look for a valid audio link
            let audioUrl = null;
            if (data.phonetics) {
                // Find a phonetic object that actually has an audio link
                const audioObj = data.phonetics.find(p => p.audio && p.audio.length > 0);
                if (audioObj) audioUrl = audioObj.audio;
            }

            if (audioUrl) {
                const cacheDir = path.resolve(__dirname, "..", "cache");
                const filePath = path.join(cacheDir, `dict_${Date.now()}.mp3`);

                if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

                const audioResponse = await axios({
                    url: audioUrl,
                    method: "GET",
                    responseType: "stream"
                });

                const writer = fs.createWriteStream(filePath);
                audioResponse.data.pipe(writer);

                writer.on("finish", () => {
                    api.sendMessage({
                        body: "🔈 Pronunciation:",
                        attachment: fs.createReadStream(filePath)
                    }, threadID, () => {
                        // Cleanup file
                        fs.unlink(filePath, (e) => {}); 
                    });
                });
            }

        } catch (error) {
            console.error("Dict Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            
            if (error.response && error.response.status === 404) {
                return api.sendMessage(`❌ The word "${word}" was not found in the dictionary.`, threadID, messageID);
            }
            return api.sendMessage("❌ Could not fetch definition.", threadID, messageID);
        }
    }
};
