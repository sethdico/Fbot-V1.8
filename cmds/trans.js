const axios = require("axios");

module.exports = {
    name: "translate",
    aliases: ["trans", "tr"],
    usePrefix: false,
    description: "Translate text. Type '/trans codes' for the full language list.",
    usage: "trans <lang> <text> | trans codes",
    cooldown: 3,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;

        // 1. COMPREHENSIVE LANGUAGE CODE LIST
        if (args[0]?.toLowerCase() === "codes" || args[0]?.toLowerCase() === "list") {
            const codes = [
                "af: Afrikaans", "sq: Albanian", "am: Amharic", "ar: Arabic", "hy: Armenian", "az: Azerbaijani",
                "eu: Basque", "be: Belarusian", "bn: Bengali", "bs: Bosnian", "bg: Bulgarian", "ca: Catalan",
                "ceb: Cebuano", "zh: Chinese", "hr: Croatian", "cs: Czech", "da: Danish", "nl: Dutch", 
                "en: English", "eo: Esperanto", "et: Estonian", "tl: Tagalog", "fi: Finnish", "fr: French", 
                "gl: Galician", "ka: Georgian", "de: German", "el: Greek", "gu: Gujarati", "ht: Haitian", 
                "ha: Hausa", "he: Hebrew", "hi: Hindi", "hmn: Hmong", "hu: Hungarian", "is: Icelandic", 
                "ig: Igbo", "id: Indonesian", "ga: Irish", "it: Italian", "ja: Japanese", "jw: Javanese", 
                "kn: Kannada", "kk: Kazakh", "km: Khmer", "ko: Korean", "ku: Kurdish", "lo: Lao", 
                "la: Latin", "lv: Latvian", "lt: Lithuanian", "mk: Macedonian", "mg: Malagasy", "ms: Malay", 
                "ml: Malayalam", "mt: Maltese", "mi: Maori", "mr: Marathi", "mn: Mongolian", "my: Burmese", 
                "ne: Nepali", "no: Norwegian", "ps: Pashto", "fa: Persian", "pl: Polish", "pt: Portuguese", 
                "pa: Punjabi", "ro: Romanian", "ru: Russian", "sm: Samoan", "sr: Serbian", "st: Sesotho", 
                "sn: Shona", "sd: Sindhi", "si: Sinhala", "sk: Slovak", "sl: Slovenian", "so: Somali", 
                "es: Spanish", "su: Sundanese", "sw: Swahili", "sv: Swedish", "tg: Tajik", "ta: Tamil", 
                "te: Telugu", "th: Thai", "tr: Turkish", "uk: Ukrainian", "ur: Urdu", "uz: Uzbek", 
                "vi: Vietnamese", "cy: Welsh", "xh: Xhosa", "yi: Yiddish", "yo: Yoruba", "zu: Zulu"
            ];

            let msg = "🌐 **LANGUAGE CODES LIST**\n━━━━━━━━━━━━━━━━━━\n";
            // Formatting into two columns for better mobile viewing
            for (let i = 0; i < codes.length; i += 2) {
                const col1 = codes[i].padEnd(15, " ");
                const col2 = codes[i + 1] ? codes[i + 1] : "";
                msg += `• ${col1} | ${col2}\n`;
            }
            msg += "\n━━━━━━━━━━━━━━━━━━\n💡 **Usage:** `/trans tl Hello`";
            return api.sendMessage(msg, threadID, messageID);
        }

        // 2. LOGIC FOR TRANSLATION
        let targetLang = "en"; // Default target
        let text = args.join(" ");

        if (!text) return api.sendMessage("⚠️ Usage: /trans <lang> <text>\nExample: /trans ja Hello", threadID, messageID);

        // Check if the first argument is a 2-letter or 3-letter language code
        if (args[0].length <= 3 && args.length > 1) {
            targetLang = args[0].toLowerCase();
            text = args.slice(1).join(" ");
        }

        api.setMessageReaction("🌐", messageID, () => {}, true);

        // 3. FALLBACK TRANSLATION ENGINE
        const translate = async (query, lang) => {
            // First Choice: Google Translate (Fastest)
            try {
                const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(query)}`;
                const res = await axios.get(url);
                return { 
                    text: res.data[0].map(x => x[0]).join(""), 
                    engine: "Google",
                    detected: res.data[2] || "unknown"
                };
            } catch (err) {
                // Second Choice: MyMemory (Reliable fallback)
                try {
                    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(query)}&langpair=auto|${lang}`;
                    const res = await axios.get(url);
                    if (res.data.responseStatus !== 200) throw new Error();
                    return { 
                        text: res.data.responseData.translatedText, 
                        engine: "MyMemory",
                        detected: "auto"
                    };
                } catch (err2) {
                    throw new Error("All engines failed.");
                }
            }
        };

        try {
            const result = await translate(text, targetLang);
            
            const msg = `🌐 **TRANSLATION** (${result.engine})\n` +
                        `━━━━━━━━━━━━━━━━━━\n` +
                        `📥 **In [${result.detected.toUpperCase()}]:**\n${text}\n\n` +
                        `📤 **Out [${targetLang.toUpperCase()}]:**\n${result.text}`;

            api.sendMessage(msg, threadID, messageID);
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (e) {
            api.sendMessage("❌ Translation service failed. Please check your language code or try again later.", threadID, messageID);
            api.setMessageReaction("❌", messageID, () => {}, true);
        }
    }
};
