const axios = require("axios");

// Global storage for sessions (Persists while bot is running)
// Key: SenderID, Value: { sessionId, userAgent, lastActive }
const userSessions = new Map();

module.exports = {
    name: "chipp",
    aliases: ["digital", "protege", "chip"],
    usePrefix: false,
    description: "Chat with Digital Protégé (Memory + Auto-Fix).",
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

        // Check timeout
        if (sessionData) {
            if (currentTime - sessionData.lastActive > SESSION_TIMEOUT) {
                sessionData = null; // Expire session
                api.sendMessage("⌛ Session expired. Generating new context...", threadID);
            } else {
                sessionData.lastActive = currentTime; // Refresh timer
                userSessions.set(senderID, sessionData);
            }
        }

        try {
            // --- STEP 1: GET OR CREATE SESSION ---
            if (!sessionData) {
                // Rotating User Agents
                const userAgents = [
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15"
                ];
                const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
                const targetUrl = "https://digitalprotg-32922.chipp.ai/w/chat/";

                // 1. Fetch the HTML
                const mainPage = await axios.get(targetUrl, {
                    headers: { 
                        "User-Agent": ua,
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                        "Accept-Language": "en-US,en;q=0.5"
                    }
                });

                const html = mainPage.data;

                // 2. ROBUST EXTRACTOR (Tries 3 different patterns)
                // Pattern A: Standard Prop ["chatSessionId","UUID","d"]
                let match = html.match(/\\"chatSessionId\\",\\"([a-f0-9-]{36})\\",\\"d\\"/);
                
                // Pattern B: Flight Data Path ["session","UUID"] (Often found in the big JSON blob)
                if (!match) match = html.match(/"session","([a-f0-9-]{36})"/);
                
                // Pattern C: Unescaped Prop (Rare but possible)
                if (!match) match = html.match(/"chatSessionId","([a-f0-9-]{36})","d"/);

                if (!match || !match[1]) {
                    // console.log(html); // Uncomment for debugging if it fails again
                    throw new Error("Could not scrape Session ID. The site might be blocking the bot.");
                }
                
                const newSessionId = match[1];
                
                // Store the new session
                sessionData = {
                    sessionId: newSessionId,
                    userAgent: ua,
                    lastActive: Date.now()
                };
                userSessions.set(senderID, sessionData);
            }

            // --- STEP 2: PREPARE MESSAGE ---
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
                sessionId: sessionData.sessionId, 
                appNameId: "digitalprotg-32922"
            }, {
                headers: {
                    "User-Agent": sessionData.userAgent,
                    "Referer": "https://digitalprotg-32922.chipp.ai/w/chat/",
                    "Origin": "https://digitalprotg-32922.chipp.ai",
                    "Content-Type": "application/json"
                },
                responseType: 'text'
            });

            // --- STEP 4: CLEAN RESPONSE ---
            const rawText = response.data;
            const cleanText = rawText
                .split('\n')
                .map(line => {
                    const match = line.match(/^\d+:"(.*)"$/);
                    // Handle escaped quotes in the JSON string
                    if (match) {
                        try {
                            return JSON.parse(`"${match[1]}"`);
                        } catch (e) { return ""; }
                    }
                    return ""; 
                })
                .join("");

            if (!cleanText) {
                userSessions.delete(senderID); // Reset on empty response
                throw new Error("Empty response. Session might be invalid.");
            }

            api.sendMessage(`🤖 **Digital Protégé**\n━━━━━━━━━━━━━━━━\n${cleanText}`, threadID, messageID);
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (e) {
            userSessions.delete(senderID); // Clear session on error to retry next time
            console.error("Chipp AI Error:", e.message);
            api.sendMessage(`❌ Error: ${e.message}`, threadID, messageID);
            api.setMessageReaction("❌", messageID, () => {}, true);
        }
    }
};
