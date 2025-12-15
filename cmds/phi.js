// cmds/phi.js
const axios = require("axios");

module.exports = {
    name: "phi",
    aliases: ["phi2", "phichat"],
    usePrefix: false,
    usage: "phi <message>",
    description: "Chat with Microsoft's Phi-2 AI. It remembers your conversation during the session!",
    cooldown: 6,
    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID } = event;
        const input = args.join(" ").trim();

        if (!input) {
            return api.sendMessage(
                "🧠 **Phi-2 AI Help**\n" +
                "Start a conversation with a smart tiny AI!\n" +
                "📌 Usage: `phi What is the meaning of life?`",
                threadID,
                messageID
            );
        }

        try {
            api.setMessageReaction("🧠", messageID, () => {}, true);

            // Use senderID as uid to keep conversation state per user
            const uid = senderID;
            const encodedQuery = encodeURIComponent(input);
            const apiUrl = `https://api.zetsu.xyz/ai/phi-2?q=${encodedQ}&uid=${uid}`;

            const response = await axios.get(apiUrl, { timeout: 25000 });

            let reply = response.data?.result || response.data?.response || response.data?.message || response.data;

            if (typeof reply === 'object') {
                // In case the API returns JSON with nested text
                reply = reply.text || reply.output || JSON.stringify(reply);
            }

            if (!reply || reply.toString().trim().length < 2) {
                throw new Error("Empty or invalid response");
            }

            // Format and send
            const finalMsg = `🧠 **Phi-2 AI**\n` +
                `━━━━━━━━━━━━━━━━\n` +
                `${reply.toString().trim()}\n` +
                `━━━━━━━━━━━━━━━━`;

            api.sendMessage(finalMsg, threadID, messageID);
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            api.setMessageReaction("❌", messageID, () => {}, true);

            if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
                return api.sendMessage(
                    "⏳ Phi-2 is taking too long. The server may be overloaded or sleeping.",
                    threadID,
                    messageID
                );
            }

            console.error("❌ Phi-2 Error:", error.message);
            return api.sendMessage(
                "❌ Phi-2 AI is currently unavailable. Try again later or use `/ai` or `/webcopilot` instead.",
                threadID,
                messageID
            );
        }
    }
};
