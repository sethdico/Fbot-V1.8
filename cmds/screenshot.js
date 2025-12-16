const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "screenshot",
    aliases: ["ss", "webshot"],
    usePrefix: false,
    usage: "screenshot <url>",
    description: "Take a screenshot of a website.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const url = args.join(" ");

        if (!url) return api.sendMessage("⚠️ Please provide a URL.", threadID, messageID);

        // Basic URL validation
        const targetUrl = url.startsWith("http") ? url : `https://${url}`;

        try {
            api.setMessageReaction("📸", messageID, () => {}, true);

            const apiUrl = `https://betadash-api-swordslush-production.up.railway.app/screenshot?url=${encodeURIComponent(targetUrl)}`;
            const imgPath = path.join(__dirname, "..", "cache", `ss_${Date.now()}.png`);
            
            // Ensure cache dir exists
            if (!fs.existsSync(path.dirname(imgPath))) fs.mkdirSync(path.dirname(imgPath), { recursive: true });

            const res = await axios.get(apiUrl, { responseType: "stream" });
            const writer = fs.createWriteStream(imgPath);
            res.data.pipe(writer);

            writer.on("finish", () => {
                api.sendMessage({
                    body: `📸 Screenshot of: ${targetUrl}`,
                    attachment: fs.createReadStream(imgPath)
                }, threadID, () => fs.unlinkSync(imgPath), messageID);
                api.setMessageReaction("✅", messageID, () => {}, true);
            });

            writer.on("error", () => {
                 api.sendMessage("❌ Failed to save screenshot.", threadID, messageID);
            });

        } catch (e) {
            api.sendMessage("❌ Failed to take screenshot. URL might be invalid.", threadID, messageID);
        }
    }
};
