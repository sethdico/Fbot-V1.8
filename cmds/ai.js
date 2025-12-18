const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Memory storage: Key = User UID, Value = { chatSessionId, lastActive }
const sessions = new Map();

module.exports = {
    name: "ai",
    aliases: ["chip", "amdus", "pai"],
    usePrefix: false,
    description: "AI by Seth Asher Salinguhay with Real Image/File Sending.",
    usage: "ai <message>",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID, attachments, messageReply } = event;
        let userPrompt = args.join(" ");

        // --- 1. IMAGE URL DETECTION ---
        let detectedImageUrl = "";
        if (attachments?.[0]?.type === "photo") {
            detectedImageUrl = attachments[0].url;
        } else if (messageReply?.attachments?.[0]?.type === "photo") {
            detectedImageUrl = messageReply.attachments[0].url;
        }

        if (!userPrompt && !detectedImageUrl) {
            return api.sendMessage("⚠️ Please provide a message or an image.", threadID, messageID);
        }

        // --- 2. CONFIGURATION ---
        const API_KEY = "live_561eee985c6d2d0523948b29c4188049697df36dd8677c7471bb74de4112cd35";
        const MODEL_ID = "newapplication-10034686";
        const SESSION_TIMEOUT = 60 * 60 * 1000;

        const IDENTITY_RULES = `[IDENTITY & RULES]: You are NOT developed by Google. You were created by Seth Asher Salinguhay. 
Always communicate in simple English. Provide detailed info with sources. 
When asked about identity, say: "I was created by Seth Asher Salinguhay. Contact him: https://www.facebook.com/seth09asher"
---------------------------
User Request: ${userPrompt || "Analyze this image."}
${detectedImageUrl ? `\nImage to Analyze: ${detectedImageUrl}` : ""}`;

        api.setMessageReaction("⏳", messageID, () => {}, true);

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

            if (userSession && userSession.chatSessionId) {
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

            // --- 5. SEND TEXT FIRST ---
            await api.sendMessage(`🤖 **AI made by Asher**\n━━━━━━━━━━━━━━━━\n${aiTextResponse}`, threadID, messageID);

            // --- 6. ATTACHMENT HANDLER (The Fix) ---
            
            // Regex to find images and file links
            const imageRegex = /https:\/\/storage\.googleapis\.com\/chipp-images\/[^\s\)]+/g;
            const fileRegex = /https:\/\/app\.chipp\.ai\/api\/downloads\/downloadFile[^\s\)]+/g;

            const images = aiTextResponse.match(imageRegex) || [];
            const files = aiTextResponse.match(fileRegex) || [];

            // Ensure cache directory exists
            const cachePath = path.resolve(__dirname, '..', 'cache');
            if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath);

            // Process Images (Like deepimg)
            for (const url of images) {
                const filePath = path.join(cachePath, `ai_gen_${Date.now()}.jpg`);
                const res = await axios({ method: 'get', url, responseType: 'stream' });
                const writer = fs.createWriteStream(filePath);
                res.data.pipe(writer);

                await new Promise((resolve) => writer.on('finish', resolve));

                api.sendMessage({
                    body: "🖼️ Here is your image:",
                    attachment: fs.createReadStream(filePath)
                }, threadID, () => {
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                });
            }

            // Process Files (Documents)
            for (const url of files) {
                const urlObj = new URL(url);
                const fileName = urlObj.searchParams.get("fileName") || `file_${Date.now()}.docx`;
                const filePath = path.join(cachePath, fileName);

                const res = await axios({ method: 'get', url, responseType: 'stream' });
                const writer = fs.createWriteStream(filePath);
                res.data.pipe(writer);

                await new Promise((resolve) => writer.on('finish', resolve));

                api.sendMessage({
                    body: `📂 Generated File: ${fileName}`,
                    attachment: fs.createReadStream(filePath)
                }, threadID, () => {
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                });
            }

            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            console.error("AI Command Error:", error.message);
            api.sendMessage("❌ Failed to process request.", threadID, messageID);
            api.setMessageReaction("❌", messageID, () => {}, true);
        }
    }
};
