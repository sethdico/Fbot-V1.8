const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "screenshot",
    aliases: ["ss", "webshot"], // You can also type "ss" or "webshot"
    usePrefix: false,
    usage: "screenshot <url>",
    version: "1.0",
    description: "Takes a live screenshot of a website.",
    cooldown: 10, // Screenshots take time, so a higher cooldown is good

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const targetUrl = args.join(" ");

        if (!targetUrl) {
            return api.sendMessage("⚠️ Please provide a URL.\nUsage: screenshot <url>", threadID, messageID);
        }

        try {
            // 1. React to show the bot is working
            api.setMessageReaction("⏳", messageID, () => {}, true);

            // 2. Call the Screenshot API
            const apiUrl = `https://norch-project.gleeze.com/api/screenshot?url=${encodeURIComponent(targetUrl)}`;
            const response = await axios.get(apiUrl);

            const data = response.data;

            // Check if the API returned a valid screenshot URL
            if (!data.success || !data.screenshot) {
                api.setMessageReaction("❌", messageID, () => {}, true);
                return api.sendMessage("❌ Failed to capture screenshot. The website might be unavailable.", threadID, messageID);
            }

            const screenshotUrl = data.screenshot;
            const filePath = path.join(__dirname, "cache", `screenshot_${Date.now()}.jpg`);
            
            // Ensure cache directory exists
            const cacheDir = path.join(__dirname, "cache");
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }

            // 3. Download the image
            const imageResponse = await axios({
                url: screenshotUrl,
                method: "GET",
                responseType: "stream"
            });

            const writer = fs.createWriteStream(filePath);
            imageResponse.data.pipe(writer);

            writer.on("finish", () => {
                // 4. Send the image
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                const msg = {
                    body: `📸 Screenshot of: ${targetUrl}`,
                    attachment: fs.createReadStream(filePath)
                };

                api.sendMessage(msg, threadID, () => {
                    // 5. Delete the file after sending to save space
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
