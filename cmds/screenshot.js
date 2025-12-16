const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "screenshot",
    aliases: ["ss"],
    usePrefix: false,
    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const url = args.join(" ");
        if (!url) return api.sendMessage("⚠️ Provide a URL.", threadID);

        const target = url.startsWith("http") ? url : `https://${url}`;

        try {
            api.setMessageReaction("📸", messageID, () => {}, true);

            const cachePath = path.join(__dirname, "..", "cache", `ss_${Date.now()}.png`);
            if (!fs.existsSync(path.dirname(cachePath))) fs.mkdirSync(path.dirname(cachePath), { recursive: true });

            const response = await axios({
                url: "https://betadash-api-swordslush-production.up.railway.app/screenshot",
                method: "GET",
                params: { url: target },
                responseType: "stream",
                headers: { "User-Agent": "Mozilla/5.0" }
            });

            const writer = fs.createWriteStream(cachePath);
            response.data.pipe(writer);

            writer.on("finish", () => {
                api.sendMessage({
                    body: `📸 Screenshot: ${target}`,
                    attachment: fs.createReadStream(cachePath)
                }, threadID, () => fs.unlinkSync(cachePath));
                api.setMessageReaction("✅", messageID, () => {}, true);
            });

            writer.on("error", () => api.sendMessage("❌ File Write Error.", threadID));

        } catch (e) {
            api.sendMessage("❌ Failed to screenshot (Site might be blocking bots).", threadID, messageID);
        }
    }
};
