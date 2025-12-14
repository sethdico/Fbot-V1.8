const axios = require("axios");

module.exports = {
    name: "chipp",
    aliases: ["chip", "ai2", "chipvis"],
    usePrefix: false,
    usage: "chipp <question> (reply to an image to analyze it)",
    version: "2.0",
    description: "An AI with eyes! 👀 Send a picture and reply to it with this command.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID, messageReply } = event;
        const prompt = args.join(" ");

        // Check for Image Attachment (Vision Mode)
        let imageUrl = "";
        if (messageReply && messageReply.attachments && messageReply.attachments.length > 0) {
            const attachment = messageReply.attachments[0];
            if (attachment.type === "photo") {
                imageUrl = attachment.url;
            }
        }

        // If no prompt and no image, show warning
        if (!prompt && !imageUrl) {
            return api.sendMessage("⚠️ Please provide a question or reply to an image.\nUsage: /chipp <question>", threadID, messageID);
        }

        try {
            // 1. React to indicate processing
            api.setMessageReaction("👁️", messageID, () => {}, true);

            // 2. Call the API
            const apiUrl = "https://rapido.zetsu.xyz/api/chipp";
            
            const response = await axios.get(apiUrl, {
                params: {
                    ask: prompt || "Describe this image", // Default if no text provided with image
                    uid: senderID,
                    url: imageUrl, // Sends the image URL if it exists
                    apikey: "rapi_566265dea6d44e16b5149ee816dcf143"
                }
            });

            const data = response.data;
            const reply = data.result || data.response || data.message || data.answer;

            if (reply) {
                // 3. Send the result
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                const finalMessage = `🤖 **Chipp AI**\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                return api.sendMessage(finalMessage, threadID, messageID);
            } else {
                throw new Error("Empty response from API");
            }

        } catch (error) {
            console.error("❌ Chipp AI Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ An error occurred. The Rapido API might be down or busy.", threadID, messageID);
        }
    }
};
