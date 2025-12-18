const axios = require("axios");

module.exports = {
    name: "xdash",
    aliases: ["x", "dash"],
    usePrefix: false,
    usage: "xdash <query>",
    description: "Fast AI-powered search using XDash.",
    cooldown: 8,

    execute: async ({ api, event, args, config }) => {
        const { threadID, messageID } = event;
        const query = args.join(" ").trim();

        if (!query) return api.sendMessage("⚡ Usage: xdash <question>", threadID, messageID);

        try {
            api.setMessageReaction("⚡", messageID, () => {}, true);
            
            const response = await axios.get(
                "https://api.zetsu.xyz/api/xdash",
                {
                    params: {
                        query: query,
                        // Updated to use your specific XDash key
                        apikey: config.xdashApiKey
                    },
                    timeout: 25000,
                    headers: { "User-Agent": "Fbot-V1.8" }
                }
            );

            let answer = response.data?.result || response.data?.response;
            if (!answer) throw new Error("Invalid response");
            
            api.sendMessage(`⚡ **XDash AI**\n━━━━━━━━━━━━━━━━\n${answer}`, threadID, messageID);
            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            console.error("XDash Error:", error.message);
            api.sendMessage("❌ XDash is down or Key is invalid.", threadID, messageID);
        }
    }
};
