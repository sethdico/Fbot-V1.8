module.exports = {
    name: "copilot",
    aliases: ["bing", "ms"],
    usePrefix: false,
    usage: "copilot <message> OR copilot gpt-5 <message>",
    version: "1.1",
    // 👇 NEW DESCRIPTION
    description: "Microsoft's smart AI! You can just chat, or ask for specific brains like 'gpt-5' (super smart) or 'think-deeper' (for hard math/riddles).",
    cooldown: 5,
    // ... keep the rest of the execute code the same ...
    execute: async ({ api, event, args }) => { 
        /* Copy the execute code from your previous copilot.js */ 
        const { threadID, messageID } = event;
        // ... (Include the full logic I gave you before) ...
        // If you need the full code block again, let me know, but you just need to update the 'description' line.
        
        // RE-INSERTING LOGIC FOR CLARITY:
        if (args.length === 0) return api.sendMessage("Usage: /copilot <message>", threadID);
        const validModels = ["default", "think-deeper", "gpt-5"];
        let model = "default";
        let message = args.join(" ");
        if (validModels.includes(args[0].toLowerCase()) && args.length > 1) {
            model = args[0].toLowerCase();
            message = args.slice(1).join(" ");
        }
        try {
            api.setMessageReaction("⏳", messageID, () => {}, true);
            const axios = require("axios");
            const response = await axios.get("https://shin-apis.onrender.com/ai/copilot", { params: { message, model } });
            if (response.data.answer || response.data.message) {
                 api.setMessageReaction("✅", messageID, () => {}, true);
                 api.sendMessage(`🟦 **Copilot** (${model})\n\n${response.data.answer || response.data.message}`, threadID, messageID);
            }
        } catch (e) { api.sendMessage("❌ Error", threadID); }
    }
};
