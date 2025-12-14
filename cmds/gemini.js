const axios = require("axios");

module.exports = {
    name: "gemini",
    aliases: ["bard", "vision"],
    usePrefix: false,
    usage: "gemini <prompt> (Reply to an image to analyze it)",
    version: "2.0",
    description: "Chat with Google Gemini. Can also see images if you reply to them!",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, messageReply, attachments } = event;
        const prompt = args.join(" ");
        let imageUrl = "";

        // 1. Check for images (Reply or Attachment)
        if (messageReply && messageReply.attachments && messageReply.attachments.length > 0) {
            // User replied to an image
            const item = messageReply.attachments[0];
            if (item.type === "photo") {
                imageUrl = item.url;
            }
        } else if (attachments && attachments.length > 0) {
            // User sent an image WITH the command
            const item = attachments[0];
            if (item.type === "photo") {
                imageUrl = item.url;
            }
        }

        // 2. Validation: We need at least a prompt or an image
        if (!prompt && !imageUrl) {
            return api.sendMessage("⚠️ Please provide a question or reply to an image.\n\nUsage:\n1. gemini who is iron man? (Text)\n2. gemini describe this (Reply to photo)", threadID, messageID);
        }

        try {
            // 3. React to show processing
            api.setMessageReaction("✨", messageID, () => {}, true);

            const apiKey = "3884224f549d964644816c61b1b65d84";
            const apiUrl = "https://api.zetsu.xyz/api/gemini";
            
            // 4. Prepare parameters
            const params = {
                prompt: prompt || "Describe this image", // Default prompt if user just sends a photo
                apikey: apiKey
            };

            // If we found an image, add the URL parameter
            if (imageUrl) {
                params.url = imageUrl;
            }

            // 5. Call the API
            const response = await axios.get(apiUrl, { params });
            const data = response.data;

            // 6. Extract the answer
            const reply = data.response || data.result || data.message || data.answer;

            if (reply) {
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                // Format the message nicely
                const header = imageUrl ? "✨ **Gemini Vision**" : "✨ **Gemini AI**";
                const finalMsg = `${header}\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                
                return api.sendMessage(finalMsg, threadID, messageID);
            } else {
                throw new Error("API returned empty response.");
            }

        } catch (error) {
            console.error("Gemini Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ An error occurred with Gemini AI.", threadID, messageID);
        }
    }
};
