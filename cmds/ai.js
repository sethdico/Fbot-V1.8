const axios = require("axios");

module.exports = {
    name: "ai",
    usePrefix: false,
    usage: "ai <question>",
    version: "2.0",
    admin: false,
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const prompt = args.join(" ");

        if (!prompt) {
            return api.sendMessage("⚠️ Please provide a question.\nUsage: ai <question>", threadID, messageID);
        }

        try {
            // Indicate processing
            api.setMessageReaction("⏳", messageID, () => {}, true);

            const systemPrompt = "You are a helpful AI assistant. For EVERY response, you must structure your thinking and answer using these tags: <thinking> Demonstrate thorough reasoning by: - Breaking down the problem into components - Analyzing from multiple angles - Challenging your assumptions - Showing authentic curiosity - Considering edge cases and potential issues - Developing your understanding progressively - Verifying your logic and conclusions Use natural, flowing thoughts - no rigid structure. </thinking> <answer> Provide your final response here: - Clear and concise - Directly addresses the question/task - Implements insights from thinking process - Uses appropriate formatting (code blocks, lists, etc.) - Includes examples or references if relevant - Highlights key points or takeaways </answer> CRITICAL: NEVER skip the thinking process. ALWAYS use these tags.";

            const apiUrl = "https://api.kojaxd.dpdns.org/ai/customai";
            
            const response = await axios.get(apiUrl, {
                params: {
                    apikey: "Koja",
                    prompt: prompt,
                    system: systemPrompt
                }
            });

            // Retrieve the response from likely fields
            const data = response.data;
            const reply = data.message || data.result || data.response || data;

            if (reply) {
                // Send the result
                api.sendMessage(reply, threadID, messageID);
                api.setMessageReaction("✅", messageID, () => {}, true);
            } else {
                throw new Error("Empty response from API");
            }

        } catch (error) {
            console.error("❌ AI Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            api.sendMessage("❌ An error occurred while fetching the response.", threadID, messageID);
        }
    }
};
