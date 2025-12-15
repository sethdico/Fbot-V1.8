// cmds/phi.js
const axios = require("axios");

module.exports = {
    name: "phi",
    aliases: ["phi2", "phichat"],
    usePrefix: false,
    usage: "phi <message>",
    description: "Chat with Microsoft's Phi-2 AI (tiny but smart!).",
    cooldown: 6,
    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID } = event;
        const input = args.join(" ").trim();

        if (!input) {
            return api.sendMessage(
                "🧠 **Phi-2 AI Help**\nStart a conversation with a smart tiny AI!\n📌 Usage: `phi What is quantum computing?`",
                threadID,
                messageID
            );
        }

        try {
            api.setMessageReaction("🧠", messageID, () => {}, true);

            const response = await axios.get(
                "https://api.zetsu.xyz/ai/phi-2",
                {
                    params: {
                        q: input,
                        uid: senderID,
                        apikey: "3884224f549d964644816c61b1b65d84" // ✅ Your key
                    },
                    timeout: 25000,
                    headers: { "User-Agent": "Fbot-V1.8" }
                }
            );

            let reply = response.data?.result || response.data?.response || response.data?.message || response.data;
            if (typeof reply === "object") reply = JSON.stringify(reply);
            reply = (reply || "").toString().trim();

            if (!reply || reply.length < 2) {
                throw new Error("Empty response");
            }

            const finalMsg = `🧠 **Phi-2 AI**\n` +
                `━━━━━━━━━━━━━━━━\n` +
                `${reply}\n` +
                `━━━━━━━━━━━━━━━━`;

            api.sendMessage(finalMsg, threadID, messageID);
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            api.setMessageReaction("❌", messageID, () => {}, true);
            if (error.code === "ECONNABORTED") {
                return api.sendMessage("⏳ Phi-2 is sleeping. Try again in 30 seconds.", threadID, messageID);
            }
            console.error("Phi-2 Error:", error.message);
            return api.sendMessage("❌ Phi-2 is unavailable right now.", threadID, messageID);
        }
    }
};
