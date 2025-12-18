module.exports = {
    name: "help",
    aliases: ["h", "menu"],
    usePrefix: false,
    admin: false,
    cooldown: 3,
    description: "View the command list or get info about a specific command.",
    usage: "help [command] | help all",

    execute({ api, event, args }) {
        const { threadID, messageID } = event;
        const prefix = global.config?.prefix || "/";

        // Get all unique commands and sort them alphabetically
        const commands = Array.from(global.commands.values());
        const uniqueCmds = [...new Map(commands.map(c => [c.name, c])).values()]
            .sort((a, b) => a.name.localeCompare(b.name));

        // 1. DETAIL VIEW (Usage: /help ai)
        // This checks if the user typed a specific command name
        if (args.length > 0 && args[0].toLowerCase() !== "all") {
            const query = args[0].toLowerCase();
            const cmd = global.commands.get(query);

            if (!cmd) {
                return api.sendMessage(`❌ Command "${query}" not found. Type ${prefix}help all to see the list.`, threadID, messageID);
            }

            const infoMsg = `📖 **COMMAND DETAILS: ${cmd.name.toUpperCase()}**\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `📝 **Description:** ${cmd.description || "No description available."}\n` +
                `⌨️ **Usage:** ${cmd.usage || prefix + cmd.name}\n` +
                `⏱️ **Cooldown:** ${cmd.cooldown || 0}s\n` +
                `👑 **Admin Only:** ${cmd.admin ? "Yes" : "No"}\n` +
                `🔗 **Aliases:** ${cmd.aliases ? cmd.aliases.join(", ") : "None"}`;

            return api.sendMessage(infoMsg, threadID, messageID);
        }

        // 2. FULL LIST VIEW (Usage: /help all)
        if (args[0]?.toLowerCase() === "all") {
            let listMsg = `📜 **FULL COMMAND LIST (${uniqueCmds.length})**\n\n`;
            
            uniqueCmds.forEach(c => {
                listMsg += `• ${prefix}${c.name}${c.admin ? " 👑" : ""}\n`;
            });
            
            listMsg += `\n💡 **Tip:** Type \`${prefix}help <command name>\` to see exactly how to use it!`;
            return api.sendMessage(listMsg, threadID, messageID);
        }

        // 3. DEFAULT SIMPLE MENU (Usage: /help)
        let defaultMsg = `╔═════════════════╗\n    🤖 **HELP SYSTEM**\n╚═════════════════╝\n`;
        defaultMsg += `👋 Hello! I am a multi-functional AI assistant.\n\n`;
        defaultMsg += `📜 Type \`${prefix}help all\` to see every command I can do.\n\n`;
        defaultMsg += `🔍 Type \`${prefix}help <command>\` (example: \`${prefix}help ai\`) to see what a specific command does and how to use it.`;
        
        return api.sendMessage(defaultMsg, threadID, messageID);
    }
};
