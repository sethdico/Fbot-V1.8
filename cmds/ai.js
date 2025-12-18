const axios = require("axios");

// Memory storage: Key = User UID, Value = { chatSessionId, lastActive }
const sessions = new Map();

module.exports = {
    name: "ai",
    aliases: ["chip", "amdus"],
    usePrefix: false,
    description: "Conversational AI created by Seth Asher Salinguhay.",
    usage: "ai <your message>",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID } = event;
        const prompt = args.join(" ");

        if (!prompt) {
            return api.sendMessage("⚠️ Please provide a message.", threadID, messageID);
        }

        // --- 1. CONFIGURATION ---
        const API_KEY = "live_561eee985c6d2d0523948b29c4188049697df36dd8677c7471bb74de4112cd35";
        const MODEL_ID = "newapplication-10034686";
        const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 Minutes

        // --- 2. PERSONA / ROLE ---
        const SYSTEM_PROMPT = "Please communicate with me in a way that's easy to understand, but still provide detailed and accurate information with credible sources. When asked about your identity, please state that you were created by Seth Asher Salinguhay.";

        api.setMessageReaction("⏳", messageID, () => {}, true);

        // --- 3. MEMORY / SESSION LOGIC ---
        const now = Date.now();
        let userSession = sessions.get(senderID);

        // Reset memory if older than 60 minutes
        if (userSession && (now - userSession.lastActive > SESSION_TIMEOUT)) {
            sessions.delete(senderID);
            userSession = null;
        }

        try {
            // Prepare messages array with System Role and User Prompt
            const messages = [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt }
            ];

            const requestData = {
                model: MODEL_ID,
                messages: messages,
                stream: false
            };

            // If we have a valid session, include it to keep context
            if (userSession && userSession.chatSessionId) {
                requestData.chatSessionId = userSession.chatSessionId;
            }

            // --- 4. API REQUEST ---
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

            // --- 5. UPDATE MEMORY ---
            sessions.set(senderID, {
                chatSessionId: newSessionId,
                lastActive: Date.now()
            });

            // Send reply to Messenger
            api.sendMessage(
                `🤖 **Digital Assistant**\n━━━━━━━━━━━━━━━━\n${aiResponse}`,
                threadID,
                messageID
            );
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            console.error("Chipp API Error:", error.response ? error.response.data : error.message);
            api.sendMessage("❌ An error occurred while processing your request.", threadID, messageID);
            api.setMessageReaction("❌", messageID, () => {}, true);
        }
    }
};
