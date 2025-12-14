const axios = require("axios");

module.exports = {
    name: "quillbot",
    aliases: ["rewrite", "rephrase", "fix"],
    usePrefix: false,
    usage: "quillbot <text>",
    version: "2.0", // Stream Decoder Version
    description: "Rewrites text (Handles Complex Streams).",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const prompt = args.join(" ");

        if (!prompt) {
            return api.sendMessage("⚠️ Please provide text.\nUsage: quillbot hello world", threadID, messageID);
        }

        try {
            api.setMessageReaction("✍️", messageID, () => {}, true);

            const apiUrl = "https://api.ccprojectsapis-jonell.gleeze.com/api/ai/quillbotai";
            
            const response = await axios.get(apiUrl, {
                params: { prompt: prompt }
            });

            // The API returns the stream inside response.data.response
            const rawStream = response.data.response;
            let finalReply = "";

            // 1. Check if the "output_done" event exists (This holds the full answer)
            if (rawStream && rawStream.includes("event: output_done")) {
                try {
                    // Split the text to find the part after "output_done"
                    const splitStream = rawStream.split("event: output_done");
                    
                    // Get the data line immediately following it
                    // The format is: event: output_done\ndata: { ... JSON ... }
                    const dataPart = splitStream[1].split("data: ")[1];

                    // Clean it up: Stop reading if another event starts
                    const jsonString = dataPart.split("event: status")[0].trim();

                    // Parse the hidden JSON
                    const parsedData = JSON.parse(jsonString);
                    
                    // The answer is inside .text
                    finalReply = parsedData.text;

                } catch (parseError) {
                    console.error("Stream Parsing Error:", parseError);
                }
            } 
            // 2. Fallback: If not a stream, try standard keys
            else {
                finalReply = response.data.result || response.data.message;
            }

            if (finalReply) {
                const finalMsg = `✍️ **Quillbot**\n━━━━━━━━━━━━━━━━\n${finalReply}\n━━━━━━━━━━━━━━━━`;
                api.sendMessage(finalMsg, threadID, messageID);
                api.setMessageReaction("✅", messageID, () => {}, true);
            } else {
                throw new Error("Could not decode stream.");
            }

        } catch (error) {
            console.error("Quillbot Error:", error.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            api.sendMessage("❌ Failed to process the AI response.", threadID, messageID);
        }
    }
};
