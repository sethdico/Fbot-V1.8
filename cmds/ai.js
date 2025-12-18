const axios = require("axios");

// Memory storage: Key = User UID, Value = { chatSessionId, lastActive }
const sessions = new Map();

module.exports = {
    name: "ai",
    aliases: ["chip", "amdus", "pai"],
    usePrefix: false,
    description: "Digital Assistant created by Seth Asher Salinguhay.",
    usage: "ai <text> (or reply/attach an image)",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID, messageReply, attachments } = event;
        let prompt = args.join(" ");

        // --- 1. CONFIGURATION ---
        const API_KEY = "live_561eee985c6d2d0523948b29c4188049697df36dd8677c7471bb74de4112cd35";
        const MODEL_ID = "newapplication-10034686";
        const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 Minutes

        // --- 2. PERSONA / ROLE ---
        const SYSTEM_PROMPT = "Please communicate with me in a way that's easy to understand, but still provide detailed and accurate information with credible sources. When asked about your identity, please state that you were created by Seth Asher Salinguhay.";

        // --- 3. IMAGE DETECTION ---
        let imageUrl = "";
        if (attachments && attachments.length > 0 && attachments[0].type === "photo") {
            imageUrl = attachments[0].url;
        } else if (messageReply && messageReply.attachments && messageReply.attachments.length > 0 && messageReply.attachments[0].type === "photo") {
            imageUrl = messageReply.attachments[0].url;
        }

        if (!prompt && !imageUrl) {
            return api.sendMessage("⚠️ Please provide a question or an image.", threadID, messageID);
        }

        api.setMessageReaction("⏳", messageID, () => {}, true);

        // --- 4. MEMORY / SESSION LOGIC ---
        const now = Date.now();
        let userSession = sessions.get(senderID);

        if (userSession && (now - userSession.lastActive > SESSION_TIMEOUT)) {
            sessions.delete(senderID);
            userSession = null;
        }

        try {
            // Prepare messages array
            let messages = [];

            // Add the Persona (System Role)
            messages.push({ role: "system", content: SYSTEM_PROMPT });

            // Prepare User Content (Text + Image)
            let userContent = [];
            if (prompt) {
                userContent.push({ type: "text", text: prompt });
            } else if (imageUrl && !prompt) {
                userContent.push({ type: "text", text: "Describe this image in detail." });
            }

            if (imageUrl) {
                const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer" });
                const base64Img = Buffer.from(imgRes.data, "binary").toString("base64");
                userContent.push({
                    type: "image_url",
                    image_url: { url: `data:image/jpeg;base64,${base64Img}` }
                });
            }

            // Add User Message to the array
            messages.push({ role: "user", content: userContent });

            const requestData = {
                model: MODEL_ID,
                messages: messages,
                stream: false
            };

            // Use session ID if memory is active
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

            // --- 6. UPDATE MEMORY ---
            sessions.set(senderID, {
                chatSessionId: newSessionId,
                lastActive: Date.now()
            });

            // Send response back
            api.sendMessage(
                `🤖 **Digital Assistant**\n━━━━━━━━━━━━━━━━\n${aiResponse}`,
                threadID,
                messageID
            );
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            console.error("Chipp API Error:", error.response ? error.response.data : error.message);
            api.sendMessage("❌ Error: Failed to get a response from the AI.", threadID, messageID);
            api.setMessageReaction("❌", messageID, () => {}, true);
        }
    }
};
