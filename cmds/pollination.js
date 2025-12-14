const axios = require("axios");

module.exports = {
    name: "ask",
    aliases: ["poli", "pol"],
    usePrefix: false,
    usage: "ask <question>",
    version: "2.0",
    description: "Real-time pollination AI search.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const prompt = args.join(" ");

        if (!prompt) return api.sendMessage("⚠️ Usage: ask <question>", threadID, messageID);

        try {
            api.setMessageReaction("🔎", messageID, () => {}, true);

            // Pollinations is a stable, free, open-source AI API
            // We append (json=true) to get clean data
            const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&json=true`;

            const response = await axios.get(url);
            // The API returns the text directly or in a buffer
            const reply = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

            // Clean up the response just in case
            const cleanReply = reply.replace(/\\n/g, "\n").replace(/^"|"$/g, '');

            const msg = `🌐 **AI Search**\n━━━━━━━━━━━━━━━━\n${cleanReply}\n━━━━━━━━━━━━━━━━`;
            
            api.sendMessage(msg, threadID, messageID);
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            console.error("Ask Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            api.sendMessage("❌ AI is currently busy.", threadID, messageID);
        }
    }
};
