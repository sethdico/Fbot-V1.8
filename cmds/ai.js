const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Memory storage: Key = User UID, Value = { chatSessionId, lastActive }
const sessions = new Map();

module.exports = {
    name: "ai",
    aliases: ["chip", "amdus", "pai"],
    usePrefix: false,
    description: "Multi-functional AI by Seth Asher Salinguhay. Image recognition/generation/edit, real-time information and sends files such as documents.",
    usage: "ai <message> / ai <replytoimage>",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID, attachments, messageReply } = event;
        let userPrompt = args.join(" ");

        // --- 1. DETECT INPUT IMAGE ---
        let detectedImageUrl = "";
        if (attachments?.[0]?.type === "photo") {
            detectedImageUrl = attachments[0].url;
        } else if (messageReply?.attachments?.[0]?.type === "photo") {
            detectedImageUrl = messageReply.attachments[0].url;
        }

        if (!userPrompt && !detectedImageUrl) {
            return api.sendMessage("⚠️ How can I help? You can ask me to generate images, analyze photos, search the web, or create files.", threadID, messageID);
        }

        // --- 2. CONFIGURATION ---
        const API_KEY = "live_561eee985c6d2d0523948b29c4188049697df36dd8677c7471bb74de4112cd35";
        const MODEL_ID = "newapplication-10034686";
        const SESSION_TIMEOUT = 60 * 60 * 1000;

        // --- 3. IDENTITY & CAPABILITIES ---
        const IDENTITY_RULES = `[IDENTITY]: You are a powerful AI assistant created by Seth Asher Salinguhay. 
[CAPABILITIES]: You support image recognition, image generation/editing, real-time information retrieval, and sending files like documents.
[RULES]: Communicate in simple English. Provide detailed and accurate information. 
When asked who made you, say: "I was created by Seth Asher Salinguhay. Message him here: https://www.facebook.com/seth09asher "
---------------------------
User Request: ${userPrompt || "Analyze this image."}
${detectedImageUrl ? `\nImage to Analyze: ${detectedImageUrl}` : ""}`;

        await api.setMessageReaction("⏳", messageID);

        // --- 4. SESSION LOGIC ---
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

            // --- 5. API REQUEST ---
            const response = await axios.post(
                "https://app.chipp.ai/api/v1/chat/completions",
                requestData,
                { headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" } }
            );

            const result = response.data;
            const aiTextResponse = result.choices[0].message.content;
            const newSessionId = result.chatSessionId;

            sessions.set(senderID, { chatSessionId: newSessionId, lastActive: Date.now() });

            // Send text reply first
            await api.sendMessage(
                {
                    body: `🤖 **AI Assistant**\n━━━━━━━━━━━━━━━━\n${aiTextResponse}`
                },
                threadID,
                messageID // reply to original message
            );

            // --- 6. ATTACHMENT SCRAPER ---
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const allUrls = aiTextResponse.match(urlRegex) || [];
            const cachePath = path.resolve(__dirname, '..', 'cache');
            if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath);

            for (let rawUrl of allUrls) {
                let cleanUrl = rawUrl.replace(/[()\[\]"']/g, "");

                // Handle Images
                if (cleanUrl.includes("chipp-images")) {
                    const filePath = path.join(cachePath, `img_${Date.now()}.jpg`);
                    try {
                        const res = await axios({ method: 'get', url: cleanUrl, responseType: 'stream' });
                        const writer = fs.createWriteStream(filePath);
                        res.data.pipe(writer);
                        await new Promise((resolve, reject) => {
                            writer.on('finish', resolve);
                            writer.on('error', reject);
                        });

                        await api.sendMessage(
                            {
                                body: "🖼️ Generated Image:",
                                attachment: fs.createReadStream(filePath)
                            },
                            threadID,
                            messageID
                        );
                    } catch (e) {
                        console.error("Image Send Error:", e);
                    } finally {
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    }
                }

                // Handle Documents/Files
                if (cleanUrl.includes("downloadFile")) {
                    try {
                        const urlObj = new URL(cleanUrl);
                        const fileName = urlObj.searchParams.get("fileName") || `document_${Date.now()}.docx`;
                        const filePath = path.join(cachePath, fileName);

                        const res = await axios({ method: 'get', url: cleanUrl, responseType: 'stream' });
                        const writer = fs.createWriteStream(filePath);
                        res.data.pipe(writer);
                        await new Promise((resolve, reject) => {
                            writer.on('finish', resolve);
                            writer.on('error', reject);
                        });

                        await api.sendMessage(
                            {
                                body: `📂 File: ${fileName}`,
                                attachment: fs.createReadStream(filePath)
                            },
                            threadID,
                            messageID
                        );
                    } catch (e) {
                        console.error("File Send Error:", e);
                    } finally {
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    }
                }
            }

            await api.setMessageReaction("✅", messageID);

        } catch (error) {
            console.error("AI Command Error:", error?.response?.data || error.message || error);
            await api.sendMessage("❌ Service unavailable. Please try again later.", threadID, messageID);
            await api.setMessageReaction("❌", messageID);
        }
    }
};
