// cmds/pinterest.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "pinterest",
    aliases: ["pin", "pins"],
    usePrefix: false,
    usage: "pinterest <query>",
    description: "Fetch images from Pinterest (up to 4).",
    cooldown: 10,
    execute: async ({ api, event, args }) => {
        const query = args.join(" ").trim();
        if (!query) {
            return api.sendMessage("📌 Usage: pinterest okarun", event.threadID, event.messageID);
        }

        try {
            api.setMessageReaction("📌", event.messageID, () => {}, true);
            const res = await axios.get("https://betadash-api-swordslush-production.up.railway.app/pinterest", {
                params: { search: query, count: 4 },
                timeout: 30000
            });

            const images = res.data?.images || [];
            if (!images.length) throw new Error("No images");

            const cacheDir = path.resolve(__dirname, "..", "cache");
            if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

            const attachments = [];
            for (let i = 0; i < Math.min(images.length, 4); i++) {
                const imgRes = await axios({ url: images[i], responseType: "stream" });
                const filePath = path.join(cacheDir, `pinterest_${Date.now()}_${i}.jpg`);
                const writer = fs.createWriteStream(filePath);
                imgRes.data.pipe(writer);
                await new Promise(r => writer.on("finish", r));
                attachments.push(fs.createReadStream(filePath));
            }

            api.sendMessage({
                body: `📌 **Pinterest: ${query}**`,
                attachment: attachments
            }, event.threadID, () => {
                attachments.forEach(att => {
                    if (att.path) fs.unlink(att.path, () => {});
                });
            });
            api.setMessageReaction("✅", event.messageID, () => {}, true);
        } catch (error) {
            api.setMessageReaction("❌", event.messageID, () => {}, true);
            return api.sendMessage("❌ No Pinterest images found.", event.threadID, event.messageID);
        }
    }
};
