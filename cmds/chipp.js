const axios = require("axios");

// Global storage for sessions (Persists while bot is running)
// Key: SenderID, Value: { sessionId, userAgent, lastActive }
const userSessions = new Map();

module.exports = {
    name: "chipp",
    aliases: ["digital", "protege", "chip"],
    usePrefix: false,
    description: "Chat with Digital Protégé with Memory Context (60m timeout).",
    usage: "chipp <text> (reply to image or attach one)",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, messageReply, attachments, senderID } = event;
        const query = args.join(" ");

        // 1. Handle Images (Convert to Base64)
        let imageUrl = "";
        if (attachments && attachments.length > 0 && (attachments[0].type === "photo" || attachments[0].type === "image")) {
            imageUrl = attachments[0].url;
        } else if (messageReply && messageReply.attachments && messageReply.attachments.length > 0 && (messageReply.attachments[0].type === "photo" || messageReply.attachments[0].type === "image")) {
            imageUrl = messageReply.attachments[0].url;
        }

        if (!query && !imageUrl) {
            return api.sendMessage("⚠️ Please provide text or an image.", threadID, messageID);
        }

        api.setMessageReaction("🧠", messageID, () => {}, true);

        // --- SESSION MANAGEMENT LOGIC ---
        const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 Minutes
        const currentTime = Date.now();
        let sessionData = userSessions.get(senderID);
        let isNewSession = false;

        // Check if session exists and is valid
        if (sessionData) {
            if (currentTime - sessionData.lastActive > SESSION_TIMEOUT) {
                // Session expired
                sessionData = null;
                api.sendMessage("⌛ Session expired. Starting new conversation...", threadID);
            } else {
                // Update activity time
                sessionData.lastActive = currentTime;
                userSessions.set(senderID, sessionData);
            }
        }

        try {
            // --- STEP 1: GET OR CREATE SESSION ---
            if (!sessionData) {
                isNewSession = true;
                
                // Rotating User Agents for initial connection
                const userAgents = [
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                ];
                const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
                const targetUrl = "https://digitalprotg-32922.chipp.ai/w/chat/";

                // Scrape the main page to find the hidden Session ID
                const mainPage = await axios.get(targetUrl, {
                    headers: { "User-Agent": ua }
                });

                // Extract Session ID using Regex from Next.js hydration data
                const sessionMatch = mainPage.data.match(/"chatSessionId","([a-f0-9-]+)","d"/);
                if (!sessionMatch) throw new Error("Could not extract Session ID. Site structure changed.");
                
                // Store the new session
                sessionData = {
                    sessionId: sessionMatch[1],
                    userAgent: ua,
                    lastActive: Date.now()
                };
                userSessions.set(senderID, sessionData);
            }

            // --- STEP 2: PREPARE MESSAGE PAYLOAD ---
            let messages = [];
            
            if (imageUrl) {
                const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer" });
                const base64Img = Buffer.from(imgRes.data, "binary").toString("base64");
                messages.push({
                    role: "user",
                    content: query || "Describe this image.",
                    experimental_attachments: [{
                        name: "image.jpg",
                        contentType: "image/jpeg",
                        url: `data:image/jpeg;base64,${base64Img}`
                    }]
                });
            } else {
                messages.push({ role: "user", content: query });
            }

            // --- STEP 3: SEND TO API ---
            const apiUrl = "https://digitalprotg-32922.chipp.ai/w/chat/api/chat";
            
            const response = await axios.post(apiUrl, {
                messages: messages,
                sessionId: sessionData.sessionId, // Use stored session ID
                appNameId: "digitalprotg-32922"
            }, {
                headers: {
                    "User-Agent": sessionData.userAgent, // Reuse same UA to look legit
                    "Referer": "https://digitalprotg-32922.chipp.ai/w/chat/",
                    "Origin": "https://digitalprotg-32922.chipp.ai",
                    "Content-Type": "application/json"
                },
                responseType: 'text'
            });

            // --- STEP 4: PARSE STREAM ---
            let rawText = response.data;
            const cleanText = rawText
                .split('\n')
                .map(line => {
                    const match = line.match(/^\d+:"(.*)"$/);
                    return match ? JSON.parse(`"${match[1]}"`) : ""; 
                })
                .join("");

            if (!cleanText) {
                // If scraping fails on a reused session, force clear it so next try works
                userSessions.delete(senderID);
                throw new Error("Session invalid. Please try again (Session reset).");
            }

            api.sendMessage(`🤖 **Digital Protégé**\n━━━━━━━━━━━━━━━━\n${cleanText}`, threadID, messageID);
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (e) {
            // If error occurs, remove session to prevent getting stuck in a loop
            userSessions.delete(senderID);
            console.error("Chipp AI Error:", e.message);
            api.sendMessage(`❌ Error: ${e.message}`, threadID, messageID);
            api.setMessageReaction("❌", messageID, () => {}, true);
        }
    }
};
