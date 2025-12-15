const axios = require("axios");

module.exports = {
    name: "gptnano",
    aliases: ["nano", "gpt"],
    usePrefix: false,
    usage: "gptnano <text> (reply to image or attach one)",
    description: "Chat with GPT-4.1 Nano. Supports Image Recognition.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, messageReply, attachments } = event;
        
        // 1. Get User Input (Text)
        let text = args.join(" ");
        let imageUrl = "";

        // 2. Check for Images (Reply or Direct Attachment)
        if (messageReply && messageReply.attachments && messageReply.attachments.length > 0) {
            if (messageReply.attachments[0].type === "photo") {
                imageUrl = messageReply.attachments[0].url;
            }
        } else if (attachments && attachments.length > 0) {
            if (attachments[0].type === "photo") {
                imageUrl = attachments[0].url;
            }
        }

        // 3. Validation
        // If image exists but no text, provide default prompt
        if (!text && imageUrl) {
            text = "Describe this image.";
        }
        // If nothing at all
        if (!text && !imageUrl) {
            return api.sendMessage("⚠️ Please provide text or an image.", threadID, messageID);
        }

        try {
            api.setMessageReaction("🧠", messageID, () => {}, true);

            // 4. API Request
            const apiUrl = "https://norch-project.gleeze.com/api/Gpt4.1nano";
            
            const params = {
                text: text
            };

            // Only add imageUrl if it exists
            if (imageUrl) {
                params.imageUrl = imageUrl;
            }

            const response = await axios.get(apiUrl, {
                params: params
            });

            const data = response.data;
            
            // Check for common response keys from this API family
            const reply = data.result || data.message || data.response || data.answer;

            if (reply) {
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                const finalMsg = `🧠 **GPT-4.1 Nano**\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                api.sendMessage(finalMsg, threadID, messageID);
            } else {
                throw new Error("Empty response from API");
            }

        } catch (error) {
            console.error("GPT Nano Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ Failed to reach GPT-4.1 Nano.", threadID, messageID);
        }
    }
};
