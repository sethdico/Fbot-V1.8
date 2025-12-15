const axios = require("axios");

// 🧠 Helper to generate UUIDs (Simulates a browser session)
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Memory storage
const sessionMap = new Map();

module.exports = {
    name: "chippai",
    aliases: ["chipp", "ask", "cai"],
    usePrefix: false, 
    usage: "chippai <message> (or reply with image)",
    description: "Chat with Chipp AI. (Enhanced Connection)",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, messageReply, attachments } = event;
        
        let userMessage = args.join(" ");
        let imageUrl = null;

        // 1. Image Detection
        if (messageReply && messageReply.attachments && messageReply.attachments.length > 0) {
            if (messageReply.attachments[0].type === "photo") imageUrl = messageReply.attachments[0].url;
        } else if (attachments && attachments.length > 0) {
            if (attachments[0].type === "photo") imageUrl = attachments[0].url;
        }

        if (!userMessage && !imageUrl) {
            return api.sendMessage("⚠️ Please say something.", threadID, messageID);
        }

        // 2. Session Management
        if (!sessionMap.has(threadID)) sessionMap.set(threadID, generateUUID());
        const sessionId = sessionMap.get(threadID);
        const appSlug = "DigitalProtg-32922"; 

        // 3. Construct Message (Vercel AI SDK Standard)
        // Note: For Chipp.ai, we are careful with images. If image fails, we fall back to text.
        const msgObject = { role: "user", content: userMessage };
        
        if (imageUrl) {
            // Attempt to pass image as experimental attachment or data
            msgObject.data = { imageUrl: imageUrl };
            msgObject.experimental_attachments = [{
                url: imageUrl,
                contentType: "image/jpeg"
            }];
        }

        const payload = {
            messages: [msgObject],
            sessionId: sessionId,
            chatId: sessionId
        };

        try {
            api.setMessageReaction("⏳", messageID, () => {}, true);

            // 4. THE REQUEST (With Anti-Block Headers)
            const response = await axios({
                method: "post",
                url: "https://digitalprotg-32922.chipp.ai/api/chat",
                data: payload,
                responseType: "stream", // We need to read the data as it arrives
                headers: {
                    "Host": "digitalprotg-32922.chipp.ai",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                    "Accept": "*/*",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Origin": "https://digitalprotg-32922.chipp.ai",
                    "Referer": `https://digitalprotg-32922.chipp.ai/w/chat/${appSlug}/session/${sessionId}`,
                    "Content-Type": "application/json",
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin",
                    "Connection": "keep-alive"
                }
            });

            let fullText = "";

            // 5. Robust Stream Parsing
            response.data.on('data', chunk => {
                const textChunk = chunk.toString();
                const lines = textChunk.split('\n');
                
                for (const line of lines) {
                    if (!line.trim()) continue;

                    // Case A: Standard Vercel Stream (0:"text")
                    if (line.startsWith('0:')) {
                        try {
                            const content = JSON.parse(line.substring(2));
                            fullText += content;
                        } catch (e) {}
                    }
                    // Case B: Raw Text fallback (some proxies strip the prefix)
                    else if (!line.startsWith('{') && !line.startsWith('d:')) {
                         // Sometimes simple text comes through
                         // fullText += line; 
                    }
                }
            });

            response.data.on('end', () => {
                // If text is still empty, it might be a silent failure
                if (!fullText.trim()) {
                    console.log("Empty response from Chipp AI.");
                    return api.sendMessage("❌ The AI saw the message but returned no text. (It might be processing an image it couldn't read).", threadID, messageID);
                }

                api.setMessageReaction("✅", messageID, () => {}, true);
                
                const finalMsg = `🤖 **Chipp AI**\n━━━━━━━━━━━━━━━━\n${fullText.trim()}\n━━━━━━━━━━━━━━━━`;
                api.sendMessage(finalMsg, threadID, messageID);
            });

            // Handle stream errors
            response.data.on('error', (err) => {
                console.error("Stream Error:", err);
                api.sendMessage("❌ Connection interrupted.", threadID, messageID);
            });

        } catch (error) {
            console.error("ChippAI Connection Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);

            // DETAILED ERROR DEBUGGING FOR YOU
            if (error.response) {
                const status = error.response.status;
                if (status === 403) return api.sendMessage("❌ Access Denied (403). The website is blocking the bot's IP.", threadID, messageID);
                if (status === 404) return api.sendMessage("❌ API Not Found (404). URL might have changed.", threadID, messageID);
                if (status === 500) return api.sendMessage("❌ Server Error (500). The AI crashed (maybe the image was too large?).", threadID, messageID);
                return api.sendMessage(`❌ HTTP Error: ${status}`, threadID, messageID);
            }
            
            api.sendMessage("❌ Failed to connect. Host might be unreachable.", threadID, messageID);
        }
    }
};
