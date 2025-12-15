const axios = require("axios");

// Storage for the Session ID obtained from the website
const sessionMap = new Map();

module.exports = {
    name: "chippai",
    aliases: ["chipp", "chi", "pai"],
    usePrefix: false, 
    usage: "chippai <message>",
    description: "Chat with Chipp AI (Scrapes Real Session ID).",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, messageReply, attachments } = event;
        
        let userMessage = args.join(" ");
        let imageUrl = null;

        // 1. Handle Images
        if (messageReply && messageReply.attachments?.[0]?.type === "photo") {
            imageUrl = messageReply.attachments[0].url;
        } else if (attachments?.[0]?.type === "photo") {
            imageUrl = attachments[0].url;
        }

        if (!userMessage && !imageUrl) {
            return api.sendMessage("⚠️ Please say something.", threadID, messageID);
        }

        // ---------------------------------------------------------
        // 2. GET REAL SESSION ID FROM WEBSITE
        // ---------------------------------------------------------
        if (!sessionMap.has(threadID)) {
            try {
                api.setMessageReaction("🌐", messageID, () => {}, true);
                // We visit the main page and follow the redirect to get the ID
                const visitResponse = await axios.get("https://digitalprotg-32922.chipp.ai/", {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
                    }
                });

                // The axios 'visitResponse.request.res.responseUrl' holds the final URL after redirect
                const finalUrl = visitResponse.request.res.responseUrl;
                console.log(`[ChippAI] Redirected to: ${finalUrl}`);

                // Extract UUID from: .../session/5a20d870-e13b...
                const match = finalUrl.match(/session\/([a-f0-9\-]+)/);
                
                if (match && match[1]) {
                    sessionMap.set(threadID, match[1]);
                } else {
                    // Fallback: If site didn't redirect, generate one (Safety net)
                    console.log("[ChippAI] No redirect found, generating fallback ID.");
                    sessionMap.set(threadID, require('crypto').randomUUID());
                }

            } catch (e) {
                console.error("Failed to fetch session:", e.message);
                return api.sendMessage("❌ Failed to reach the website to get a Session ID.", threadID, messageID);
            }
        }

        const sessionId = sessionMap.get(threadID);
        const appSlug = "DigitalProtg-32922"; 

        // ---------------------------------------------------------
        // 3. SEND CHAT MESSAGE
        // ---------------------------------------------------------
        
        // Simplified Payload to avoid 400 Errors
        const messageObject = {
            role: "user",
            content: userMessage || "Analyze this image"
        };

        if (imageUrl) {
            messageObject.experimental_attachments = [{
                url: imageUrl,
                contentType: "image/jpeg"
            }];
        }

        try {
            api.setMessageReaction("⏳", messageID, () => {}, true);

            const response = await axios({
                method: "post",
                url: "https://digitalprotg-32922.chipp.ai/api/chat",
                data: {
                    messages: [messageObject],
                    sessionId: sessionId,
                    chatId: sessionId
                },
                responseType: "stream",
                headers: {
                    "Host": "digitalprotg-32922.chipp.ai",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
                        try {
                            const content = JSON.parse(line.substring(2));
                            fullText += content;
                        } catch (e) {}
                    }
                }
            });

            response.data.on('end', () => {
                if (!fullText.trim()) return api.sendMessage("❌ The AI is silent.", threadID, messageID);
                
                api.setMessageReaction("✅", messageID, () => {}, true);
                const finalMsg = `🤖 **Chipp AI**\n━━━━━━━━━━━━━━━━\n${fullText.trim()}\n━━━━━━━━━━━━━━━━`;
                api.sendMessage(finalMsg, threadID, messageID);
            });

        } catch (error) {
            console.error(`ChippAI Error:`, error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);

            if (error.response?.status === 400) {
                // If it's still 400, it might be the image format.
                // We clear the session map so it tries to get a FRESH session next time.
                sessionMap.delete(threadID);
                return api.sendMessage("❌ Error 400: Bad Request. I will refresh the session for your next message.", threadID, messageID);
            }
            api.sendMessage(`❌ Connection Failed: ${error.message}`, threadID, messageID);
        }
    }
};
