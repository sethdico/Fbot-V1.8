const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Memory storage: Key = User UID, Value = { chatSessionId, lastActive }
const sessions = new Map();

module.exports = {
    name: "ai",
    aliases: ["chip", "amdus", "pai"],
    usePrefix: false,
    description: "Powerful AI by Seth Asher Salinguhay. Supports:\n• Image generation, editing & recognition\n• Real-time web search & answers\n• File creation (text, JSON, CSV, etc.)\n• File preview (reply with “show” to see contents)",
    usage: "ai <prompt> or <replytoimage>\nReply to a generated file with “show” to preview its contents",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID, attachments, messageReply, body } = event;
        let userPrompt = args.join(" ");

        // --- NEW: Handle "show" reply ---
        if ((body?.trim().toLowerCase() === "show") && messageReply) {
            // Look for a file URL in the replied-to message
            const replyBody = messageReply.body || "";
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const urls = replyBody.match(urlRegex) || [];

            // Also check if the replied message had attachments (e.g., direct file)
            let fileUrl = "";
            if (messageReply.attachments?.[0]?.url) {
                fileUrl = messageReply.attachments[0].url;
            } else if (urls.length > 0) {
                const fileUrlMatch = urls.find(u => /\.(txt|json|csv|log|js|ts|md|html|xml|yml|yaml)$/i.test(u));
                fileUrl = fileUrlMatch || urls[0];
            }

            if (!fileUrl) {
                return api.sendMessage("📎 No file found in the replied message.", threadID, messageID);
            }

            const ext = fileUrl.split('.').pop().split(/[?#]/)[0].toLowerCase();
            const textExtensions = ['txt', 'json', 'csv', 'log', 'js', 'ts', 'md', 'html', 'xml', 'yml', 'yaml'];
            if (!textExtensions.includes(ext)) {
                return api.sendMessage(`📄 File is not a readable text file (.${ext}).`, threadID, messageID);
            }

            try {
                await api.setMessageReaction("⏳", messageID);

                const response = await axios({
                    method: 'get',
                    url: fileUrl,
                    responseType: 'text',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                        'Accept': '*/*',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Referer': 'https://www.messenger.com/',
                        'Origin': 'https://www.messenger.com'
                    },
                    maxContentLength: 1024 * 1024 // 1MB max
                });

                let content = response.data;
                if (content.length > 2000) {
                    content = content.substring(0, 1997) + "...";
                }

                await api.sendMessage(`📜 Preview of file (.${ext}):\n\n\`\`\`\n${content}\n\`\`\``, threadID, messageID);
                await api.setMessageReaction("✅", messageID);
            } catch (err) {
                console.error("File preview error:", err.message || err);
                await api.sendMessage("❌ Failed to fetch or read the file. It may be private, expired, or too large.", threadID, messageID);
                await api.setMessageReaction("❌", messageID);
            }
            return;
        }

        // --- DETECT INPUT IMAGE ---
        let detectedImageUrl = "";
        if (attachments?.[0]?.type === "photo") {
            detectedImageUrl = attachments[0].url;
        } else if (messageReply?.attachments?.[0]?.type === "photo") {
            detectedImageUrl = messageReply.attachments[0].url;
        }

        if (!userPrompt && !detectedImageUrl) {
            return api.sendMessage(
                "🤖 **AI Assistant by Seth Asher Salinguhay**\n" +
                "I can:\n" +
                "• 🖼️ Analyze or generate images\n" +
                "• 🔍 Search the web in real time\n" +
                "• 📄 Create & send files (text, JSON, CSV, etc.)\n" +
                "• 📖 Preview file contents (reply with “show”)\n\n" +
                "💡 **Usage Examples**:\n" +
                "→ `ai Draw a cat in space`\n" +
                "→ `ai What’s the weather in Tokyo?`\n" +
                "→ `ai Create a to-do list in markdown`\n" +
                "→ *(after file is sent)* reply with `show`",
                threadID,
                messageID
            );
        }

        // --- CONFIGURATION ---
        const API_KEY = "live_561eee985c6d2d0523948b29c4188049697df36dd8677c7471bb74de4112cd35";
        const MODEL_ID = "newapplication-10034686";
        const SESSION_TIMEOUT = 60 * 60 * 1000;

        // --- IDENTITY & CAPABILITIES ---
        const IDENTITY_RULES = `[IDENTITY]: You are a powerful AI assistant created by Seth Asher Salinguhay. 
[CAPABILITIES]: You support image recognition, image generation/editing, real-time information retrieval, and sending files like documents.
[RULES]: Communicate in simple English. Provide detailed and accurate information. 
When asked who made you, say: "I was created by Seth Asher Salinguhay. Message him here: https://www.facebook.com/seth09asher "
---------------------------
User Request: ${userPrompt || "Analyze this image."}
${detectedImageUrl ? `\nImage to Analyze: ${detectedImageUrl}` : ""}`;

        await api.setMessageReaction("⏳", messageID);

        // --- SESSION LOGIC ---
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

            // --- API REQUEST (NO TRAILING SPACE!) ---
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
                { body: `🤖 **AI Assistant**\n━━━━━━━━━━━━━━━━\n${aiTextResponse}` },
                threadID,
                messageID
            );

            // --- ATTACHMENT SCRAPER ---
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
                            { body: "🖼️ Generated Image:", attachment: fs.createReadStream(filePath) },
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
                            { body: `📂 File: ${fileName}`, attachment: fs.createReadStream(filePath) },
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
