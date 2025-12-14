const fs = require("fs");
const axios = require("axios");
const path = require("path");

module.exports = {
    name: "prefix",
    usePrefix: false,
    admin: false,
    cooldown: 5,

    execute: async ({ api, event }) => {
        // Load config safely inside the command
        let config = {};
        try { config = require("../config.json"); } catch(e) {}
        
        const prefix = config.prefix || "/";
        const botName = config.botName || "Fbot";
        const gifUrl = "https://media.giphy.com/media/1UwhOK8VX95TcfPBML/giphy.gif";
        const cachePath = path.join(__dirname, "cache", "prefix.gif");

        if (!fs.existsSync(path.join(__dirname, "cache"))) fs.mkdirSync(path.join(__dirname, "cache"));

        try {
            const res = await axios.get(gifUrl, { responseType: "stream" });
            const writer = fs.createWriteStream(cachePath);
            res.data.pipe(writer);

            writer.on("finish", () => {
                api.sendMessage({
                    body: `🤖 **Bot Info**\n━━━━━━━━━━\n🔹 Prefix: ${prefix}\n🔹 Name: ${botName}`,
                    attachment: fs.createReadStream(cachePath)
                }, event.threadID, () => fs.unlinkSync(cachePath));
            });
        } catch (e) {
            api.sendMessage(`🔹 Prefix: ${prefix}`, event.threadID);
        }
    }
};
