const axios = require("axios");

module.exports = {
    name: "blackbox",
    aliases: ["bb", "box"],
    usePrefix: false,
    usage: "blackbox <question>",
    version: "1.0",
    description: "A programmer AI! It is super good at writing code and answering tech questions.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID } = event;
        const prompt = args.join(" ");

        if (!prompt) {
            return api.sendMessage("⚠️ Please provide a question.\nUsage: /blackbox <question>", threadID, messageID);
        }

        try {
            api.setMessageReaction("⏳", messageID, () => {}, true);

            const apiUrl = "https://rapido.zetsu.xyz/api/blackbox";
            
            const response = await axios.get(apiUrl, {
                params: {
                    query: prompt,
                    id: senderID,
                    apikey: "rapi_566265dea6d44e16b5149ee816dcf143"
                }
            });

            const data = response.data;
            const reply = data.message || data.response || data.result || data.data;

            if (reply) {
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                const finalMessage = `⬛ **Blackbox AI**\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                return api.sendMessage(finalMessage, threadID, messageID);
            } else {
                throw new Error("Empty response from API");
            }

        } catch (error) {
            console.error("❌ Blackbox Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ An error occurred.", threadID, messageID);
        }
    }
};
