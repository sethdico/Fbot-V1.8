const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "screenshot",
    aliases: ["ss", "webshot"], 
    usePrefix: false,
    usage: "screenshot <url>",
    version: "1.0",
    description: "Takes a picture (screenshot) of any website link you send it.",
    cooldown: 10, 

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const targetUrl = args.join(" ");

        if (!targetUrl) {
            return api.sendMessage("⚠️ Please provide a URL.\nUsage: screenshot <url>", threadID, messageID);
        }

        try {
            api.setMessageReaction("⏳", messageID, () => {}, true);

            const apiUrl = `https://norch-project.gleeze.com/api/screenshot?url=${encodeURIComponent(targetUrl)}`;
            const response = await axios.get(apiUrl);

            const data = response.data;

            if (!data.success || !data.screenshot) {
                api.setMessageReaction("❌", messageID, () => {}, true);
                return api.sendMessage("❌ Failed to capture screenshot. The website might be unavailable.", threadID, messageID);
            }

            const screenshotUrl = data.screenshot;
            const filePath = path.join(__dirname, "cache", `screenshot_${Date.now()}.jpg`);
            
            const cacheDir = path.join(__dirname, "cache");
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }

            const imageResponse = await axios({
                url: screenshotUrl,
                method: "GET",
                responseType: "stream"
            });

            const writer = fs.createWriteStream(filePath);
            imageResponse.data.pipe(writer);

            writer.on("finish", () => {
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                const msg = {
                    body: `📸 Screenshot of: ${targetUrl}`,
                    attachment: fs.createReadStream(filePath)
                };

                api.sendMessage(msg, threadID, () => {
                    fs.unlinkSync(filePath);
                });
            });

            writer.on("error", (err) => {
                console.error("Stream Error:", err);
                api.sendMessage("❌ Error processing the image.", threadID, messageID);
            });

        } catch (error) {
            console.error("❌ Screenshot Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            api.sendMessage("❌ An error occurred while fetching the screenshot.", threadID, messageID);
        }
    }
};
