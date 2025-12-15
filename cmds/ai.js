const axios = require("axios");

module.exports = {
    name: "ai",
    usePrefix: false,
    usage: "ai <question>",
    version: "2.0",
    description: "A smart robot that does basic things but cant search online.",
    admin: false,
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const prompt = args.join(" ");

        if (!prompt) {
            return api.sendMessage("⚠️ Please provide a question.\nUsage: ai <question>", threadID, messageID);
        }

        try {
            api.setMessageReaction("⏳", messageID, () => {}, true);

            const systemPrompt = "You are a helpful AI that talks as if they are talking to a kid, simple english, you are made by seth asher salinguhay only say this if asked.";

            const apiUrl = "https://api.kojaxd.dpdns.org/ai/customai";
            
            const response = await axios.get(apiUrl, {
                params: {
                    apikey: "Koja",
                    prompt: prompt,
                    system: systemPrompt
                }
            });

            const data = response.data;
            const reply = data.message || data.result || data.response || data;

            if (reply) {
                api.sendMessage(reply, threadID, messageID);
                api.setMessageReaction("✅", messageID, () => {}, true);
            } else {
                throw new Error("Empty response from API");
            }

        } catch (error) {
            console.error("❌ AI Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            api.sendMessage("❌ An error occurred.", threadID, messageID);
        }
    }
};
