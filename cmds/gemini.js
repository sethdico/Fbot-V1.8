const axios = require("axios");

module.exports = {
    name: "gemini",
    aliases: ["gem", "bard", "vision"],
    usePrefix: false, 
    usage: "gemini <prompt> (reply to image or attach one)",
    description: "Ask Google Gemini. Supports Image Recognition.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, messageReply, attachments } = event;
        
        // 1. Get User Prompt
        let prompt = args.join(" ");
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
        // If there's an image but no text, default to "Describe this"
        if (!prompt && imageUrl) {
            prompt = "Describe this image detailedly.";
        }
        // If no text and no image, stop.
        if (!prompt && !imageUrl) {
            return api.sendMessage("⚠️ Please provide a prompt or an image.", threadID, messageID);
        }

        try {
            api.setMessageReaction("✨", messageID, () => {}, true);

            // 4. Prepare the API Request
            // This API uses GET request with query parameters
            const apiUrl = "https://norch-project.gleeze.com/api/gemini";
            
            const requestParams = {
                prompt: prompt
            };

            // Only add imageurl param if an image exists
            if (imageUrl) {
                requestParams.imageurl = imageUrl;
            }

            const response = await axios.get(apiUrl, {
                params: requestParams
            });

            const data = response.data;
            
            // 5. Extract the Answer
            // Common wrapper responses are in 'message', 'response', or 'result'
            const reply = data.message || data.response || data.result || data.content;

            if (reply) {
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                const finalMsg = `✨ **Gemini Vision**\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                api.sendMessage(finalMsg, threadID, messageID);
            } else {
                throw new Error("Empty response from API");
            }

        } catch (error) {
            console.error("Gemini Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ Gemini is currently sleeping (API Error).", threadID, messageID);
        }
    }
};
