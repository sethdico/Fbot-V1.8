// cmds/screenshot.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "screenshot",
    aliases: ["ss", "capture", "webshot"],
    usePrefix: false,
    usage: "screenshot <url>",
    description: "Takes a screenshot of any webpage. Must start with http:// or https://",
    cooldown: 8,
    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const inputUrl = args.join(" ").trim();

        // Validate input
        if (!inputUrl) {
            return api.sendMessage(
                "📸 **Screenshot Help**\n" +
                "Capture any website as an image!\n" +
                "📌 Usage: `screenshot https://google.com`",
                threadID,
                messageID
            );
        }

        // Ensure URL starts with http(s)
        let fullUrl = inputUrl;
        if (!inputUrl.startsWith("http://") && !inputUrl.startsWith("https://")) {
            fullUrl = "https://" + inputUrl;
        }

        try {
            // Feedback: reaction + message
            api.setMessageReaction("🖼️", messageID, () => {}, true);
            const loadingMsg = await api.sendMessage(`📷 Capturing screenshot of:\n> _${fullUrl}_`, threadID);

            // Fetch screenshot from API
            const apiUrl = `https://api.ccprojectsapis-jonell.gleeze.com/api/screenshot?url=${encodeURIComponent(fullUrl)}`;
            const response = await axios.get(apiUrl, {
                responseType: "stream",
                timeout: 30000 // 30s timeout
            });

            // Ensure it's an image
            const contentType = response.headers["content-type"];
            if (!contentType || !contentType.startsWith("image/")) {
                throw new Error("API did not return an image");
            }

            // Save to cache
            const cacheDir = path.resolve(__dirname, "..", "cache");
            if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
            const filePath = path.join(cacheDir, `screenshot_${Date.now()}.png`);

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            writer.on("finish", () => {
                api.unsendMessage(loadingMsg.messageID);
                api.sendMessage({
                    body: `🖼️ **Web Screenshot**\n> ${fullUrl}`,
                    attachment: fs.createReadStream(filePath)
                }, threadID, () => {
                    // Clean up file after sending
                    fs.unlink(filePath, (err) => {
                        if (err) console.error("❌ Failed to delete screenshot file:", err);
                    });
                });
                api.setMessageReaction("✅", messageID, () => {}, true);
            });

            writer.on("error", (err) => {
                throw new Error("File write failed");
            });

        } catch (error) {
            // Clean up if loading message exists
            if (typeof loadingMsg !== 'undefined' && loadingMsg?.messageID) {
                api.unsendMessage(loadingMsg.messageID);
            }

            api.setMessageReaction("❌", messageID, () => {}, true);

            if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
                return api.sendMessage(
                    "⏳ The screenshot service is slow or sleeping. Try again in 30 seconds.",
                    threadID,
                    messageID
                );
            }

            if (error.response?.status === 400) {
                return api.sendMessage(
                    "⚠️ Invalid URL. Make sure it starts with http:// or https://",
                    threadID,
                    messageID
                );
            }

            console.error("Screenshot Error:", error.message);
            return api.sendMessage(
                "❌ Failed to capture screenshot. The site may be unreachable or the API is down.",
                threadID,
                messageID
            );
        }
    }
};
