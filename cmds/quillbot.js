const axios = require("axios");

module.exports = {
    name: "phind",
    aliases: ["phi", "askphind"],
    usePrefix: false,
    usage: "phind <question>",
    version: "2.0", // Stream-Decoder Version
    description: "Ask Phind AI (Smart Search Engine).",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const question = args.join(" ");

        if (!question) {
            return api.sendMessage("⚠️ Please ask a question.\nUsage: phind who created facebook", threadID, messageID);
        }

        try {
            api.setMessageReaction("🧠", messageID, () => {}, true);

            const apiUrl = "https://api.ccprojectsapis-jonell.gleeze.com/api/phindai";
            
            const response = await axios.get(apiUrl, {
                params: { q: question }
            });

            // The API returns a massive string "Stream"
            const rawStream = response.data.response; 
            
            let reply = "";

            // 🔧 DECODER LOGIC
            // We look for the specific section "event: output_done" which contains the full answer
            if (rawStream && rawStream.includes("event: output_done")) {
                try {
                    // 1. Split the text to find the end part
                    const parts = rawStream.split("event: output_done");
                    // 2. Get the part after output_done, and split by "data: "
                    const dataPart = parts[1].split("data: ")[1];
                    // 3. Clean it up until the next event starts
                    const jsonString = dataPart.split("event: status")[0].trim();
                    
                    // 4. Parse the hidden JSON
                    const parsedData = JSON.parse(jsonString);
                    reply = parsedData.text;

                } catch (e) {
                    console.error("Parsing Error:", e);
                    reply = "❌ Error decoding the AI stream.";
                }
            } else {
                // Fallback for normal messages
                reply = response.data.message || response.data.result;
            }

            if (reply) {
                // Clean up Markdown links slightly if they are messy
                const finalMsg = `🧠 **Phind AI**\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                api.sendMessage(finalMsg, threadID, messageID);
                api.setMessageReaction("✅", messageID, () => {}, true);
            } else {
                throw new Error("Empty response");
            }

        } catch (error) {
            console.error("Phind Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            api.sendMessage("❌ Phind AI is currently unreachable.", threadID, messageID);
        }
    }
};
