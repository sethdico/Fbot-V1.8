const axios = require("axios");
const crypto = require("crypto");

// 🧠 1. Browser-Compatible UUID Generator (Fallback)
function generateUUID() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

const sessionMap = new Map();

module.exports = {
    name: "chippai",
    aliases: ["chipp", "chi", "pai", "dig"],
    usePrefix: false, 
    usage: "chippai <message> (or reply to image)",
    description: "Chat with Digital Protégé AI (Scraper Mode).",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, messageReply, attachments } = event;
        
        let userMessage = args.join(" ");
        let imageUrl = null;

        // 2. Image Detection Logic
        if (messageReply && messageReply.attachments?.[0]?.type === "photo") {
            imageUrl = messageReply.attachments[0].url;
        } else if (attachments?.[0]?.type === "photo") {
            imageUrl = attachments[0].url;
        }

        if (!userMessage && !imageUrl) {
            return api.sendMessage("⚠️ Please say something or send an image.", threadID, messageID);
        }

        // 3. Session ID Logic (Scrape -> Fallback)
        if (!sessionMap.has(threadID)) {
            let newSessionId = null;
            try {
                // Try to scrape the real ID from the website redirect
                const visitResponse = await axios.get("https://digitalprotg-32922.chipp.ai/", {
                    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36" }
                });
                const finalUrl = visitResponse.request.res.responseUrl || "";
                const match = finalUrl.match(/session\/([a-f0-9\-]+)/);
                
                if (match && match[1]) newSessionId = match[1];
                else newSessionId = generateUUID();

            } catch (e) {
                newSessionId = generateUUID();
            }
            sessionMap.set(threadID, newSessionId);
        }

        const sessionId = sessionMap.get(threadID);
        const appSlug = "digitalprotg-32922"; 

        // 4. Payload Construction
        const messages = [{
            role: "user",
            content: userMessage || "Analyze this image"
        }];

        if (imageUrl) {
            messages[0].experimental_attachments = [{
                url: imageUrl,
                contentType: "image/jpeg"
            }];
        }

        try {
            api.setMessageReaction("⏳", messageID, () => {}, true);

            // 5. API Request
            const response = await axios({
                method: "post",
                url: "https://digitalprotg-32922.chipp.ai/api/chat",
                data: { messages, sessionId, chatId: sessionId },
                responseType: "stream",
                headers: {
                    "Host": "digitalprotg-32922.chipp.ai",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
                    "Referer": `https://digitalprotg-32922.chipp.ai/w/chat/${appSlug}/session/${sessionId}`,
                    "Origin": "https://digitalprotg-32922.chipp.ai",
                    "Content-Type": "application/json"
                }
            });

            let fullText = "";

            response.data.on('data', chunk => {
                const lines = chunk.toString().split('\n');
                for (const line of lines) {
                    if (line.startsWith('0:')) {
                        try { fullText += JSON.parse(line.substring(2)); } catch (e) {}
                    }
                }
            });

            response.data.on('end', () => {
                if (!fullText.trim()) return api.sendMessage("❌ AI sent no text.", threadID, messageID);
                api.setMessageReaction("✅", messageID, () => {}, true);
                api.sendMessage(`🤖 **Digital Protégé**\n━━━━━━━━━━━━━━━━\n${fullText.trim()}\n━━━━━━━━━━━━━━━━`, threadID, messageID);
            });

        } catch (error) {
            api.setMessageReaction("❌", messageID, () => {}, true);
            if (error.response?.status === 400) {
                sessionMap.delete(threadID); // Reset session on error
                return api.sendMessage("❌ Error 400: Session reset. Try again.", threadID, messageID);
            }
            api.sendMessage("❌ Connection Failed.", threadID, messageID);
        }
    }
};
