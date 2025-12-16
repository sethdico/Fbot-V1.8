module.exports = {
    name: "help",
    usePrefix: false,
    usage: "help [command] | help all",
    version: "5.0", // Ultimate Version
    description: "Shows commands and usage details.",
    cooldown: 2,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const commands = global.commands;
        const prefix = "/"; // Visual prefix only

        // ===============================================
        // 1. HELP ALL (List every command + description)
        // ===============================================
        if (args[0] === "all") {
            let msg = `╔════════════╗\n   📜 FULL LIST\n╚════════════╝\n\n`;
            
            // Convert Map to Array, Sort Alphabetically
            const sortedCmds = Array.from(commands.values()).sort((a, b) => a.name.localeCompare(b.name));

            sortedCmds.forEach(cmd => {
                // Formatting: • /command - Description
                msg += `• /${cmd.name}\n  └ ${cmd.description || "No description."}\n`;
            });

            msg += `\nTotal: ${commands.size} commands.`;
            return api.sendMessage(msg, threadID, messageID);
        }

        // ===============================================
        // 2. HELP <COMMAND> (Specific details)
        // ===============================================
        if (args[0] && args[0].toLowerCase() !== "all") {
            const cmdName = args[0].toLowerCase();
            const cmd = commands.get(cmdName) || Array.from(commands.values()).find(c => c.aliases && c.aliases.includes(cmdName));

            if (!cmd) return api.sendMessage(`❌ Command "/${cmdName}" not found.`, threadID, messageID);

            const info = `
╔════════════╗
   📖 GUIDE
╚════════════╝
🔹 **Name:** ${cmd.name}
📝 **Desc:** ${cmd.description || "No description available."}
⌨️ **Usage:** ${cmd.usage ? cmd.usage : `/${cmd.name}`}
🖇️ **Aliases:** ${cmd.aliases && cmd.aliases.length > 0 ? cmd.aliases.join(", ") : "None"}
⏱️ **Cooldown:** ${cmd.cooldown || 0}s
👑 **Admin Only:** ${cmd.admin ? "Yes" : "No"}
`;
            return api.sendMessage(info, threadID, messageID);
        }

        // ===============================================
        // 3. MAIN MENU (Categorized List)
        // ===============================================
        
        // Define your categories manually here to keep it organized
        const categories = {
            "🤖 AI & Chat": [
                "ai", "chippai", "gemini", "gptnano",
                "you", "webcopilot", "quillbot", "venice", "aria", "copilot"
            ],
            "🎧 Media & Fun": [
                "spotify", "lyrics", "pinterest", "screenshot", 
                "deepimg", "post", "8ball", "bible", "48laws"
            ],
            "🛠️ Tools & Utility": [
                "translate", "dict", "remind", "uptime",
                "help", "prefix"
            ],
            "⚙️ Admin & System": [
                "kick", "add", "leave", "notify", 
                "unsend", "changeavatar", "restart", "cmd", "welcome"
            ]
        };

        let msg = `╔════════════╗\n   🤖 BOT MENU\n╚════════════╝\nType "help all" for descriptions.\n\n`;

        // Track which commands we have already shown
        const listedCommands = new Set();

        // Loop through defined categories
        for (const [categoryName, cmdList] of Object.entries(categories)) {
            // Filter: Only show commands that actually exist in the bot
            const activeCmds = cmdList.filter(name => commands.has(name));
            
            if (activeCmds.length > 0) {
                msg += `➤ ${categoryName}\n`;
                msg += `  ${activeCmds.join(", ")}\n\n`;
                activeCmds.forEach(c => listedCommands.add(c));
            }
        }

        // Find "Others" (Commands that exist but aren't in the lists above)
        const allCommandNames = Array.from(commands.keys());
        const otherCmds = allCommandNames.filter(name => !listedCommands.has(name)).sort();

        if (otherCmds.length > 0) {
            msg += `➤ 📂 General / Others\n`;
            msg += `  ${otherCmds.join(", ")}\n\n`;
        }

        msg += `💡 Type **help <command>** for details.`;

        return api.sendMessage(msg, threadID, messageID);
    }
};
