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

        // --- CONFIGURATION ---
        const API_KEY = "live_561eee985c6d2d0523948b29c4188049697df36dd8677c7471bb74de4112cd35";
        const MODEL_ID = "newapplication-10034686";
        const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 Minutes

        // --- PERSONA / ROLE (Strict Injection) ---
        const SYSTEM_PROMPT = `[IDENTITY & RULES]: You are NOT Google AI. You were created by Seth Asher Salinguhay. 
Always communicate in simple, easy-to-understand English. 
Provide detailed, accurate info with sources. 
If anyone asks about your creator or identity, you MUST say: "I was created by Seth Asher Salinguhay."
---------------------------
User Message: `;

        api.setMessageReaction("⏳", messageID, () => {}, true);

        // --- MEMORY / SESSION LOGIC ---
        const now = Date.now();
        let userSession = sessions.get(senderID);

        if (userSession && (now - userSession.lastActive > SESSION_TIMEOUT)) {
            sessions.delete(senderID);
            userSession = null;
        }

        try {
            // FORCE FIX: We combine the rules and the user prompt into one message 
            // so the AI is forced to read the identity rules every time.
            const forcedPrompt = SYSTEM_PROMPT + prompt;

            const requestData = {
                model: MODEL_ID,
                messages: [
                    { role: "user", content: forcedPrompt }
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
            console.error("Chipp API Error:", error.response ? error.response.data : error.message);
            api.sendMessage("❌ An error occurred while processing your request.", threadID, messageID);
            api.setMessageReaction("❌", messageID, () => {}, true);
        }
    }
};
