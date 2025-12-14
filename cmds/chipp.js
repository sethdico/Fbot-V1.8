const axios = require("axios");

module.exports = {
    name: "chipp",
    aliases: ["chip", "gpt4v", "vision"],
    usePrefix: false,
    usage: "chipp <question> (reply to an image to analyze it)",
    version: "1.0",
    description: "An AI with eyes! 👀 Send a picture and reply to it with this command, and it will tell you what it sees. Or just chat normally.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID, messageReply } = event;
        const prompt = args.join(" ");

        if (!prompt && (!messageReply || !messageReply.attachments)) {
            return api.sendMessage("⚠️ Please provide a question or reply to an image.\nUsage: /chipp <question>", threadID, messageID);
        }

        try {
            api.setMessageReaction("👁️", messageID, () => {}, true);

            let imageUrl = "";
            if (messageReply && messageReply.attachments && messageReply.attachments.length > 0) {
                const attachment = messageReply.attachments[0];
                if (attachment.type === "photo") {
                    imageUrl = attachment.url;
                }
            }

            const apiUrl = "https://rapido.zetsu.xyz/api/chipp";
            
            const response = await axios.get(apiUrl, {
                params: {
                    ask: prompt || "Describe this image",
                    uid: senderID,
                    url: imageUrl,
                    apikey: "rapi_566265dea6d44e16b5149ee816dcf143"
                }
            });

            const data = response.data;
            const reply = data.result || data.response || data.message || data.answer;

            if (reply) {
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                const finalMessage = `🤖 **Chipp AI**\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                return api.sendMessage(finalMessage, threadID, messageID);
            } else {
                throw new Error("Empty response from API");
            }

        } catch (error) {
            console.error("❌ Chipp AI Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ An error occurred. The API might be down.", threadID, messageID);
        }
    }
};
