module.exports = {
    name: "help",
    aliases: ["menu", "h"],
    usePrefix: false,
    description: "Shows the command menu.",
    usage: "help [category or command]",

    execute: async ({ api, event, args, config }) => {
        const { threadID, senderID } = event;
        const prefix = config.prefix || "/";
        const input = args[0] ? args[0].toLowerCase() : null;

        // 🛠️ CATEGORIES
        // I renamed "AI" to "Chat" so it doesn't conflict with the /ai command
        const categories = {
            "🤖 Chat & Assistants": [
                "ai", "aria", "copilot", "gemini", "gptnano", 
                "quillbot", "venice", "webpilot", "you"
            ],
            "👥 Group Controls": [
                "add", "gcinfo", "kick", "leave", "nickname", 
                "pin", "promote", "rename", "setemoji", "tagall", "theme"
            ],
            "🎨 Fun & Media": [
                "48laws", "8ball", "bible", "deepimg", "pair"
            ],
            "🔧 Utilities": [
                "define", "loc", "myid", "remind", "trans", 
                "uid", "uptime", "unsend", "debug"
            ],
            "👤 Social & Profile": [
                "accept", "addfriend", "friendlist", "inbox", 
                "notes", "pending", "pm", "stalk", "story"
            ]
        };

        // 1. CHECK IF USER IS ASKING FOR A SPECIFIC CATEGORY
        // Logic: specific command search happens AFTER this loop if no match found
        for (const [catName, cmdList] of Object.entries(categories)) {
            // Check if input matches category (e.g. "chat", "group", "fun")
            if (input && catName.toLowerCase().includes(input)) {
                const list = cmdList.map(c => `🔹 ${prefix}${c}`).join("\n");
                return api.sendMessage(`📂 **${catName}**\n━━━━━━━━━━━━━━━━\n${list}\n━━━━━━━━━━━━━━━━\n💡 Type ${prefix}help <command> for details.`, threadID);
            }
        }

        // 2. CHECK IF USER IS ASKING FOR A SPECIFIC COMMAND
        // This now works for "/help ai" because the category "Chat" doesn't contain the word "ai"
        if (input) {
            const cmd = global.commands.get(input) || global.commands.get(global.aliases?.get(input));
            if (cmd) {
                const info = `
📖 **COMMAND: ${cmd.name.toUpperCase()}**
━━━━━━━━━━━━━━━━
📝 **Description:** ${cmd.description || "No description."}
⌨️ **Usage:** ${cmd.usage ? cmd.usage : `${prefix}${cmd.name}`}
🖇️ **Aliases:** ${cmd.aliases ? cmd.aliases.join(", ") : "None"}
👑 **Admin Only:** ${cmd.admin ? "Yes" : "No"}
━━━━━━━━━━━━━━━━`;
                return api.sendMessage(info, threadID);
            }
        }

        // 3. MAIN MENU (The Categories)
        let menuMsg = `🤖 **${config.botName || "Amadeus"} Menu**\n`;
        menuMsg += `👋 Hello! Select a category below:\n\n`;

        Object.keys(categories).forEach((cat, i) => {
            // Extracts "chat", "group", "fun" to show as the tip
            const keyword = cat.split(" ")[1].toLowerCase(); 
            menuMsg += `${i + 1}. **${cat}**\n   👉 Type: \`${prefix}help ${keyword}\`\n\n`;
        });

        menuMsg += `🔐 **Admins:** Type \`${prefix}cmd\` for the Admin Panel.\n`;
        menuMsg += `❓ **Specific:** Type \`${prefix}help <command>\` (e.g. ${prefix}help ai)`;

        return api.sendMessage(menuMsg, threadID);
    }
};
