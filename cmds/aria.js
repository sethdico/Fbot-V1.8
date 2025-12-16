const axios = require("axios");

module.exports = {
    name: "aria",
    aliases: ["ar"],
    usePrefix: false,
    usage: "aria <question>",
    description: "Aria AI which uses real time information.",
    cooldown: 8,
    execute: async ({ api, event, args }) => {
        const query = args.join(" ").trim();
        if (!query) {
            return api.sendMessage("🤖 Usage: aria What is love?", event.threadID, event.messageID);
        }

        try {
            api.setMessageReaction("💬", event.messageID, () => {}, true);

            const res = await axios.get("https://betadash-api-swordslush-production.up.railway.app/Aria", {
                params: {
                    ask: query,
                    userid: event.senderID, 
                    stream: ""
                },
                timeout: 30000
            });

            const answer = res.data?.response || res.data?.message || res.data?.result || res.data?.answer;
            if (!answer) throw new Error("Empty response");

            api.sendMessage(`🤖 **Aria AI**\n━━━━━━━━━━━━━━━━\n${answer}\n━━━━━━━━━━━━━━━━`, event.threadID, event.messageID);
            api.setMessageReaction("✅", event.messageID, () => {}, true);
        } catch (error) {
            api.setMessageReaction("❌", event.messageID, () => {}, true);
            if (error.code === "ECONNABORTED") {
                return api.sendMessage("⏳ Aria is waking up. Try again in 30s.", event.threadID, event.messageID);
            }
            return api.sendMessage("❌ Aria is offline.", event.threadID, event.messageID);
        }
    }
};
