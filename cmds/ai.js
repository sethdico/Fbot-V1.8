const axios = require("axios");

// Memory storage: Key = User UID, Value = { chatSessionId, lastActive }
const sessions = new Map();

module.exports = {
    name: "ai",
    aliases: ["chip", "amdus", "vision"],
    usePrefix: false,
    description: "Conversational AI with Vision and Contact Info.",
    usage: "ai <message> or [reply to image]",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID, attachments, messageReply } = event;
        const prompt = args.join(" ");

        // --- 1. IMAGE DETECTION ---
        let imageUrl = "";
        if (attachments && attachments.length > 0 && attachments[0].type === "photo") {
            imageUrl = attachments[0].url;
        } else if (messageReply && messageReply.attachments && messageReply.attachments.length > 0 && messageReply.attachments[0].type === "photo") {
            imageUrl = messageReply.attachments[0].url;
        }

        if (!prompt && !imageUrl) {
            return api.sendMessage("⚠️ Please provide a message or an image for me to analyze.", threadID, messageID);
        }

        // --- 2. CONFIGURATION ---
        const API_KEY = "live_561eee985c6d2d0523948b29c4188049697df36dd8677c7471bb74de4112cd35";
        const MODEL_ID = "newapplication-10034686";
        const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 Minutes

        // --- 3. UPDATED IDENTITY INJECTION (With Facebook Link) ---
        const IDENTITY_RULES = `[RULES]: You are NOT developed by Google. You were created by Seth Asher Salinguhay. 
Speak in simple, easy English. Provide detailed info with credible sources. 
If anyone asks about your identity or how to contact your creator, you MUST say: 
"I was created by Seth Asher Salinguhay. You can message him here: https://www.facebook.com/seth09asher"
---------------------------
User Request: ${prompt || "Analyze this image in detail."}`;

        api.setMessageReaction("⏳", messageID, () => {}, true);

        // --- 4. MEMORY LOGIC ---
        const now = Date.now();
        let userSession = sessions.get(senderID);

        if (userSession && (now - userSession.lastActive > SESSION_TIMEOUT)) {
            sessions.delete(senderID);
            userSession = null;
        }

        try {
            let userContent = [];

            // Add the text prompt with identity rules
            userContent.push({
                type: "text",
                text: IDENTITY_RULES
            });

            // Add the image URL directly (Direct URL Method)
            if (imageUrl) {
                userContent.push({
                    type: "image_url",
                    image_url: {
                        url: imageUrl 
                    }
                });
            }

            const requestData = {
                model: MODEL_ID,
                messages: [
                    { role: "user", content: userContent }
                ],
                stream: false
            };

            // Maintain session context
            if (userSession && userSession.chatSessionId) {
                requestData.chatSessionId = userSession.chatSessionId;
            }

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
            
            if (!result.choices || result.choices.length === 0) {
                throw new Error("AI returned no results.");
            }

            const aiResponse = result.choices[0].message.content;
            const newSessionId = result.chatSessionId;

            // Save session ID for future memory
            sessions.set(senderID, {
                chatSessionId: newSessionId,
                lastActive: Date.now()
            });

            api.sendMessage(
                `🤖 **AI made by Asher**\n━━━━━━━━━━━━━━━━\n${aiResponse}`,
                threadID,
                messageID
            );
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            console.error("Chipp API Error:", error.response ? JSON.stringify(error.response.data) : error.message);
            api.sendMessage("❌ An error occurred while processing your request.", threadID, messageID);
            api.setMessageReaction("❌", messageID, () => {}, true);
        }
    }
};
