const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "screenshot",
    aliases: ["ss", "webshot"],
    usePrefix: false,
    usage: "screenshot <url>",
    version: "2.0",
    description: "Takes a picture of a website.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const targetUrl = args.join(" ");

        if (!targetUrl) {
            return api.sendMessage("⚠️ Please provide a URL.\nUsage: screenshot google.com", threadID, messageID);
        }

        try {
            api.setMessageReaction("📸", messageID, () => {}, true);

            // 1. Setup paths correctly (Saved in the main 'cache' folder, not inside cmds)
            const cacheDir = path.resolve(__dirname, "..", "cache");
            const filePath = path.join(cacheDir, `ss_${Date.now()}.png`);

            // Ensure cache exists
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }

            // 2. Use a Direct Image API (Thum.io is faster and doesn't require JSON parsing)
            // We add 'https://' if the user forgot it
            const cleanUrl = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`;
            const apiUrl = `https://image.thum.io/get/width/1920/crop/1080/noanimate/${cleanUrl}`;

            // 3. Download the stream
            const response = await axios({
                url: apiUrl,
                method: "GET",
                responseType: "stream"
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            // 4. Wait for download to finish, then send
            writer.on("finish", () => {
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                const msg = {
                    body: `📸 Screenshot: ${cleanUrl}`,
                    attachment: fs.createReadStream(filePath)
                };

                api.sendMessage(msg, threadID, (err) => {
                    // Delete file after sending (or trying to)
                    fs.unlink(filePath, (e) => { if(e) console.error(e); });
                    
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
            api.sendMessage("❌ Could not connect to the screenshot service.", threadID, messageID);
        }
    }
};
