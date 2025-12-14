module.exports = {
    name: "help",
    usePrefix: false,
    usage: "help [command] | help all",
    version: "2.1",
    description: "Shows the list of commands and how to use them.",

    execute({ api, event, args }) {
        const { threadID, messageID } = event;

        // 1. Filter out duplicates using Set (Fixes the "3 copies" bug)
        const uniqueCommands = [...new Set(global.commands.values())];

        // 2. Sort commands A-Z
        const sortedCommands = uniqueCommands.sort((a, b) => a.name.localeCompare(b.name));

        if (args.length > 0) {
            const commandName = args[0].toLowerCase();

            // === SHOW ALL COMMANDS ===
            if (commandName === "all") {
                const allCommands = sortedCommands
                    .filter(cmd => !cmd.admin) // Hide admin commands
                    .map((cmd) => {
                        return `🔹 **${cmd.name}**\n📖 ${cmd.description || "No description."}\n⌨️ ${cmd.usage}`;
                    })
                    .join("\n\n");

                const msg = `
╔════════════╗
   🤖 ALL COMMANDS
╚════════════╝
${allCommands}
`;
                return api.sendMessage(msg, threadID, messageID);
            }

            // === SHOW SINGLE COMMAND ===
            const cmd = global.commands.get(commandName);
            if (!cmd) return api.sendMessage(`❌ Command not found.`, threadID, messageID);

            const msg = `
╔════════════╗
   🤖 COMMAND INFO
╚════════════╝
🔹 Name: ${cmd.name}
📖 Description: ${cmd.description}
⌨️ Usage: ${cmd.usage}
🔗 Aliases: ${cmd.aliases ? cmd.aliases.join(", ") : "None"}
`;
            return api.sendMessage(msg, threadID, messageID);
        }

        // === MAIN MENU (Short List) ===
        // Just shows names to keep it clean
        const featured = sortedCommands
            .filter(cmd => !cmd.admin)
            .map(cmd => `• ${cmd.name}`)
            .join("\n");

        api.sendMessage(`
╔════════════╗
   🤖 BOT MENU
╚════════════╝
${featured}

💡 Type **"help all"** to see what each command does!
💡 Type **"help <command>"** for specific details.
`, threadID, messageID);
    }
};
