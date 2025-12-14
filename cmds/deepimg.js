const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "deepimg",
    aliases: ["draw", "imagine", "gen"],
    usePrefix: false,
    usage: "deepimg <prompt> | <style> (optional)",
    version: "1.0",
    description: "Generate images from text using DeepImg AI.",
    cooldown: 10,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const input = args.join(" ");

        if (!input) {
            return api.sendMessage("⚠️ Please provide a prompt.\n\nUsage:\n/deepimg <prompt>\n/deepimg <prompt> | <style>", threadID, messageID);
        }

        // Default settings
        let prompt = input;
        let style = "anime"; // Default style
        let size = "1:1";    // Default size

        // Allow user to specify style using "|" separator
        // Example: /deepimg girl with sword | cyberpunk
        if (input.includes("|")) {
            const parts = input.split("|");
            prompt = parts[0].trim();
            style = parts[1].trim() || "anime";
        }

        // List of valid styles for reference:
        // 'default', 'ghibli', 'cyberpunk', 'anime', 'portrait', 'chibi', 'pixel art', 'oil painting', '3d'

        try {
            // 1. React to indicate processing
            api.setMessageReaction("🎨", messageID, () => {}, true);
            const processingMsg = await api.sendMessage(`🎨 Generating image...\nPrompt: "${prompt}"\nStyle: ${style}`, threadID);

            // 2. Call the API
            const apiUrl = "https://shin-apis.onrender.com/ai/deepimg";
            const response = await axios.get(apiUrl, {
                params: {
                    prompt: prompt,
                    style: style,
                    size: size
                }
            });

            // The API likely returns a JSON with a URL. 
            // We check if we got a valid URL.
            const data = response.data;
            const imageUrl = data.url || data.image || data.result; // Adjust based on actual API response keys

            if (!imageUrl) {
                // If the API failed to give a URL, maybe it returned the raw image? 
                // But usually these wrapper APIs return JSON. 
                throw new Error("No image URL returned");
            }

            // 3. Download the image
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
                // 4. Send the image
                api.unsendMessage(processingMsg.messageID); // Remove "Generating..." message
                api.setMessageReaction("✅", messageID, () => {}, true);

                const msg = {
                    body: `🎨 Here is your AI Art!\nPrompt: ${prompt}\nStyle: ${style}`,
                    attachment: fs.createReadStream(filePath)
                };

                api.sendMessage(msg, threadID, () => {
                    // 5. Delete the file after sending
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
            api.sendMessage("❌ Failed to generate image. Please try again later or check your prompt.", threadID, messageID);
        }
    }
};
