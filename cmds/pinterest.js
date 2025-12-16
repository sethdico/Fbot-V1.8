const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "pinterest",
    aliases: ["pin"],
    usePrefix: false,
    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        
        let count = 5;
        const searchParts = args.filter(arg => {
            if (arg.startsWith("-") && !isNaN(arg)) {
                count = Math.abs(parseInt(arg));
                return false;
            }
            return true;
        });
        const search = searchParts.join(" ");

        if (!search) return api.sendMessage("⚠️ Usage: pinterest <query> -5", threadID);
        if (count > 9) count = 9;

        try {
            api.setMessageReaction("📌", messageID, () => {}, true);

            const res = await axios.get(`https://betadash-api-swordslush-production.up.railway.app/pinterest?search=${encodeURIComponent(search)}&count=${count}`, {
                headers: { "User-Agent": "Mozilla/5.0" }
            });

            // API Check: It might return data.result OR data.data OR just data array
            const images = Array.isArray(res.data) ? res.data : (res.data.result || res.data.data);
            if (!images || images.length === 0) return api.sendMessage("❌ No results.", threadID);

            const attachments = [];
            const cacheDir = path.join(__dirname, "..", "cache");
            if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

            // Download Loop
            for (let i = 0; i < images.length; i++) {
                try {
                    const p = path.join(cacheDir, `pin_${Date.now()}_${i}.jpg`);
                    const img = await axios.get(images[i], { responseType: "stream" });
                    const writer = fs.createWriteStream(p);
                    img.data.pipe(writer);
                    await new Promise(r => writer.on("finish", r));
                    attachments.push(fs.createReadStream(p));
                } catch (e) {}
            }

            if (attachments.length > 0) {
                api.sendMessage({
                    body: `📌 Results: ${search}`,
                    attachment: attachments
                }, threadID, () => attachments.forEach(s => fs.unlink(s.path, ()=>{})));
                api.setMessageReaction("✅", messageID, () => {}, true);
            } else {
                api.sendMessage("❌ Failed to load images.", threadID);
            }

        } catch (e) {
            api.sendMessage("❌ Pinterest API Error.", threadID);
        }
    }
};
