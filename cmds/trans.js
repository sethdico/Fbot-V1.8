const axios = require("axios");

module.exports = {
    name: "translate",
    aliases: ["trans", "tr", "tl", "bingtrans"],
    usePrefix: false,
    usage: "translate <text> | translate <lang> <text> | translate en:es text",
    version: "3.0",
    description: "Translate text between 100+ languages with auto-detection and fallback APIs",
    cooldown: 4,
    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        
        // Help message if no arguments
        if (args.length === 0) {
            return api.sendMessage(
                `🌍 **Smart Translation System**
━━━━━━━━━━━━━━━━
🔤 **Basic Usage:**
→ translate Hello world
→ translate tl Hello world
→ translate en:es Hello world

🌐 **Language Codes:**
en = English | es = Spanish | fr = French
de = German | ja = Japanese | ko = Korean
zh = Chinese | ar = Arabic | ru = Russian
tl = Tagalog | hi = Hindi | pt = Portuguese
vi = Vietnamese | th = Thai | id = Indonesian

💡 **Pro Tips:**
- Use "translate langcodes" for full list
- Try different spellings if translation fails
- The system automatically detects source language
━━━━━━━━━━━━━━━━
✅ Powered by multiple translation APIs with fallbacks`,
                threadID,
                messageID
            );
        }
        
        // Show all language codes
        if (args[0].toLowerCase() === "langcodes") {
            return api.sendMessage(
                `🌐 **Complete Language Codes**
━━━━━━━━━━━━━━━━
🇰🇷 ko • 🇯🇵 ja • 🇨🇳 zh • 🇮🇳 hi
🇷🇺 ru • 🇦🇪 ar • 🇹🇷 tr • 🇫🇷 fr
🇩🇪 de • 🇪🇸 es • 🇮🇹 it • 🇵🇹 pt
🇳🇱 nl • 🇵🇱 pl • 🇨🇿 cs • 🇭🇺 hu
🇹🇭 th • 🇻🇳 vi • 🇮🇩 id • 🇲🇾 ms
🇫🇮 fi • 🇸🇪 sv • 🇳🇴 no • 🇩🇰 da
🇬🇷 el • 🇧🇬 bg • 🇷🇴 ro • 🇺🇦 uk
🇰🇵 km • 🇱🇹 lt • 🇸🇮 sl • 🇭🇷 hr
━━━━━━━━━━━━━━━━
💡 Usage: translate <code> <text>
Example: translate tl How are you?`,
                threadID,
                messageID
            );
        }
        
        let text, sourceLang = "auto", targetLang = "en";
        
        // Parse different input formats
        // Format 1: translate en:tl text (source:target text)
        const colonMatch = args[0].match(/^([a-z]{2}):([a-z]{2})$/);
        if (colonMatch) {
            sourceLang = colonMatch[1].toLowerCase();
            targetLang = colonMatch[2].toLowerCase();
            text = args.slice(1).join(" ");
        } 
        // Format 2: translate tl text (target text)
        else if (args.length >= 2 && /^[a-z]{2}$/.test(args[0])) {
            targetLang = args[0].toLowerCase();
            text = args.slice(1).join(" ");
        } 
        // Format 3: translate text (auto-detect)
        else {
            text = args.join(" ");
        }
        
        if (!text || text.trim().length < 2) {
            return api.sendMessage("⚠️ Please provide text to translate (minimum 2 characters).", threadID, messageID);
        }
        
        // Language name mapping for better display
        const langNames = {
            "en": "English", "es": "Spanish", "fr": "French", "de": "German",
            "it": "Italian", "pt": "Portuguese", "nl": "Dutch", "ru": "Russian",
            "ja": "Japanese", "ko": "Korean", "zh": "Chinese", "ar": "Arabic",
            "hi": "Hindi", "tr": "Turkish", "th": "Thai", "vi": "Vietnamese",
            "id": "Indonesian", "ms": "Malay", "tl": "Tagalog", "pl": "Polish",
            "uk": "Ukrainian", "sv": "Swedish", "no": "Norwegian", "fi": "Finnish",
            "da": "Danish", "cs": "Czech", "hu": "Hungarian", "el": "Greek",
            "bg": "Bulgarian", "ro": "Romanian", "auto": "Auto-detected"
        };
        
        try {
            api.setMessageReaction("🌐", messageID, () => {}, true);
            const startTime = Date.now();
            
            // Primary: LibreTranslate API (more reliable)
            try {
                const response = await axios.post("https://libretranslate.de/translate", {
                    q: text,
                    source: sourceLang,
                    target: targetLang,
                    format: "text"
                }, { timeout: 15000 });
                
                const translatedText = response.data?.translatedText;
                const detectedLang = response.data?.detectedLanguage?.language || sourceLang;
                
                if (!translatedText) throw new Error("Empty response from LibreTranslate");
                
                const sourceLangName = langNames[detectedLang] || detectedLang.toUpperCase();
                const targetLangName = langNames[targetLang] || targetLang.toUpperCase();
                
                const msg = `🌍 **LibreTranslate** (Fast)
━━━━━━━━━━━━━━━━
📥 **${sourceLangName}:** ${text}
📤 **${targetLangName}:** ${translatedText}
━━━━━━━━━━━━━━━━
⏱️ Response time: ${Date.now() - startTime}ms
💡 Type "translate langcodes" for all language codes.`;
                
                api.setMessageReaction("✅", messageID, () => {}, true);
                return api.sendMessage(msg.trim(), threadID, messageID);
            } catch (primaryError) {
                console.log("🔄 LibreTranslate failed, trying Bing Translator...");
                
                // Fallback 1: Bing Translator via API
                try {
                    const bingResponse = await axios.get("https://api.carter.software/api/translate", {
                        params: {
                            text: text,
                            from: sourceLang === "auto" ? "" : sourceLang,
                            to: targetLang
                        },
                        timeout: 20000
                    });
                    
                    const translatedText = bingResponse.data?.translation;
                    const detectedLang = bingResponse.data?.detectedLanguage || sourceLang;
                    
                    if (!translatedText) throw new Error("Empty response from Bing Translator");
                    
                    const sourceLangName = langNames[detectedLang] || "Auto-detected";
                    const targetLangName = langNames[targetLang] || targetLang.toUpperCase();
                    
                    const msg = `🌍 **Bing Translator** (Fallback)
━━━━━━━━━━━━━━━━
📥 **${sourceLangName}:** ${text}
📤 **${targetLangName}:** ${translatedText}
━━━━━━━━━━━━━━━━
⏱️ Response time: ${Date.now() - startTime}ms
💡 Type "translate langcodes" for all language codes.`;
                    
                    api.setMessageReaction("✅", messageID, () => {}, true);
                    return api.sendMessage(msg.trim(), threadID, messageID);
                } catch (bingError) {
                    console.log("🔄 Bing Translator failed, trying Google Translate...");
                    
                    // Fallback 2: Google Translate
                    const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
                    const googleResponse = await axios.get(googleUrl, { timeout: 20000 });
                    
                    // Parse Google's complex response format
                    const translation = googleResponse.data?.[0]?.[0]?.[0];
                    const detectedLang = googleResponse.data?.[2] || sourceLang;
                    
                    if (!translation) throw new Error("Empty response from Google Translate");
                    
                    const sourceLangName = langNames[detectedLang] || detectedLang.toUpperCase();
                    const targetLangName = langNames[targetLang] || targetLang.toUpperCase();
                    
                    const msg = `🌍 **Google Translate** (Last Resort)
━━━━━━━━━━━━━━━━
📥 **${sourceLangName}:** ${text}
📤 **${targetLangName}:** ${translation}
━━━━━━━━━━━━━━━━
⏱️ Response time: ${Date.now() - startTime}ms
💡 Type "translate langcodes" for all language codes.`;
                    
                    api.setMessageReaction("✅", messageID, () => {}, true);
                    return api.sendMessage(msg.trim(), threadID, messageID);
                }
            }
        } catch (error) {
            console.error("❌ Translation Error:", error.message || error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            
            // Handle specific errors
            if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
                return api.sendMessage("⏳ Translation is taking too long. Please try again with a shorter text.", threadID, messageID);
            }
            
            if (error.message?.includes("400") || error.message?.includes("invalid language")) {
                return api.sendMessage("❌ Invalid language code. Type 'translate langcodes' to see valid codes.", threadID, messageID);
            }
            
            if (error.message?.includes("429") || error.message?.includes("rate limit")) {
                return api.sendMessage("⏳ Too many translation requests. Please wait 1 minute and try again.", threadID, messageID);
            }
            
            return api.sendMessage(
                `❌ **Translation Failed Completely**
━━━━━━━━━━━━━━━━
We tried multiple translation services but all failed.
━━━━━━━━━━━━━━━━
💡 Please try:
- Shorter text
- Different language codes
- Checking your internet connection
- Trying again in a few minutes`,
                threadID,
                messageID
            );
        }
    }
};
