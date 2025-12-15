const axios = require("axios");

module.exports = {
    name: "compound",
    aliases: ["cp", "pound", "com"],
    usePrefix: false,
    usage: "compound <question>",
    description: "Chat with Compound AI. (Personalized & Context Aware)",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID } = event;
        const prompt = args.join(" ");

        if (!prompt) {
            return api.sendMessage("⚠️ Please ask a question.\nUsage: compound <question>", threadID, messageID);
        }

        try {
            api.setMessageReaction("🤔", messageID, () => {}, true);

            // 1. Get User's Name for Personalization
            // The API supports a 'name' parameter, so the AI can say "Hello Seth!"
            let userName = "Friend"; 
            try {
                const userInfo = await api.getUserInfo(senderID);
                if (userInfo && userInfo[senderID]) {
                    userName = userInfo[senderID].name;
                }
            } catch (e) {
                // If name fetch fails, we just use "Friend"
            }

            // 2. API Request
            const apiUrl = "https://norch-project.gleeze.com/api/Compound";
            
            const response = await axios.get(apiUrl, {
                params: {
                    prompt: prompt,
                    uid: senderID, // Allows the AI to distinguish different users
                    name: userName // Passes the real name to the AI
                }
            });

            const data = response.data;
            
            // Check for various response formats
            const reply = data.message || data.response || data.result || data.content;

            if (reply) {
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                const finalMsg = `🧠 **Compound AI**\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                api.sendMessage(finalMsg, threadID, messageID);
            } else {
                throw new Error("Empty response from API");
            }

        } catch (error) {
            console.error("Compound Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ The Compound AI is currently unavailable.", threadID, messageID);
        }
    }
};
