const axios = require("axios");

// Memory storage: Key = User UID, Value = { chatSessionId, lastActive }
const sessions = new Map();

module.exports = {
    name: "ai",
    aliases: ["chip", "amdus", "pai"],
    usePrefix: false,
    description: "AI by Seth Asher Salinguhay with Automatic Image Detection.",
    usage: "ai <message> or [reply to image]",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID, attachments, messageReply } = event;
        let userPrompt = args.join(" ");

        // --- 1. AUTOMATIC IMAGE URL DETECTION ---
        let detectedImageUrl = "";
        
        // Check if user uploaded an image with the command
        if (attachments && attachments.length > 0 && attachments[0].type === "photo") {
            detectedImageUrl = attachments[0].url;
        } 
        // Check if user replied to an existing image
        else if (messageReply && messageReply.attachments && messageReply.attachments.length > 0 && messageReply.attachments[0].type === "photo") {
            detectedImageUrl = messageReply.attachments[0].url;
        }

        if (!userPrompt && !detectedImageUrl) {
            return api.sendMessage("⚠️ Please provide a message or an image for me to analyze.", threadID, messageID);
        }

        // --- 2. CONFIGURATION ---
        const API_KEY = "live_561eee985c6d2d0523948b29c4188049697df36dd8677c7471bb74de4112cd35";
        const MODEL_ID = "newapplication-10034686";
        const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 Minutes

        // --- 3. IDENTITY & IMAGE INJECTION ---
        // We append the Image URL directly to the text prompt as you suggested
        const IDENTITY_RULES = `[IDENTITY & RULES]: You are NOT developed by Google. You were created by Seth Asher Salinguhay. 
Always communicate in simple, easy-to-understand English. Provide detailed, accurate info with sources. 
When asked about your identity, say: "I was created by Seth Asher Salinguhay. You can message him here: https://www.facebook.com/seth09asher"
---------------------------
User Message: ${userPrompt || "Analyze this image."}
${detectedImageUrl ? `\nImage to Analyze: ${detectedImageUrl}` : ""}`;

        api.setMessageReaction("⏳", messageID, () => {}, true);

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
                messages: [
                    { role: "user", content: IDENTITY_RULES }
                ],
                stream: false
            };

            if (userSession && userSession.chatSessionId) {
                requestData.chatSessionId = userSession.chatSessionId;
            }

            // --- 5. API REQUEST ---
            const response = await axios.post(
                "https://app.chipp.ai/api/v1/chat/completions",
                requestData,
                {
                    headers: {
                        "Authorization": `Bearer ${API_KEY}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            const result = response.data;
            const aiResponse = result.choices[0].message.content;
            const newSessionId = result.chatSessionId;

            // Save for Memory
            sessions.set(senderID, {
                chatSessionId: newSessionId,
                lastActive: Date.now()
            });

            // Send Final Result
            api.sendMessage(
                `🤖 **AI made by Asher**\n━━━━━━━━━━━━━━━━\n${aiResponse}`,
                threadID,
                messageID
            );
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            console.error("Chipp API Error:", error.response ? JSON.stringify(error.response.data) : error.message);
            api.sendMessage("❌ The AI is currently unavailable. Please try again later.", threadID, messageID);
            api.setMessageReaction("❌", messageID, () => {}, true);
        }
    }
};
