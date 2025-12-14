const axios = require("axios");

module.exports = {
    name: "phind",
    aliases: ["search", "askphind"],
    usePrefix: false,
    usage: "phind <question>",
    version: "4.0", // Stream Decoder Version
    description: "Ask Phind AI (Smart Search Engine).",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const question = args.join(" ");

        if (!question) {
            return api.sendMessage("⚠️ Please ask a question.\nUsage: phind who won the 2024 olympics", threadID, messageID);
        }

        try {
            api.setMessageReaction("🧠", messageID, () => {}, true);

            const apiUrl = "https://api.ccprojectsapis-jonell.gleeze.com/api/phindai";
            
            const response = await axios.get(apiUrl, {
                params: {
                    q: question
                }
            });

            // The data comes wrapped in JSON, inside the 'response' field
            const rawStream = response.data.response;
            let reply = "";

            // 🔧 DECODER: Look for the hidden answer inside the stream
            if (rawStream && typeof rawStream === "string" && rawStream.includes("event: output_done")) {
                try {
                    // 1. Cut the text at "output_done"
                    const parts = rawStream.split("event: output_done");
                    
                    // 2. Grab the data line immediately after
                    // format is usually: ... event: output_done\ndata: { ... }
                    const dataPart = parts[1].split("data: ")[1];

                    // 3. Clean up anything after the JSON
                    const jsonString = dataPart.split("event: status")[0].trim();

                    // 4. Parse it
                    const parsedData = JSON.parse(jsonString);
                    reply = parsedData.text; // The answer is here

                } catch (e) {
                    console.error("Stream Parsing Error:", e);
                }
            } 
            // Fallback: If the API stops streaming and sends normal text
            else {
                reply = response.data.message || response.data.result;
            }

            if (reply) {
                // Formatting: Phind uses Markdown links [text](url). 
                // Facebook doesn't support them well, so we leave them or clean them slightly.
                const finalMsg = `🧠 **Phind AI**\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
                api.sendMessage(finalMsg, threadID, messageID);
                api.setMessageReaction("✅", messageID, () => {}, true);
            } else {
                throw new Error("Could not decode response.");
            }

        } catch (error) {
            console.error("Phind Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            api.sendMessage("❌ Phind AI is currently unreachable or the stream failed.", threadID, messageID);
        }
    }
};
