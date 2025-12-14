const axios = require("axios");

module.exports = {
    name: "geminivision",
    aliases: ["gemv", "vision", "identify"],
    usePrefix: false,
    usage: "geminivision <prompt> (Reply to an image)",
    version: "1.0",
    description: "Analyze photos using Google Gemini Vision.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, messageReply } = event;
        let prompt = args.join(" ");
        let imageUrl = "";

        // 1. Check if user Replied to a Photo
        if (messageReply && messageReply.attachments && messageReply.attachments.length > 0) {
            const attachment = messageReply.attachments[0];
            if (attachment.type === "photo") {
                imageUrl = attachment.url;
            }
        }
        
        // 2. Handling Input Scenarios
        if (!imageUrl && !prompt) {
            return api.sendMessage("⚠️ usage:\n1. Reply to an image: /gemv describe this\n2. Chat normally: /gemv who is elon musk?", threadID, messageID);
        }

        // Default prompt if user sends image but no text
        if (imageUrl && !prompt) {
            prompt = "Describe this image in detail.";
        }

        try {
            // React to indicate processing
            api.setMessageReaction("👀", messageID, () => {}, true);

            // 3. Call the API
            const apiUrl = "https://deku-rest-api.gleeze.com/gemini";
            
            // Construct params based on whether we have an image or not
            const params = {
                prompt: prompt,
                url: imageUrl || "" // API handles empty string as text-only mode
            };

            const response = await axios.get(apiUrl, { params });
            const data = response.data;

            // Check for valid response
            const reply = data.result || data.response || data.message;

            if (reply) {
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                const header = imageUrl ? "🖼️ **Gemini Vision**" : "✨ **Gemini Chat**";
                const finalMsg = `${header}\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                
                return api.sendMessage(finalMsg, threadID, messageID);
            } else {
                throw new Error("Empty response from API");
            }

        } catch (error) {
            console.error("Gemini Vision Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ An error occurred. The API might be busy.", threadID, messageID);
        }
    }
};
