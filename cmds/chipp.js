const axios = require("axios");

// Memory storage for user sessions
const userSessions = new Map();

module.exports = {
    name: "chipp",
    aliases: ["digital", "protege", "chip"],
    usePrefix: false,
    description: "Chat with Digital Protégé (Persistent Memory).",
    usage: "chipp <text> (reply to image or attach one)",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, messageReply, attachments, senderID } = event;
        const query = args.join(" ");

        let imageUrl = "";
        if (attachments?.[0]?.type === "photo") {
            imageUrl = attachments[0].url;
        } else if (messageReply?.attachments?.[0]?.type === "photo") {
            imageUrl = messageReply.attachments[0].url;
        }

        if (!query && !imageUrl) {
            return api.sendMessage("⚠️ Please provide text or an image.", threadID, messageID);
        }

        api.setMessageReaction("🧠", messageID, () => {}, true);

        const SESSION_TIMEOUT = 60 * 60 * 1000; 
        const now = Date.now();
        let sessionData = userSessions.get(senderID);

        if (sessionData && (now - sessionData.lastActive > SESSION_TIMEOUT)) {
            sessionData = null;
            api.sendMessage("⌛ Session expired. Resetting context...", threadID);
        }

        try {
            // STEP 1: Establish Session
            if (!sessionData) {
                const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
                const targetUrl = "https://digitalprotg-32922.chipp.ai/w/chat/";

                const mainPage = await axios.get(targetUrl, { headers: { "User-Agent": userAgent } });
                const html = mainPage.data;

                // Improved Session Scraper (Chipp.ai specific)
                let sessionIdMatch = html.match(/"chatSessionId":"([a-f0-9-]{36})"/);
                if (!sessionIdMatch) sessionIdMatch = html.match(/\\"chatSessionId\\",\\"([a-f0-9-]{36})\\"/);
                if (!sessionIdMatch) sessionIdMatch = html.match(/"session","([a-f0-9-]{36})"/);

                if (!sessionIdMatch) {
                    throw new Error("Could not find session. Try refreshing the bot.");
                }

                sessionData = {
                    sessionId: sessionIdMatch[1],
                    userAgent: userAgent,
                    lastActive: Date.now()
                };
                userSessions.set(senderID, sessionData);
            } else {
                sessionData.lastActive = Date.now();
            }

            // STEP 2: Handle Images
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

            // STEP 3: API Request
            // Note: We use the local path as detected in the HTML provided
            const response = await axios.post(
                "https://digitalprotg-32922.chipp.ai/w/chat/api/chat",
                {
                    messages,
                    sessionId: sessionData.sessionId,
                    appNameId: "digitalprotg-32922"
                },
                {
                    headers: {
                        "User-Agent": sessionData.userAgent,
                        "Referer": "https://digitalprotg-32922.chipp.ai/w/chat/",
                        "Origin": "https://digitalprotg-32922.chipp.ai",
                        "Content-Type": "application/json"
                    },
                    responseType: 'text'
                }
            );

            // STEP 4: Parse Vercel AI Stream
            const cleanText = response.data
                .split('\n')
                .map(line => {
                    const match = line.match(/^0:"(.*)"$/); // Match the text chunks
                    if (match) {
                        try { return JSON.parse(`"${match[1]}"`); } catch {}
                    }
                    return "";
                })
                .join("");

            if (!cleanText.trim()) {
                userSessions.delete(senderID);
                throw new Error("AI returned an empty response. Restarting session...");
            }

            api.sendMessage(`🤖 **Digital Protégé**\n━━━━━━━━━━━━━━━━\n${cleanText}`, threadID, messageID);
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (e) {
            userSessions.delete(senderID);
            console.error("Chipp Error:", e.message);
            api.sendMessage(`❌ Error: ${e.message}`, threadID, messageID);
            api.setMessageReaction("❌", messageID, () => {}, true);
        }
    }
};
