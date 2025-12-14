const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "deepimg",
    aliases: ["draw", "imagine", "gen"],
    usePrefix: false,
    usage: "deepimg <prompt> | <style> (optional)",
    version: "1.0",
    description: "A magic artist! Tell it what to draw. You can pick a style like 'anime', '3d', 'cyberpunk', or 'ghibli' by adding a '|' symbol.",
    cooldown: 10,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const input = args.join(" ");

        if (!input) {
            return api.sendMessage("⚠️ Please provide a prompt.\n\nUsage:\n/deepimg <prompt>\n/deepimg <prompt> | <style>", threadID, messageID);
        }

        let prompt = input;
        let style = "anime"; 
        let size = "1:1";

        if (input.includes("|")) {
            const parts = input.split("|");
            prompt = parts[0].trim();
            style = parts[1].trim() || "anime";
        }

        try {
            api.setMessageReaction("🎨", messageID, () => {}, true);
            const processingMsg = await api.sendMessage(`🎨 Generating image...\nPrompt: "${prompt}"\nStyle: ${style}`, threadID);

            const apiUrl = "https://shin-apis.onrender.com/ai/deepimg";
            const response = await axios.get(apiUrl, {
                params: {
                    prompt: prompt,
                    style: style,
                    size: size
                }
            });

            const data = response.data;
            const imageUrl = data.url || data.image || data.result;

            if (!imageUrl) {
                throw new Error("No image URL returned");
            }

            const filePath = path.join(__dirname, "cache", `deepimg_${Date.now()}.jpg`);
            
            // Ensure cache directory exists
            const cacheDir = path.join(__dirname, "cache");
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }

            const imageResponse = await axios({
                url: imageUrl,
                method: "GET",
                responseType: "stream"
            });

            const writer = fs.createWriteStream(filePath);
            imageResponse.data.pipe(writer);

            writer.on("finish", () => {
                api.unsendMessage(processingMsg.messageID);
                api.setMessageReaction("✅", messageID, () => {}, true);

                const msg = {
                    body: `🎨 Here is your AI Art!\nPrompt: ${prompt}\nStyle: ${style}`,
                    attachment: fs.createReadStream(filePath)
                };

                api.sendMessage(msg, threadID, () => {
                    fs.unlinkSync(filePath);
                });
            });

            writer.on("error", (err) => {
                console.error("Stream Error:", err);
                api.sendMessage("❌ Error processing the image file.", threadID, messageID);
            });

        } catch (error) {
            console.error("❌ DeepImg Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            api.sendMessage("❌ Failed to generate image.", threadID, messageID);
        }
    }
};
