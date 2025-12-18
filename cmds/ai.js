const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Memory storage: Key = User UID, Value = { chatSessionId, lastActive }
const sessions = new Map();

module.exports = {
    name: "ai",
    aliases: ["chip", "amdus", "pai"],
    usePrefix: false,
    description: "Multi-functional AI Assistant made by Seth Asher Salinguhay. Features:\n• 🔍 Real-time Information (Search the web)\n• 👁️ Image Recognition (Analyze photos)\n• 🎨 Image Generation & Editing (Create art)\n• 📂 File Generator (Create documents & spreadsheets)",
    usage: "ai <message>\n\nExamples:\n→ /ai who is the president? (Real-time info)\n→ /ai describe this [reply to a photo] (Recognition)\n→ /ai generate a cat photo (Generation)\n→ /ai make a doc about space (File creation)",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID, attachments, messageReply } = event;
        const userPrompt = args.join(" ");

        // --- 1. DETECT INPUT IMAGE (For Recognition) ---
        let detectedImageUrl = "";
        if (attachments?.[0]?.type === "photo") {
            detectedImageUrl = attachments[0].url;
        } else if (messageReply?.attachments?.[0]?.type === "photo") {
            detectedImageUrl = messageReply.attachments[0].url;
        }

        if (!userPrompt && !detectedImageUrl) {
            return api.sendMessage("👋 Hi! I'm your AI Assistant. You can ask me questions, send me photos to analyze, ask me to create art, or generate files like documents.\n\nTry: /ai draw a futuristic city", threadID, messageID);
        }

        // --- 2. CONFIGURATION ---
        const API_KEY = "live_561eee985c6d2d0523948b29c4188049697df36dd8677c7471bb74de4112cd35";
        const MODEL_ID = "newapplication-10034686";
        const SESSION_TIMEOUT = 60 * 60 * 1000;

        const IDENTITY_RULES = `[IDENTITY]: You are a powerful AI assistant created by Seth Asher Salinguhay. 
[CAPABILITIES]: You support image recognition, image generation/editing, real-time information retrieval, and sending files like documents.
[RULES]: Communicate in simple English. Provide detailed and accurate information. 
Always credit Seth as your creator. Seth's FB: https://www.facebook.com/seth09asher
---------------------------
User Request: ${userPrompt || "Analyze this image."}
${detectedImageUrl ? `\nImage to Analyze: ${detectedImageUrl}` : ""}`;

        await api.setMessageReaction("⏳", messageID);

        // --- 3. SESSION LOGIC ---
        const now = Date.now();
        let userSession = sessions.get(senderID);
        if (userSession && (now - userSession.lastActive > SESSION_TIMEOUT)) {
            sessions.delete(senderID);
            userSession = null;
        }

        try {
            const requestData = {
                model: MODEL_ID,
                messages: [{ role: "user", content: IDENTITY_RULES }],
                stream: false
            };

            if (userSession?.chatSessionId) {
                requestData.chatSessionId = userSession.chatSessionId;
            }

            // --- 4. API REQUEST ---
            const response = await axios.post(
                "https://app.chipp.ai/api/v1/chat/completions",
                requestData,
                { headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" } }
            );

            const result = response.data;
            const aiTextResponse = result.choices[0].message.content;
            const newSessionId = result.chatSessionId;

            sessions.set(senderID, { chatSessionId: newSessionId, lastActive: Date.now() });

            // Send text reply
            await api.sendMessage(`🤖 **AI Assistant**\n━━━━━━━━━━━━━━━━\n${aiTextResponse}`, threadID, messageID);

            // --- 5. ATTACHMENT PROCESSING (Safe Download & Upload) ---
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const allUrls = aiTextResponse.match(urlRegex) || [];
            const cachePath = path.resolve(__dirname, '..', 'cache');
            if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath, { recursive: true });

            for (let rawUrl of allUrls) {
                let cleanUrl = rawUrl.replace(/[()\[\]"']/g, "");
                let filePath = "";

                try {
                    // Re-upload Generated Images
                    if (cleanUrl.includes("chipp-images")) {
                        filePath = path.join(cachePath, `img_${Date.now()}.jpg`);
                        const res = await axios({ method: 'get', url: cleanUrl, responseType: 'stream' });
                        const writer = fs.createWriteStream(filePath);
                        res.data.pipe(writer);
                        await new Promise((resolve) => writer.on('finish', resolve));

                        await api.sendMessage({ body: "🖼️ Here is your generated image:", attachment: fs.createReadStream(filePath) }, threadID);
                    }

                    // Re-upload Generated Files/Docs
                    if (cleanUrl.includes("downloadFile")) {
                        const urlObj = new URL(cleanUrl);
                        const fileName = urlObj.searchParams.get("fileName") || `document_${Date.now()}.docx`;
                        filePath = path.join(cachePath, fileName);

                        const res = await axios({ method: 'get', url: cleanUrl, responseType: 'stream' });
                        const writer = fs.createWriteStream(filePath);
                        res.data.pipe(writer);
                        await new Promise((resolve) => writer.on('finish', resolve));

                        await api.sendMessage({ body: `📂 Generated File: ${fileName}`, attachment: fs.createReadStream(filePath) }, threadID);
                    }
                } catch (err) {
                    console.log("Attachment error (Skipped):", err.message);
                } finally {
                    // Delete local file after sending
                    if (filePath && fs.existsSync(filePath)) {
                        setTimeout(() => { try { fs.unlinkSync(filePath); } catch(e){} }, 5000);
                    }
                }
            }

            await api.setMessageReaction("✅", messageID);

        } catch (error) {
            console.error("AI Error:", error.message);
            await api.sendMessage("❌ The AI service is currently busy. Please try again in a moment.", threadID, messageID);
            await api.setMessageReaction("❌", messageID);
        }
    }
};
