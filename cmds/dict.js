const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "dict",
    aliases: ["define", "meaning", "whatis"],
    usePrefix: false,
    usage: "dict <word>",
    version: "1.0",
    description: "Get the definition, example, and audio of a word.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const word = args.join(" ");

        if (!word) {
            return api.sendMessage("⚠️ Please provide a word to define.\nUsage: dict hello", threadID, messageID);
        }

        try {
            // 1. React while searching
            api.setMessageReaction("📖", messageID, () => {}, true);

            const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
            const response = await axios.get(apiUrl);
            const data = response.data[0];

            // 2. Extract Data
            const definition = data.meanings[0].definitions[0].definition;
            const example = data.meanings[0].definitions[0].example || "No example available.";
            const phonetic = data.phonetic || (data.phonetics[0] ? data.phonetics[0].text : "");
            
            // 3. Prepare Audio (if available)
            let audioUrl = null;
            if (data.phonetics) {
                const audioObj = data.phonetics.find(p => p.audio && p.audio !== "");
                if (audioObj) audioUrl = audioObj.audio;
            }

            // 4. Send Text Message
            const msg = `📖 **Dictionary**\n━━━━━━━━━━━━━━━━\n🗣️ **Word:** ${data.word} ${phonetic}\n\n📝 **Definition:**\n${definition}\n\n💡 **Example:**\n"${example}"\n━━━━━━━━━━━━━━━━`;

            // If there is audio, download and send it as a voice message
            if (audioUrl) {
                const filePath = path.join(__dirname, "cache", `dict_${Date.now()}.mp3`);
                
                // Ensure cache folder exists
                const cacheDir = path.join(__dirname, "cache");
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
                        body: msg,
                        attachment: fs.createReadStream(filePath)
                    }, threadID, () => fs.unlinkSync(filePath)); // Delete file after sending
                });
            } else {
                // Just send text if no audio
                api.sendMessage(msg, threadID, messageID);
            }
            
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            console.error("Dictionary Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            if (error.response && error.response.status === 404) {
                return api.sendMessage(`❌ Word not found: "${word}"`, threadID, messageID);
            }
            return api.sendMessage("❌ An error occurred while fetching the definition.", threadID, messageID);
        }
    }
};
