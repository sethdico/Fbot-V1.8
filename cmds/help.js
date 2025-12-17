// cmds/help.js
module.exports = {
    name: "help",
    aliases: ["commands", "menu", "h"],
    usePrefix: false,
    admin: false,
    cooldown: 3,
    version: "6.0",
    usage: "help [command] | help all | help category <name>",
    description: "Shows command list, details, or categories. Use to explore bot capabilities.",
    execute({ api, event, args }) {
        const { threadID, messageID } = event;
        const botPrefix = global.config?.prefix || "/";
        const uniqueCommands = [...new Map(global.commands.map(cmd => [cmd.name, cmd])).values()];
        
        // Helper: Format command display
        const formatCommand = (cmd) => {
            const adminTag = cmd.admin ? " 👑" : "";
            const cooldownTag = cmd.cooldown ? ` ⏱️${cmd.cooldown}s` : "";
            return `🔹 ${botPrefix}${cmd.name}${adminTag}${cooldownTag}\n   → ${cmd.description || "No description available"}`;
        };

        // 1. HELP FOR SPECIFIC COMMAND
        if (args.length > 0 && args[0].toLowerCase() !== "all" && args[0].toLowerCase() !== "category") {
            const cmdName = args[0].toLowerCase();
            const cmd = global.commands.get(cmdName);
            if (!cmd) {
                return api.sendMessage(`❌ Command "${cmdName}" not found. Type "${botPrefix}help" to see available commands.`, threadID, messageID);
            }
            
            const aliases = cmd.aliases && cmd.aliases.length > 0 ? cmd.aliases.join(", ") : "None";
            const usage = cmd.usage || `${botPrefix}${cmd.name} [parameters]`;
            const admin = cmd.admin ? "✅ Yes (Owner/Admin only)" : "❌ No (Everyone can use)";
            const cooldown = cmd.cooldown ? `${cmd.cooldown} seconds` : "None";
            const version = cmd.version || "1.0";
            
            const helpMsg = `
╔═════════════════════════╗
        📖 COMMAND INFO
╚═════════════════════════╝
🔹 **Name:** ${cmd.name}
📝 **Description:** ${cmd.description || "No description available"}
⌨️ **Usage:** ${usage}
🔗 **Aliases:** ${aliases}
⏱️ **Cooldown:** ${cooldown}
👑 **Admin Only:** ${admin}
🔖 **Version:** ${version}
            `;
            return api.sendMessage(helpMsg, threadID, messageID);
        }

        // 2. HELP ALL COMMANDS
        if (args[0]?.toLowerCase() === "all") {
            const allCmds = uniqueCommands.sort((a, b) => a.name.localeCompare(b.name));
            if (allCmds.length === 0) {
                return api.sendMessage("❌ No commands available at the moment.", threadID, messageID);
            }
            
            let msg = `╔═════════════════════════╗
     📋 ALL COMMANDS (${allCmds.length})
╚═════════════════════════╝\n`;
            
            allCmds.forEach(cmd => {
                msg += `${formatCommand(cmd)}\n`;
            });
            
            msg += `\n💡 Tip: Type "${botPrefix}help <command>" for detailed information about a specific command.`;
            return api.sendMessage(msg, threadID, messageID);
        }

        // 3. HELP BY CATEGORY
        if (args[0]?.toLowerCase() === "category") {
            const categoryName = args[1]?.toLowerCase() || "";
            const categories = getCategories();
            
            if (!categoryName) {
                // Show category list
                let categoryList = `╔═════════════════════════╗
        🗂️ CATEGORIES
╚═════════════════════════╝\n`;
                
                Object.keys(categories).forEach(cat => {
                    const count = categories[cat].length;
                    categoryList += `🔸 ${cat} (${count} commands)\n`;
                });
                
                categoryList += `\n💡 Type "${botPrefix}help category <name>" to see commands in a specific category.`;
                return api.sendMessage(categoryList, threadID, messageID);
            }
            
            // Find matching category (case-insensitive)
            const matchingCategory = Object.keys(categories).find(cat => 
                cat.toLowerCase().includes(categoryName.toLowerCase()) ||
                categoryName.toLowerCase().includes(cat.toLowerCase())
            );
            
            if (!matchingCategory) {
                return api.sendMessage(`❌ Category "${categoryName}" not found. Type "${botPrefix}help category" to see available categories.`, threadID, messageID);
            }
            
            const cmdsInCategory = categories[matchingCategory];
            let catMsg = `╔═════════════════════════╗
   🗂️ ${matchingCategory.toUpperCase()} (${cmdsInCategory.length})
╚═════════════════════════╝\n`;
            
            cmdsInCategory.forEach(cmdName => {
                const cmd = uniqueCommands.find(c => c.name.toLowerCase() === cmdName.toLowerCase());
                if (cmd) catMsg += `${formatCommand(cmd)}\n`;
            });
            
            return api.sendMessage(catMsg, threadID, messageID);
        }

        // 4. DEFAULT HELP - CATEGORIZED VIEW
        const categories = getCategories();
        let msg = `╔═════════════════════════╗
       🤖 FBOT V1.8 HELP
╚═════════════════════════╝
👋 Hello! I'm Amadeus, a powerful Facebook Messenger bot created by Sethdico.

📚 **Command Categories:**
`;
        
        // Show category summary
        Object.entries(categories).forEach(([category, cmds], index) => {
            const emoji = ["🤖", "🎮", "🌍", "⚡", "👑", "🔄"][index % 6] || "📁";
            msg += `${emoji} **${category}** (${cmds.length})\n`;
        });
        
        msg += `
🔍 **How to use:**
• View all commands: \`${botPrefix}help all\`
• View a category: \`${botPrefix}help category <name>\`
• Get command details: \`${botPrefix}help <command>\`

💡 **Example:** \`${botPrefix}help ai\` shows details about the AI command.

🌐 **Web Access:** Visit http://localhost:3000 for the web interface.
        `;
        
        return api.sendMessage(msg, threadID, messageID);
    }
};

// Helper function: Define command categories
function getCategories() {
    return {
        "🤖 AI & Smart Tools": [
            "ai", "gemini", "gptnano", "you", "webpilot", 
            "aria", "copilot", "xdash", "venice", "deepimg", "quillbot"
        ],
        "🎮 Entertainment & Fun": [
            "8ball", "bible", "48laws"
        ],
        "🌍 Language Tools": [
            "dict", "translate"
        ],
        "⚡ Utilities & Info": [
            "remind", "uptime", "debug", "unsend"
        ],
        "👑 Admin & System": [
            "add", "kick", "leave", "notify", "welcome", 
            "changeavatar", "cmd", "api_debug", "restart"
        ],
        "🔄 Group Management": [
            "welcome", "kick", "add", "notify"
        ]
    };
}
