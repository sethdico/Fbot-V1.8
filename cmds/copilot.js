const axios = require("axios");

module.exports = {
    name: "copilot",
    aliases: ["bing", "ms"],
    usePrefix: false,
    usage: "copilot <message> OR copilot <model> <message>",
    version: "1.0",
    description: "Chat with Microsoft Copilot (supports gpt-5).",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;

        if (args.length === 0) {
            return api.sendMessage("⚠️ Please provide a message.\n\nUsage:\n/copilot <message>\n/copilot gpt-5 <message>\n/copilot think-deeper <message>", threadID, messageID);
        }

        // Logic to detect if user wants a specific model
        const validModels = ["default", "think-deeper", "gpt-5"];
        let model = "default";
        let message = args.join(" ");

        // Check if the first word is a valid model name
        if (validModels.includes(args[0].toLowerCase()) && args.length > 1) {
            model = args[0].toLowerCase();
            message = args.slice(1).join(" "); // Remove the model name from the message
        }

        try {
            // 1. React to indicate processing
            api.setMessageReaction("⏳", messageID, () => {}, true);

            // 2. Call the API
            const apiUrl = "https://shin-apis.onrender.com/ai/copilot";
            const response = await axios.get(apiUrl, {
                params: {
                    message: message,
                    model: model
                }
            });

            const data = response.data;
            // The API response key might vary, usually it's 'result', 'response', or 'answer'
            const reply = data.result || data.response || data.answer || data.message;

            if (reply) {
                // 3. Send the result
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                const finalMessage = `🟦 **Microsoft Copilot** (${model})\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                return api.sendMessage(finalMessage, threadID, messageID);
            } else {
                throw new Error("Empty response from API");
            }

        } catch (error) {
            console.error("❌ Copilot Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ An error occurred while contacting Copilot.", threadID, messageID);
        }
    }
};
