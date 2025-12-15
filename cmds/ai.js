// cmds/ai.js — REPLACEMENT
const axios = require("axios");

module.exports = {
    name: "ai",
    usePrefix: false,
    usage: "ai <question>",
    version: "2.1 (fixed)",
    description: "Ask a smart AI (now uses public API).",
    admin: false,
    cooldown: 5,
    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const prompt = args.join(" ");
        if (!prompt) {
            return api.sendMessage("⚠️ Please provide a question.\nUsage: ai <question>", threadID, messageID);
        }

        try {
            api.setMessageReaction("🧠", messageID, () => {}, true);

            // Public AI API (no key required)
            const response = await axios.post(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    model: "meta-llama/llama-3.2-3b-instruct:free",
                    messages: [
                        { role: "system", content: "You are a helpful assistant made by Asher Salinguhay. Keep answers short and clear." },
                        { role: "user", content: prompt }
                    ]
                },
                {
                    headers: {
                        "HTTP-Referer": "https://github.com/sethdico/Fbot-V1.8",
                        "X-Title": "Fbot AI",
                        "Content-Type": "application/json"
                    }
                }
            );

            const reply = response.data.choices?.[0]?.message?.content?.trim();
            if (reply) {
                api.sendMessage(reply, threadID, messageID);
                api.setMessageReaction("✅", messageID, () => {}, true);
            } else {
                throw new Error("Empty response");
            }
        } catch (error) {
            console.error("❌ AI Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            api.sendMessage("❌ AI is unavailable right now. Try again later.", threadID, messageID);
        }
    }
};
