const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "pinterest",
    aliases: ["pin", "img"],
    usePrefix: false,
    usage: "pinterest <keyword> -<count>",
    description: "Search for images on Pinterest (Max 10).",
    cooldown: 10,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        
        // Parse count (e.g., "cat -5" -> count=5)
        let count = 4; // Default
        let searchParts = [];
        
        args.forEach(arg => {
            if (arg.startsWith("-") && !isNaN(arg.slice(1))) {
                count = parseInt(arg.slice(1));
            } else {
                searchParts.push(arg);
            }
        });

        const search = searchParts.join(" ");
        if (!search) return api.sendMessage("⚠️ Please provide a search query.", threadID, messageID);
        if (count > 10) count = 10; // Safety limit

        try {
            api.setMessageReaction("📌", messageID, () => {}, true);
            api.sendMessage(`🔍 Searching for ${count} images of "${search}"...`, threadID);

            const res = await axios.get(`https://betadash-api-swordslush-production.up.railway.app/pinterest?search=${encodeURIComponent(search)}&count=${count}`);
            
            // API likely returns { result: ["url1", "url2"] } or just an array
            const images = res.data.result || res.data.data || res.data;

            if (!images || images.length === 0) return api.sendMessage("❌ No images found.", threadID, messageID);

            const attachments = [];
            const cacheDir = path.join(__dirname, "..", "cache");
            if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

            for (let i = 0; i < images.length; i++) {
                const imgUrl = images[i];
                const imgPath = path.join(cacheDir, `pin_${Date.now()}_${i}.jpg`);

                try {
                    const imgRes = await axios.get(imgUrl, { responseType: "stream" });
                    const writer = fs.createWriteStream(imgPath);
                    imgRes.data.pipe(writer);

                    await new Promise((resolve) => {
                        writer.on("finish", resolve);
                    });

                    attachments.push(fs.createReadStream(imgPath));
                } catch (e) {
                    // Skip failed images
                }
            }

            if (attachments.length > 0) {
                api.sendMessage({
                    body: `📌 Results for: ${search}`,
                    attachment: attachments
                }, threadID, () => {
                    // Cleanup files
                    attachments.forEach(s => fs.unlink(s.path, () => {}));
                }, messageID);
            } else {
                api.sendMessage("❌ Failed to download images.", threadID, messageID);
            }

        } catch (e) {
            console.error(e);
            api.sendMessage("❌ Pinterest search failed.", threadID, messageID);
        }
    }
};
