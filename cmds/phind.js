const axios = require("axios");

module.exports = {
    name: "phind",
    aliases: ["search", "askphind"],
    usePrefix: false,
    usage: "phind <question>",
    version: "1.0",
    description: "Ask Phind AI (Smart Search Engine AI).",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const question = args.join(" ");

        if (!question) {
            return api.sendMessage("⚠️ Please ask a question.\nUsage: phind who created facebook", threadID, messageID);
        }

        try {
            // 1. React to show it's working
            api.setMessageReaction("🧠", messageID, () => {}, true);

            // 2. The API you provided
            const apiUrl = "https://api.ccprojectsapis-jonell.gleeze.com/api/phindai";
            
            const response = await axios.get(apiUrl, {
                params: {
                    q: question
                }
            });

            const data = response.data;
            
            // 3. Extract the answer
            // Usually these APIs put the text in 'response', 'message', or 'result'
            const reply = data.response || data.message || data.result || data.content;

            if (reply) {
                const finalMsg = `🧠 **Phind AI**\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                api.sendMessage(finalMsg, threadID, messageID);
                api.setMessageReaction("✅", messageID, () => {}, true);
            } else {
                throw new Error("Empty response from API");
            }

        } catch (error) {
            console.error("Phind Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            api.sendMessage("❌ Phind AI is currently unreachable.", threadID, messageID);
        }
    }
};
