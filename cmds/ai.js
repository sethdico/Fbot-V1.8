const axios = require("axios");

// Memory storage: Key = User UID, Value = { chatSessionId, lastActive }
const sessions = new Map();

module.exports = {
    name: "ai",
    aliases: ["chip", "amdus"],
    usePrefix: false,
    description: "Conversational AI with image recognition created by Seth Asher Salinguhay.",
    usage: "ai <message> or [reply to image]",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID, attachments, messageReply } = event;
        const prompt = args.join(" ");

        // --- 1. IMAGE HANDLING ---
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

        // --- 3. PERSONA INJECTION ---
        const IDENTITY_RULES = `[SYSTEM IDENTITY]: You are NOT Google AI. You were created by Seth Asher Salinguhay. 
Speak in simple, easy-to-understand English. Provide detailed info with sources. 
If anyone asks about your identity, say: "I was created by Seth Asher Salinguhay."
---------------------------
User Request: ${prompt || "Describe this image in detail."}`;

        api.setMessageReaction("⏳", messageID, () => {}, true);

        // --- 4. MEMORY LOGIC ---
        const now = Date.now();
        let userSession = sessions.get(senderID);

        if (userSession && (now - userSession.lastActive > SESSION_TIMEOUT)) {
            sessions.delete(senderID);
            userSession = null;
        }

        try {
            let contentArray = [];

            // Add the text (containing the identity rules + user prompt)
            contentArray.push({
                type: "text",
                text: IDENTITY_RULES
            });

            // Add the image if present (Converted to Base64)
            if (imageUrl) {
                const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer" });
                const base64Img = Buffer.from(imgRes.data, "binary").toString("base64");
                contentArray.push({
                    type: "image_url",
                    image_url: {
                        url: `data:image/jpeg;base64,${base64Img}`
                    }
                });
            }

            const requestData = {
                model: MODEL_ID,
                messages: [
                    { role: "user", content: contentArray }
                ],
                stream: false
            };

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
            const aiResponse = result.choices[0].message.content;
            const newSessionId = result.chatSessionId;

            // Update session memory
            sessions.set(senderID, {
                chatSessionId: newSessionId,
                lastActive: Date.now()
            });

            // Final message delivery
            api.sendMessage(
                `🤖 **AI made by Asher**\n━━━━━━━━━━━━━━━━\n${aiResponse}`,
                threadID,
                messageID
            );
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            console.error("Chipp Vision API Error:", error.response ? error.response.data : error.message);
            api.sendMessage("❌ An error occurred. Please ensure 'Image Recognition' is enabled in your Chipp dashboard.", threadID, messageID);
            api.setMessageReaction("❌", messageID, () => {}, true);
        }
    }
};
