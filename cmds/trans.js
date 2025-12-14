const axios = require("axios");

module.exports = {
    name: "translate",
    aliases: ["trans", "tr"],
    usePrefix: false,
    usage: "trans <lang> <text> (e.g., trans tl hello)",
    version: "1.0",
    description: "Translate text to any language using Google.",
    cooldown: 3,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;

        if (args.length < 2) {
            return api.sendMessage("⚠️ Usage: trans <lang_code> <text>\nExample: trans tl I love you", threadID, messageID);
        }

        const targetLang = args[0]; // e.g., 'tl', 'en', 'ko', 'ja'
        const text = args.slice(1).join(" ");

        try {
            api.setMessageReaction("🔄", messageID, () => {}, true);

            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
            
            const response = await axios.get(url);
            // Google returns a nested array: [[["Translated Text", "Original", ...]]]
            const translation = response.data[0][0][0];
            const detectedLang = response.data[2];

            const msg = `🌐 **Google Translate**\n━━━━━━━━━━━━━━━━\n📥 **Input (${detectedLang}):** ${text}\n📤 **Output (${targetLang}):** ${translation}\n━━━━━━━━━━━━━━━━`;

            api.sendMessage(msg, threadID, messageID);
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            console.error("Translate Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            api.sendMessage("❌ Failed to translate.", threadID, messageID);
        }
    }
};
