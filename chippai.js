const axios = require("axios");

// 🧠 Helper function to generate UUIDs without installing "uuid" package
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const sessionMap = new Map();

module.exports = {
    name: "chippai",
    aliases: ["chi", "chipp"],
    usePrefix: false, 
    usage: "digital <message>",
    description: "Chat with Chipp Ai searches online and see images.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, messageReply, attachments } = event;
        
        let userMessage = args.join(" ");
        let imageUrl = null;

        if (messageReply && messageReply.attachments && messageReply.attachments.length > 0) {
            if (messageReply.attachments[0].type === "photo") imageUrl = messageReply.attachments[0].url;
        } else if (attachments && attachments.length > 0) {
            if (attachments[0].type === "photo") imageUrl = attachments[0].url;
        }

        if (!userMessage && !imageUrl) {
            return api.sendMessage("⚠️ Please say something or send an image.", threadID, messageID);
        }

        // 1. Generate ID using our custom function (No npm install needed)
        if (!sessionMap.has(threadID)) {
            sessionMap.set(threadID, generateUUID());
        }
        const sessionId = sessionMap.get(threadID);
        const appSlug = "DigitalProtg-32922"; 

        const messages = [{ role: "user", content: userMessage }];
        if (imageUrl) messages[0].data = { imageUrl: imageUrl }; 

        try {
            api.setMessageReaction("🧠", messageID, () => {}, true);

            const url = "https://digitalprotg-32922.chipp.ai/api/chat";
            const refererUrl = `https://digitalprotg-32922.chipp.ai/w/chat/${appSlug}/session/${sessionId}`;

            const response = await axios.post(url, {
                messages: messages,
                sessionId: sessionId,
                chatId: sessionId
            }, {
                responseType: 'stream',
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Referer": refererUrl,
                    "Origin": "https://digitalprotg-32922.chipp.ai",
                    "Content-Type": "application/json"
                }
            });

            let fullText = "";

            response.data.on('data', chunk => {
                const lines = chunk.toString().split('\n');
                for (const line of lines) {
                    if (line.startsWith('0:')) {
                        try {
                            const jsonStr = line.substring(2);
                            const content = JSON.parse(jsonStr);
                            fullText += content;
                        } catch (e) { }
                    }
                }
            });

            response.data.on('end', () => {
                if (!fullText) fullText = "❌ No response.";
                api.setMessageReaction("✅", messageID, () => {}, true);
                api.sendMessage(fullText.trim(), threadID, messageID);
            });

        } catch (error) {
            console.error("DigitalProtg Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            api.sendMessage("❌ Failed to connect.", threadID, messageID);
        }
    }
};
