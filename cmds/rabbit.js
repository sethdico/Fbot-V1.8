const axios = require("axios");

module.exports = {
    name: "blackbox",
    aliases: ["bb", "box"],
    usePrefix: false, // You can just type "blackbox hi"
    usage: "blackbox <question>",
    version: "2.0",
    description: "Chat with Blackbox AI (Conversational).",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID } = event;
        const prompt = args.join(" ");

        // 1. Check if the user typed something
        if (!prompt) {
            return api.sendMessage("⚠️ Please provide a message.\nUsage: blackbox <message>", threadID, messageID);
        }

        try {
            // 2. React to show it's thinking
            api.setMessageReaction("⬛", messageID, () => {}, true);

            const apiKey = "3884224f549d964644816c61b1b65d84";
            const apiUrl = "https://api.zetsu.xyz/api/blackbox";

            // 3. Request data from the API
            const response = await axios.get(apiUrl, {
                params: {
                    prompt: prompt,
                    uid: senderID, // This helps the AI remember the conversation
                    apikey: apiKey
                }
            });

            const data = response.data;

            // 4. Find the answer
            // APIs sometimes change where they put the answer, so we check a few spots
            const reply = data.response || data.result || data.message || data.answer;

            if (reply) {
                // 5. Send the result
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                const finalMsg = `⬛ **Blackbox AI**\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                return api.sendMessage(finalMsg, threadID, messageID);
            } else {
                throw new Error("API returned no message.");
            }

        } catch (error) {
            console.error("Blackbox Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ An error occurred with Blackbox AI.", threadID, messageID);
        }
    }
};
