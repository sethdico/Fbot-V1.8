module.exports = {
    name: "help",
    usePrefix: false,
    usage: "help [command] | help all",
    version: "4.2", 
    description: "Shows commands categorized for easier reading.",

    execute({ api, event, args }) {
        const { threadID, messageID } = event;

        // 🔧 Filter unique commands
        const commands = [...new Set(global.commands.values())];

        // 1. Define your Categories
        const categories = {
            "🤖 AI & Chat": [
                "ai", "aria", "copilot", "venice", "quillbot"
            ],
            "⚙️ Admin & Group": [
                "add", "leave", "notify", "unsend", "changeavatar", "post", "cmd", 
                "kick", "restart" // 🟢 Added new commands here
            ],
            "🛠️ Tools & Search": [
                "screenshot", "translate", "webcopilot", "dict", 
                "deepimg", "bible" 
            ],
            "ℹ️ System": [
                "help", "prefix", "uptime"
            ]
        };

        // 2. Logic to handle specific command help
        // Skips this block if the user types "help all"
        if (args.length > 0 && args[0].toLowerCase() !== "all") {
            const cmdName = args[0].toLowerCase();
            const cmd = global.commands.get(cmdName);

            if (!cmd) return api.sendMessage(`❌ Command "${cmdName}" not found.`, threadID, messageID);

            return api.sendMessage(`
╔════════════╗
   📖 GUIDE
╚════════════╝
🔹 **Name:** ${cmd.name}
📝 **Desc:** ${cmd.description || "No description."}
⌨️ **Usage:** ${cmd.usage || cmd.name}
🖇️ **Aliases:** ${cmd.aliases ? cmd.aliases.join(", ") : "None"}
⏱️ **Cooldown:** ${cmd.cooldown || 0}s
👑 **Admin:** ${cmd.admin ? "Yes" : "No"}
`, threadID, messageID);
        }

        // 3. Build the Categorized List
        let msg = `╔════════════╗\n   🤖 BOT MENU\n╚════════════╝\n\n`;

        let listedCommands = new Set();

        for (const [category, cmdList] of Object.entries(categories)) {
            // Filter: Ensure command actually exists in the bot files
            const availableCmds = cmdList.filter(name => {
                const cmd = global.commands.get(name);
                return cmd && cmd.name === name;
            });

            if (availableCmds.length > 0) {
                msg += `➤ ${category}\n`;
                msg += `  ${availableCmds.join(", ")}\n\n`;
                availableCmds.forEach(c => listedCommands.add(c));
            }
        }

        // Find commands not in the manual lists (The "Others")
        const others = commands
            .map(c => c.name)
            .filter(name => !listedCommands.has(name))
            .sort();

        if (others.length > 0) {
            msg += `➤ 📂 Others\n`;
            msg += `  ${others.join(", ")}\n\n`;
        }

        msg += `💡 Type **help <command>** for details.`;

        return api.sendMessage(msg, threadID, messageID);
    }
};
