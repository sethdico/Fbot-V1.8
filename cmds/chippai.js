const axios = require("axios");

// 🧠 Helper function to generate UUIDs (No installation required)
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Stores session IDs per thread so the bot "remembers" the conversation
const sessionMap = new Map();

module.exports = {
    name: "chippai",
    aliases: ["chipp", "chi", "pai"], // Updated aliases
    usePrefix: false, 
    usage: "chippai <message> (or reply with image)",
    description: "Chat with Chipp AI. Supports memory and image recognition.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, messageReply, attachments } = event;
        
        let userMessage = args.join(" ");
        let imageUrl = null;

        // 1. Check for Image Attachments (Reply or Direct)
        if (messageReply && messageReply.attachments && messageReply.attachments.length > 0) {
            if (messageReply.attachments[0].type === "photo") {
                imageUrl = messageReply.attachments[0].url;
            }
        } else if (attachments && attachments.length > 0) {
            if (attachments[0].type === "photo") {
                imageUrl = attachments[0].url;
            }
        }

        // Validate Input
        if (!userMessage && !imageUrl) {
            return api.sendMessage("⚠️ Please say something or send an image.", threadID, messageID);
        }

        // 2. Manage Session ID
        if (!sessionMap.has(threadID)) {
            sessionMap.set(threadID, generateUUID());
        }
        const sessionId = sessionMap.get(threadID);
        
        // This is the specific app ID
        const appSlug = "DigitalProtg-32922"; 

        // 3. Prepare Message Payload
        const messages = [{ role: "user", content: userMessage }];
        
        if (imageUrl) {
            messages[0].data = { imageUrl: imageUrl }; 
        }

        try {
            // React to show processing
            api.setMessageReaction("🧠", messageID, () => {}, true);

            // 4. Send Request
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

            // 5. Stream Parser
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

            // 6. Send Final Result
            response.data.on('end', () => {
                if (!fullText) fullText = "❌ No response received from the server.";
                
                api.setMessageReaction("✅", messageID, () => {}, true);
                
                // Updated Name Header
                const finalMsg = `🤖 **Chipp AI**\n━━━━━━━━━━━━━━━━\n${fullText.trim()}\n━━━━━━━━━━━━━━━━`;
                api.sendMessage(finalMsg, threadID, messageID);
            });

        } catch (error) {
            console.error("ChippAI Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            
            if (error.response && error.response.status === 404) {
                api.sendMessage("❌ Error: The website endpoint was not found.", threadID, messageID);
            } else {
                api.sendMessage("❌ Failed to connect to Chipp AI.", threadID, messageID);
            }
        }
    }
};
