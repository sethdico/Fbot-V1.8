module.exports = {
    name: "openrouter",
    aliases: ["or", "router"],
    usePrefix: false,
    usage: "openrouter <message> | <model_name>",
    version: "1.0",
    // 👇 NEW DESCRIPTION
    description: "The Master Key to AI! It uses GPT-4o by default, but you can switch to other brains like 'meta-llama/llama-3' or 'google/gemini' if you put a '|' after your message.",
    cooldown: 5,
    // ... keep the execute code ...
    execute: async ({ api, event, args }) => {
        /* Copy the execute code from your previous openrouter.js */
        // Just execute logic here...
        const axios = require("axios");
        const { threadID, messageID, senderID } = event;
        const input = args.join(" ");
        if (!input) return api.sendMessage("Usage: /openrouter <msg>", threadID);
        let prompt = input;
        let model = "openai/gpt-4o";
        if (input.includes("|")) {
            const parts = input.split("|");
            prompt = parts[0].trim();
            model = parts[1].trim();
        }
        try {
            api.setMessageReaction("📡", messageID, () => {}, true);
            const res = await axios.get("https://rapido.zetsu.xyz/api/open-router", {
                params: { query: prompt, uid: senderID, model: model, apikey: "rapi_566265dea6d44e16b5149ee816dcf143" }
            });
            api.setMessageReaction("✅", messageID, () => {}, true);
            api.sendMessage(`📡 **OpenRouter** (${model})\n\n${res.data.result || res.data.message}`, threadID, messageID);
        } catch (e) { api.sendMessage("❌ Error", threadID); }
    }
};
