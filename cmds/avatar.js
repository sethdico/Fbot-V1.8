const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
    name: "changeavatar",
    usage: "changeavatar <image_url> OR reply to an image",
    description: "Change the bot's profile picture.",
    usePrefix: true,
    cooldown: 5,
    admin: true,	
    
    execute: async ({ api, event, args }) => {
        // 🔍 CHECK: Does this library support changing avatars?
        if (typeof api.changeAvatar !== 'function') {
            return api.sendMessage("❌ Not Supported: The installed bot library (NethWs3Dev) does not support changing the profile picture to save memory.", event.threadID);
        }

        let imageUrl;

        // Get Image URL (from reply or args)
        if (event.messageReply && event.messageReply.attachments.length > 0) {
            const attachment = event.messageReply.attachments[0];
            if (attachment.type !== "photo") {
                return api.sendMessage("⚠️ Please reply to an image.", event.threadID, event.messageID);
            }
            imageUrl = attachment.url;
        } else if (args[0]) {
            imageUrl = args[0];
        } else {
            return api.sendMessage("⚠️ Usage: changeavatar <url> or reply to an image.", event.threadID);
        }

        try {
            api.sendMessage("⏳ Downloading and updating avatar...", event.threadID);

            // Download
            const response = await axios.get(imageUrl, { responseType: "stream" });
            const imagePath = path.join(__dirname, "avatar.jpg");
            const writer = fs.createWriteStream(imagePath);
            response.data.pipe(writer);

            writer.on("finish", () => {
                const imageStream = fs.createReadStream(imagePath);

                // Execute Change
                api.changeAvatar(imageStream, "", null, (err) => {
                    fs.unlinkSync(imagePath); // Clean up

                    if (err) return api.sendMessage("❌ Failed to change avatar. Facebook might be blocking this action.", event.threadID);
                    api.sendMessage("✅ Bot avatar changed successfully!", event.threadID);
                });
            });

        } catch (error) {
            api.sendMessage("❌ Error downloading image.", event.threadID);
        }
    },
};
