const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "define",
    aliases: ["dictionary", "meaning", "def", "word", "dict"],
    usePrefix: false,
    usage: "define <word>",
    version: "3.5",
    description: "Professional dictionary with detailed definitions, examples, and audio pronunciation",
    cooldown: 5,
    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const input = args.join(" ").trim();
        
        // Help message if no word provided
        if (!input) {
            return api.sendMessage(
                `📖 **Advanced Dictionary**
━━━━━━━━━━━━━━━━
🔍 **Usage Examples:**
→ define serendipity
→ define algorithm
→ define ubiquitous
→ define "quantum mechanics"

💡 **Premium Features:**
✅ Multiple definitions with part of speech
✅ Real-world usage examples
✅ IPA pronunciation guide
✅ Audio pronunciation playback
✅ Etymology (word origin)
✅ Synonyms and antonyms
✅ Works with phrases and compound words

⚡ **Tips:**
- Use quotes for multi-word terms: define "artificial intelligence"
- Try different forms of words
- Works best with English words
━━━━━━━━━━━━━━━━
🔍 Type "define <word>" to get started`,
                threadID,
                messageID
            );
        }
        
        // Extract word from input (handle quoted phrases)
        let word;
        const quotedMatch = input.match(/"([^"]+)"|'([^']+)'/);
        if (quotedMatch) {
            word = quotedMatch[1] || quotedMatch[2];
        } else {
            word = input.split(" ")[0];
        }
        
        word = word.toLowerCase().trim();
        
        // Validate word format
        if (!/^[a-z0-9\s\-'\u2019]+$/.test(word)) {
            return api.sendMessage("⚠️ Invalid word format. Use only letters, numbers, spaces, hyphens, and apostrophes.", threadID, messageID);
        }
        
        if (word.length < 2) {
            return api.sendMessage("⚠️ Word must be at least 2 characters long.", threadID, messageID);
        }
        
        try {
            api.setMessageReaction("📖", messageID, () => {}, true);
            const startTime = Date.now();
            
            // Primary API: Dictionary API (free and reliable)
            const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
            const response = await axios.get(apiUrl, { timeout: 15000 });
            const data = response.data[0]; // Get first result
            
            if (!data) {
                throw new Error("No dictionary data found");
            }
            
            // Build comprehensive response
            let msg = `📖 **Definition of "${word}"**
━━━━━━━━━━━━━━━━`;
            
            // Add pronunciation if available
            if (data.phonetic || (data.phonetics && data.phonetics[0]?.text)) {
                const phonetic = data.phonetic || data.phonetics[0].text;
                msg += `\n🗣️ **Pronunciation:** /${phonetic.replace(/^\//, '').replace(/\/$/, '')}/`;
            }
            
            // Add etymology if available
            if (data.origin) {
                msg += `\n🏛️ **Etymology:** ${data.origin}`;
            }
            
            msg += `\n`;
            
            // Add definitions with examples
            let definitionCount = 0;
            const maxDefinitions = 3;
            
            for (const meaning of data.meanings) {
                const partOfSpeech = meaning.partOfSpeech || "unknown";
                
                for (const [index, def] of meaning.definitions.entries()) {
                    if (definitionCount >= maxDefinitions) break;
                    
                    definitionCount++;
                    msg += `\n🔸 **${partOfSpeech}** (${definitionCount})`;
                    msg += `\n📝 ${def.definition}`;
                    
                    if (def.example) {
                        msg += `\n💡 *Example:* "${def.example}"`;
                    }
                    
                    // Add synonyms/antonyms if available
                    if (def.synonyms && def.synonyms.length > 0) {
                        msg += `\n✨ **Synonyms:** ${def.synonyms.slice(0, 3).join(", ")}`;
                    }
                    
                    if (def.antonyms && def.antonyms.length > 0) {
                        msg += `\n🚫 **Antonyms:** ${def.antonyms.slice(0, 3).join(", ")}`;
                    }
                }
                
                if (definitionCount >= maxDefinitions) break;
            }
            
            // Add additional information
            let hasAudio = false;
            let audioUrl = null;
            
            // Find audio pronunciation
            if (data.phonetics) {
                const audioPhonetic = data.phonetics.find(p => p.audio && p.audio.includes('http'));
                if (audioPhonetic && audioPhonetic.audio) {
                    audioUrl = audioPhonetic.audio;
                    hasAudio = true;
                }
            }
            
            msg += `\n\n━━━━━━━━━━━━━━━━
⏱️ Response time: ${Date.now() - startTime}ms
💡 Type "define <another word>" for more definitions`;
            
            // Send text message first
            await api.sendMessage(msg, threadID, messageID);
            api.setMessageReaction("✅", messageID, () => {}, true);
            
            // Send audio pronunciation if available
            if (hasAudio && audioUrl) {
                try {
                    console.log(`🔊 Downloading audio pronunciation for "${word}"`);
                    
                    // Create cache directory if it doesn't exist
                    const cacheDir = path.resolve(__dirname, "..", "cache");
                    if (!fs.existsSync(cacheDir)) {
                        fs.mkdirSync(cacheDir, { recursive: true });
                    }
                    
                    // Download audio file
                    const filePath = path.join(cacheDir, `define_${word.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.mp3`);
                    const audioResponse = await axios({
                        url: audioUrl,
                        method: "GET",
                        responseType: "arraybuffer",
                        timeout: 20000
                    });
                    
                    // Save file
                    fs.writeFileSync(filePath, audioResponse.data);
                    
                    // Send audio message
                    const audioMessage = await api.sendMessage({
                        body: `🔊 **Audio Pronunciation for "${word}"**`,
                        attachment: fs.createReadStream(filePath)
                    }, threadID);
                    
                    console.log(`✅ Audio pronunciation sent successfully`);
                    
                    // Clean up file after sending
                    setTimeout(() => {
                        try {
                            fs.unlinkSync(filePath);
                            console.log(`🧹 Cleaned up audio file for "${word}"`);
                        } catch (e) {
                            console.warn("Cleanup warning (define audio):", e.message);
                        }
                    }, 5000);
                } catch (audioError) {
                    console.warn("Audio pronunciation failed:", audioError.message);
                    // Don't show error to user, just log it
                }
            }
            
        } catch (error) {
            console.error("❌ Define Error:", error.message || error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            
            // Handle specific errors
            if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
                return api.sendMessage("⏳ Dictionary is taking too long to respond. Please try again in 30 seconds.", threadID, messageID);
            }
            
            if (error.response?.status === 404 || error.message?.includes("not found")) {
                return api.sendMessage(
                    `❌ **Word Not Found in Dictionary**
━━━━━━━━━━━━━━━━
We couldn't find "${word}" in our dictionary database.
━━━━━━━━━━━━━━━━
💡 Try these alternatives:
→ Check spelling carefully
→ Try singular/plural forms
→ Try different word forms (e.g., "run" vs "running")
→ Use quotes for phrases: define "quantum physics"
→ Break compound words into parts
━━━━━━━━━━━━━━━━
🔍 Search term: "${word}"`,
                    threadID,
                    messageID
                );
            }
            
            if (error.message?.includes("429") || error.message?.includes("rate limit")) {
                return api.sendMessage("⏳ Too many dictionary requests. Please wait 1 minute and try again.", threadID, messageID);
            }
            
            return api.sendMessage(
                `❌ **Dictionary Service Unavailable**
━━━━━━━━━━━━━━━━
We couldn't retrieve the definition due to a technical issue.
━━━━━━━━━━━━━━━━
💡 Please try:
- Different word or spelling
- Trying again in a few minutes
━━━━━━━━━━━━━━━━
🔍 Word: "${word}"`,
                threadID,
                messageID
            );
        }
    }
};
