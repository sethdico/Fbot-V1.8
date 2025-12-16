// cmds/48laws.js
const axios = require("axios");

module.exports = {
    name: "48laws",
    aliases: ["law", "power"],
    usePrefix: false,
    description: "Get a random law from 'The 48 Laws of Power'.",
    cooldown: 5,
    execute: async ({ api, event }) => {
        try {
            api.setMessageReaction("📜", event.messageID, () => {}, true);
            const res = await axios.get("https://betadash-api-swordslush-production.up.railway.app/api/48laws");

            const law = res.data?.law || res.data;
            if (!law) throw new Error("Empty");

            api.sendMessage(`📜 **The 48 Laws of Power**\n━━━━━━━━━━━━━━━━\n${law}\n━━━━━━━━━━━━━━━━`, event.threadID, event.messageID);
            api.setMessageReaction("✅", event.messageID, () => {}, true);
        } catch (error) {
            api.setMessageReaction("❌", event.messageID, () => {}, true);
            return api.sendMessage("❌ Failed to fetch a law.", event.threadID, event.messageID);
        }
    }
};
