const axios = require("axios");

module.exports = {
    name: "openrouter",
    aliases: ["or", "router"],
    usePrefix: false,
    usage: "openrouter <message> | <model_name>",
    version: "1.0",
    description: "The Master Key to AI! It uses GPT-4o by default, but you can switch to other brains like 'meta-llama/llama-3' or 'google/gemini' if you put a '|' after your message.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID } = event;
        const input = args.join(" ");

        if (!input) {
            return api.sendMessage("⚠️ Please provide a message.\nUsage: /openrouter <message>", threadID, messageID);
        }

        // Default settings
        let prompt = input;
        let model = "openai/gpt-4o"; // Default model
        let systemPrompt = "You are a helpful and intelligent AI assistant.";

        // ADVANCED: Allow user to specify model using "|" separator
        if (input.includes("|")) {
            const parts = input.split("|");
            prompt = parts[0].trim();
            const potentialModel = parts[1].trim();
            if (potentialModel) model = potentialModel;
        }

        try {
            api.setMessageReaction("📡", messageID, () => {}, true);

            const apiUrl = "https://rapido.zetsu.xyz/api/open-router";
            
            const response = await axios.get(apiUrl, {
                params: {
                    query: prompt,
                    uid: senderID,
                    model: model,
                    system: systemPrompt,
                    apikey: "rapi_566265dea6d44e16b5149ee816dcf143"
                }
            });

            const data = response.data;
            const reply = data.result || data.response || data.message || data.answer;

            if (reply) {
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                const finalMessage = `📡 **OpenRouter** (${model})\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                return api.sendMessage(finalMessage, threadID, messageID);
            } else {
                throw new Error("Empty response from API");
            }

        } catch (error) {
            console.error("❌ OpenRouter Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ An error occurred. The model might be unavailable.", threadID, messageID);
        }
    }
};
