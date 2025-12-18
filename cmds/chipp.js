const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Use a persistent session per senderID, but avoid scraping HTML
const userSessions = new Map();

module.exports = {
    name: "chipp",
    aliases: ["digital", "protege", "chip"],
    usePrefix: false,
    description: "Chat with Digital Protégé (Memory + Auto-Fix).",
    usage: "chipp <text> (reply to image or attach one)",
    cooldown: 5,
    execute: async ({ api, event, args, config }) => {
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

        // Use session from ws3-fca context if available
        const ctx = api.ctx;
        if (!ctx) {
            return api.sendMessage("❌ Internal error: API context missing.", threadID, messageID);
        }

        try {
            // Always use the same session ID per user (no HTML scraping)
            let sessionId = userSessions.get(senderID);
            if (!sessionId) {
                // Generate a deterministic session-like ID (not scraped)
                sessionId = `chipp-session-${senderID}-${Date.now()}`;
                userSessions.set(senderID, sessionId);
            }

            // Prepare messages
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

            // Make API request using valid headers from ws3-fca context
            const response = await axios.post(
                "https://digitalprotg-32922.chipp.ai/w/chat/api/chat",
                {
                    messages,
                    sessionId,
                    appNameId: "digitalprotg-32922"
                },
                {
                    headers: {
                        "User-Agent": ctx.globalOptions.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "Referer": "https://digitalprotg-32922.chipp.ai/w/chat/",
                        "Origin": "https://digitalprotg-32922.chipp.ai",
                        "Content-Type": "application/json"
                    },
                    timeout: 25000
                }
            );

            // Parse and clean response
            const cleanText = response.data
                .split('\n')
                .map(line => {
                    const match = line.match(/^\d+:"(.*)"$/);
                    if (match) {
                        try { return JSON.parse(`"${match[1]}"`); } catch {}
                    }
                    return "";
                })
                .filter(Boolean)
                .join("");

            if (!cleanText.trim()) {
                userSessions.delete(senderID);
                throw new Error("Empty or invalid response from Chipp AI.");
            }

            api.sendMessage(
                `🤖 **Digital Protégé**\n━━━━━━━━━━━━━━━━\n${cleanText}`,
                threadID,
                messageID
            );
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (e) {
            userSessions.delete(senderID);
            console.error("Chipp AI Error:", e.message || e);
            api.sendMessage(`❌ Error: ${e.message || "Failed to reach Chipp AI."}`, threadID, messageID);
            api.setMessageReaction("❌", messageID, () => {}, true);
        }
    }
};
