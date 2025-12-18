const axios = require("axios");
// We removed 'fs' and 'path' to prevent disk crashes in mass groups.
// We now use direct memory streams.

// Memory storage: Key = User UID, Value = { chatSessionId, lastActive }
const sessions = new Map();

module.exports = {
    name: "ai",
    aliases: ["chip", "amdus", "pai"], // Added gpt alias
    usePrefix: false,
    description: "Multi-functional AI Assistant made by Seth Asher Salinguhay. Features:\n• 🔍 Real-time Information (Search the web)\n• 👁️ Image Recognition (Analyze photos)\n• 🎨 Image Generation & Editing (Create art)\n• 📂 File Generator (Create documents & spreadsheets)",
    usage: "ai <message>",
    cooldown: 5,

    execute: async ({ api, event, args, config }) => {
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
        // CRITICAL FIX: Use key from config.json to allow easy updates
        const API_KEY = config.chippApiKey; 
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

            // --- 5. ATTACHMENT PROCESSING (Mass-Group Optimized) ---
            // Instead of parsing after sending text, we check for URLs first.
            // If we find an image/file, we send it. If not, we send text.
            
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const allUrls = aiTextResponse.match(urlRegex) || [];
            let attachmentSent = false;

            for (let rawUrl of allUrls) {
                let cleanUrl = rawUrl.replace(/[()\[\]"']/g, "");

                // Check if it's a Chipp Image or Downloadable File
                if (cleanUrl.includes("chipp-images") || cleanUrl.includes("downloadFile")) {
                    try {
                        // OPTIMIZATION: Stream directly from URL to Facebook.
                        // No saving to 'cache' folder. No disk usage. Fast & Safe.
                        const streamResponse = await axios.get(cleanUrl, { responseType: 'stream' });
                        
                        // Clean the URL out of the text so we don't spam a long link
                        const cleanText = aiTextResponse.replace(rawUrl, "").replace("()", "").trim();

                        await api.sendMessage({
                            body: cleanText || "📂 Here is your file:",
                            attachment: streamResponse.data
                        }, threadID);

                        attachmentSent = true;
                    } catch (err) {
                        console.log("Stream Error:", err.message);
                    }
                }
            }

            // If no attachment was sent, just send the text response
            if (!attachmentSent) {
                await api.sendMessage(`🤖 **AI Assistant**\n━━━━━━━━━━━━━━━━\n${aiTextResponse}`, threadID, messageID);
            }

            await api.setMessageReaction("✅", messageID);

        } catch (error) {
            console.error("AI Error:", error.message);
            await api.sendMessage("❌ The AI service is currently busy. Please try again in a moment.", threadID, messageID);
            await api.setMessageReaction("❌", messageID);
        }
    }
};
