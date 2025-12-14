const axios = require("axios");

module.exports = {
    name: "chipp",
    aliases: ["chip", "gpt4v"],
    usePrefix: false,
    usage: "chipp <question> (reply to an image to analyze it)",
    version: "1.0",
    description: "Chat with Chipp AI (Supports Image Vision).",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID, messageReply } = event;
        const prompt = args.join(" ");

        // Allow command to run if there is an image attachment OR a prompt
        if (!prompt && (!messageReply || !messageReply.attachments)) {
            return api.sendMessage("⚠️ Please provide a question or reply to an image.\nUsage: /chipp <question>", threadID, messageID);
        }

        try {
            // 1. React to indicate processing
            api.setMessageReaction("👁️", messageID, () => {}, true);

            // 2. Check for Image Attachment (Vision Mode)
            let imageUrl = "";
            if (messageReply && messageReply.attachments && messageReply.attachments.length > 0) {
                const attachment = messageReply.attachments[0];
                if (attachment.type === "photo") {
                    imageUrl = attachment.url;
                }
            }

            // 3. Call the API
            const apiUrl = "https://rapido.zetsu.xyz/api/chipp";
            
            const response = await axios.get(apiUrl, {
                params: {
                    ask: prompt || "Describe this image", // Default prompt if only image is sent
                    uid: senderID,   // Use actual Sender ID
                    url: imageUrl,   // Send image URL if it exists, otherwise empty
                    apikey: "rapi_566265dea6d44e16b5149ee816dcf143"
                }
            });

            const data = response.data;
            
            // API Response handling
            const reply = data.result || data.response || data.message || data.answer;

            if (reply) {
                // 4. Send the result
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
