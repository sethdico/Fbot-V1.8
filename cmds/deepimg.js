const axios = require("axios");

module.exports = {
    name: "deepimg",
    aliases: ["draw"],
    usePrefix: false,
    cooldown: 15, // Higher cooldown for heavy task

    execute: async ({ api, event, args }) => {
        const prompt = args.join(" ");
        if (!prompt) return api.sendMessage("🎨 Provide a description!", event.threadID);

        try {
            api.setMessageReaction("🎨", event.messageID, () => {}, true);
            
            const url = `https://shin-apis.onrender.com/ai/deepimg?prompt=${encodeURIComponent(prompt)}&style=anime`;
            const res = await axios.get(url);
            const imgUrl = res.data.url || res.data.image;

            if (!imgUrl) throw new Error("No image returned");

            // Direct Stream - No Filesystem
            const stream = await axios.get(imgUrl, { responseType: 'stream' });

            await api.sendMessage({
                body: `🎨 Result: ${prompt}`,
                attachment: stream.data
            }, event.threadID);

        } catch (e) {
            api.sendMessage("❌ Generation failed.", event.threadID);
        }
    }
};
