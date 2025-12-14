const axios = require("axios");

module.exports = {
    name: "bible",
    aliases: ["verse", "gospel", "amen"],
    usePrefix: false,
    usage: "bible",
    version: "1.0",
    description: "Get a random Bible verse.",
    cooldown: 5,

    execute: async ({ api, event }) => {
        const { threadID, messageID } = event;

        try {
            // 1. React to show faith/processing
            api.setMessageReaction("✝️", messageID, () => {}, true);

            // 2. Fetch from your API
            const response = await axios.get("https://urangkapolka.vercel.app/api/bible");
            const data = response.data;

            // 3. Extract the data (Handles different common formats just in case)
            // It looks for 'verse', 'text', or 'content' for the message
            // It looks for 'reference', 'ref', or 'book' for the citation
            const verse = data.verse || data.text || data.content || data.q;
            const reference = data.reference || data.ref || data.book || data.a;

            if (!verse) {
                throw new Error("API returned no verse text.");
            }

            // 4. Send the beautiful message
            const msg = `✝️ **Daily Bible Verse**\n━━━━━━━━━━━━━━━━\n📖 *${verse}*\n━━━━━━━━━━━━━━━━\n🙏 **${reference || "Holy Bible"}**`;

            return api.sendMessage(msg, threadID, messageID);

        } catch (error) {
            console.error("Bible Command Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ Failed to retrieve a bible verse at this time.", threadID, messageID);
        }
    }
};
