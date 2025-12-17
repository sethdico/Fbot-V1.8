module.exports = {
    name: "help",
    aliases: ["commands", "menu", "h"],
    usePrefix: false,
    admin: false,
    cooldown: 3,
    version: "9.0",
    usage: "help [command] | help all | help category <name>",
    description: "Shows command list, details, or categories.",
    
    execute({ api, event, args }) {
        const { threadID, messageID } = event;
        const botPrefix = global.config?.prefix || "/";

        // Convert Map to Array
        const commandsArray = Array.from(global.commands.values());
        const uniqueCommands = [...new Map(commandsArray.map(cmd => [cmd.name, cmd])).values()];
        
        // Helper: Format command display
        const formatCommand = (cmd) => {
            const adminTag = cmd.admin ? " 👑" : "";
            const cooldownTag = cmd.cooldown ? ` ⏱️${cmd.cooldown}s` : "";
            const desc = cmd.description ? cmd.description : "No description available";
            const shortDesc = desc.length > 50 ? desc.substring(0, 47) + "..." : desc;
            return `🔹 ${botPrefix}${cmd.name}${adminTag}${cooldownTag}\n   → ${shortDesc}`;
        };

        // 1. HELP FOR SPECIFIC COMMAND
        if (args.length > 0 && args[0].toLowerCase() !== "all" && args[0].toLowerCase() !== "category") {
            const cmdName = args[0].toLowerCase();
            const cmd = global.commands.get(cmdName);
            if (!cmd) {
                return api.sendMessage(`❌ Command "${cmdName}" not found.`, threadID, messageID);
            }
            
            const aliases = cmd.aliases && cmd.aliases.length > 0 ? cmd.aliases.join(", ") : "None";
            const usage = cmd.usage || `${botPrefix}${cmd.name}`;
            const admin = cmd.admin ? "✅ Yes" : "❌ No";
            
            const helpMsg = `
╔═════════════════════════╗
        📖 COMMAND INFO
╚═════════════════════════╝
🔹 **Name:** ${cmd.name}
📝 **Description:** ${cmd.description || "No description"}
⌨️ **Usage:** ${usage}
🔗 **Aliases:** ${aliases}
⏱️ **Cooldown:** ${cmd.cooldown || 0}s
👑 **Admin Only:** ${admin}
            `;
            return api.sendMessage(helpMsg, threadID, messageID);
        }

        // 2. HELP ALL COMMANDS
        if (args[0]?.toLowerCase() === "all") {
            const allCmds = uniqueCommands.sort((a, b) => a.name.localeCompare(b.name));
            let msg = `╔═════════════════════════╗
     📋 ALL COMMANDS (${allCmds.length})
╚═════════════════════════╝\n`;
            allCmds.forEach(cmd => msg += `${formatCommand(cmd)}\n`);
            return api.sendMessage(msg, threadID, messageID);
        }

        // 3. CATEGORIZED MENU
        const categories = getCategories();
        
        // If user asks for specific category
        if (args[0]?.toLowerCase() === "category") {
            const catInput = args[1]?.toLowerCase();
            const catName = Object.keys(categories).find(c => c.toLowerCase().includes(catInput));
            
            if (!catName) return api.sendMessage("❌ Category not found.", threadID);

            const cmdsInCat = categories[catName];
            let catMsg = `╔═════════════════════════╗
   🗂️ ${catName.toUpperCase()}
╚═════════════════════════╝\n`;
            
            let foundAny = false;
            cmdsInCat.forEach(name => {
                const cmd = global.commands.get(name);
                if (cmd) {
                    catMsg += `${formatCommand(cmd)}\n`;
                    foundAny = true;
                }
            });
            
            if (!foundAny) return api.sendMessage("❌ No commands loaded in this category.", threadID);
            return api.sendMessage(catMsg, threadID, messageID);
        }

        // Default Main Menu
        let msg = `╔═════════════════════════╗
       🤖 FBOT V1.8 HELP
╚═════════════════════════╝
👋 Hello! I am online and ready.

`;
        
        Object.entries(categories).forEach(([category, cmdNames], index) => {
            // Count only commands that are actually loaded in memory
            const activeCount = cmdNames.filter(name => global.commands.has(name)).length;
            if (activeCount === 0) return; // Skip empty categories

            const emoji = ["🤖", "🎮", "🌍", "⚡", "👑", "🔄", "📱"][index % 7] || "📁";
            msg += `${emoji} **${category}** (${activeCount})\n`;
        });
        
        msg += `\n🔍 Type \`${botPrefix}help all\` for the full list.\n💡 Type \`${botPrefix}help <command>\` for details.`;
        
        return api.sendMessage(msg, threadID, messageID);
    }
};

// 🔹 EXACT LIST FROM YOUR FILES
// I included both filename variations (e.g. 'trans' vs 'translate') to be safe.
function getCategories() {
    return {
        "🤖 AI & Smart Tools": [
            "ai", "aria", "copilot", "deepimg", "gemini", "gptnano",
            "quillbot", "venice", "webpilot", "xdash", "you"
        ],
        "🎮 Entertainment": [
            "48laws", "8ball", "bible", "pair", "say"
        ],
        "🌍 Language & Info": [
            "dict", "define", "trans", "translate", "wiki", "stalk", "gcinfo",
            "inbox", "friendlist", "pending", "uid", "avatar", "pfp"
        ],
        "⚡ Utilities": [
            "remind", "uptime", "debug", "unsend", "loc", "spam"
        ],
        "👑 Admin & System": [
            "add", "kick", "leave", "notif", "notify", "welcome", "cmd",
            "api_debug", "restart", "logout", "notes", "note", "story",
            "accept", "addfriend", "token", "pm"
        ],
        "🔄 Group Management": [
            "theme", "nickname", "pin", "promote", "rename",
            "setemoji", "tagall"
        ]
    };
}
