const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "screenshot",
    aliases: ["ss", "webshot"],
    usePrefix: false,
    usage: "screenshot <url>",
    version: "3.0", // Jonell API Version
    description: "Takes a picture of a website.",
    cooldown: 10, // Increased cooldown as this API can be a bit slower

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const targetUrl = args.join(" ");

        if (!targetUrl) {
            return api.sendMessage("⚠️ Please provide a URL.\nUsage: screenshot google.com", threadID, messageID);
        }

        try {
            api.setMessageReaction("📸", messageID, () => {}, true);

            // 1. Setup paths correctly
            const cacheDir = path.resolve(__dirname, "..", "cache");
            const filePath = path.join(cacheDir, `ss_${Date.now()}.png`);

            // Ensure cache exists
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }

            // 2. Use the requested API
            const apiUrl = "https://api.ccprojectsapis-jonell.gleeze.com/api/screenshot";
            
            // 3. Download the stream
            const response = await axios({
                url: apiUrl,
                method: "GET",
                params: {
                    url: targetUrl // The API handles adding https:// automatically
                },
                responseType: "stream"
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            // 4. Wait for download to finish, then send
            writer.on("finish", () => {
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                const msg = {
                    body: `📸 Screenshot: ${targetUrl}`,
                    attachment: fs.createReadStream(filePath)
                };

                api.sendMessage(msg, threadID, (err) => {
                    // Delete file after sending
                    fs.unlink(filePath, (e) => {});
                    
                    if (err) {
                        console.error("Send Error:", err);
                        api.sendMessage("❌ Error sending the photo.", threadID, messageID);
                    }
                });
            });

            writer.on("error", (err) => {
                console.error("Stream Error:", err);
                api.sendMessage("❌ Failed to save the image.", threadID, messageID);
            });

        } catch (error) {
            console.error("Screenshot Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            api.sendMessage("❌ The screenshot API is currently down or busy.", threadID, messageID);
        }
    }
};
