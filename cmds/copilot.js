const axios = require("axios");

module.exports = {
    name: "copilot",
    aliases: ["bing", "ms"],
    usePrefix: false,
    usage: "copilot <message> OR copilot gpt-5 <message>",
    version: "1.1",
    description: "Microsoft's smart AI! You can just chat, or ask for specific brains like 'gpt-5' (super smart) or 'think-deeper' (for hard math/riddles).",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;

        if (args.length === 0) {
            return api.sendMessage("⚠️ Please provide a message.\n\nUsage:\n/copilot <message>\n/copilot gpt-5 <message>\n/copilot think-deeper <message>", threadID, messageID);
        }

        const validModels = ["default", "think-deeper", "gpt-5"];
        let model = "default";
        let message = args.join(" ");

        // Check if first word is a model
        if (validModels.includes(args[0].toLowerCase()) && args.length > 1) {
            model = args[0].toLowerCase();
            message = args.slice(1).join(" ");
        }

        try {
            api.setMessageReaction("⏳", messageID, () => {}, true);

            const apiUrl = "https://shin-apis.onrender.com/ai/copilot";
            const response = await axios.get(apiUrl, {
                params: {
                    message: message,
                    model: model
                }
            });

            const data = response.data;
            const reply = data.result || data.response || data.answer || data.message;

            if (reply) {
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                const finalMessage = `🟦 **Microsoft Copilot** (${model})\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                return api.sendMessage(finalMessage, threadID, messageID);
            } else {
                throw new Error("Empty response");
            }

        } catch (error) {
            console.error("❌ Copilot Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ An error occurred while contacting Copilot.", threadID, messageID);
        }
    }
};
