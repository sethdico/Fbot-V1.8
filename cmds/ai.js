const axios = require("axios");

// Memory storage: Key = User UID, Value = { chatSessionId, lastActive }
const sessions = new Map();

module.exports = {
    name: "ai",
    aliases: ["newapp", "chipp"],
    usePrefix: false,
    description: "Chat with NewApplication using official Chipp API (Memory Context).",
    usage: "newapp <text>",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID } = event;
        const prompt = args.join(" ");

        if (!prompt) {
            return api.sendMessage("⚠️ Please provide a message for the AI.", threadID, messageID);
        }

        // --- CONFIGURATION ---
        const API_KEY = "live_561eee985c6d2d0523948b29c4188049697df36dd8677c7471bb74de4112cd35";
        const MODEL_ID = "newapplication-10034686";
        const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 Minutes

        // --- MEMORY / SESSION LOGIC ---
        const now = Date.now();
        let userSession = sessions.get(senderID);

        // Check if session expired
        if (userSession && (now - userSession.lastActive > SESSION_TIMEOUT)) {
            sessions.delete(senderID);
            userSession = null;
        }

        api.setMessageReaction("⏳", messageID, () => {}, true);

        try {
            // Prepare request body
            const requestData = {
                model: MODEL_ID,
                messages: [{ role: "user", content: prompt }],
                stream: false
            };

            // If we have an active session ID, include it to keep the conversation memory
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

            // Update local memory with the session ID returned by Chipp
            sessions.set(senderID, {
                chatSessionId: newSessionId,
                lastActive: Date.now()
            });

            // Send response back to Messenger
            api.sendMessage(
                `🤖 **Digital Assistant**\n━━━━━━━━━━━━━━━━\n${aiResponse}`,
                threadID,
                messageID
            );
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            console.error("Chipp API Error:", error.response ? error.response.data : error.message);
            
            let errorMsg = "❌ An error occurred while contacting the AI.";
            if (error.response && error.response.status === 401) {
                errorMsg = "❌ API Key is invalid or expired.";
            }

            api.sendMessage(errorMsg, threadID, messageID);
            api.setMessageReaction("❌", messageID, () => {}, true);
        }
    }
};
