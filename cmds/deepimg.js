const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "deepimg",
    aliases: ["draw", "imagine"],
    usePrefix: false,
    usage: "deepimg <prompt>",
    version: "1.1",
    description: "AI Image generator.",
    cooldown: 10,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const input = args.join(" ");

        if (!input) return api.sendMessage("⚠️ Provide a prompt.", threadID, messageID);

        // Default style logic
        let prompt = input;
        let style = "anime"; 
        if (input.includes("|")) {
            const parts = input.split("|");
            prompt = parts[0].trim();
            style = parts[1].trim() || "anime";
        }

        try {
            api.setMessageReaction("🎨", messageID, () => {}, true);
            const processingMsg = await api.sendMessage(`🎨 Generating "${prompt}"...`, threadID);

            const apiUrl = "https://shin-apis.onrender.com/ai/deepimg";
            const response = await axios.get(apiUrl, {
                params: { prompt: prompt, style: style }
            });

            const imageUrl = response.data.url || response.data.image || response.data.result;

            if (!imageUrl) throw new Error("API returned no image.");

            // FIX: Ensure the cache folder exists in the main directory
            const cacheDir = path.resolve(__dirname, "..", "cache");
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }
            
            const filePath = path.join(cacheDir, `deepimg_${Date.now()}.jpg`);

            const imageResponse = await axios({
                url: imageUrl,
                method: "GET",
                responseType: "stream"
            });

            const writer = fs.createWriteStream(filePath);
            imageResponse.data.pipe(writer);

            writer.on("finish", () => {
                api.unsendMessage(processingMsg.messageID);
                api.sendMessage({
                    body: `🎨 Result for: ${prompt}`,
                    attachment: fs.createReadStream(filePath)
                }, threadID, () => fs.unlinkSync(filePath)); // Delete after sending
            });

        } catch (error) {
            console.error("DeepImg Error:", error.message);
            api.sendMessage("❌ Failed to generate image. The API might be sleeping.", threadID, messageID);
        }
    }
};
