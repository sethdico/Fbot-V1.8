module.exports = {
    name: "help",
    usePrefix: false,
    usage: "help [command] | help all",
    version: "3.0",
    description: "Shows commands categorized for easier reading.",

    execute({ api, event, args }) {
        const { threadID, messageID } = event;
        const commands = [...global.commands.values()];

        // 1. Define your Categories
        const categories = {
            "🤖 AI & Chat": ["ai", "aria", "blackbox", "chipp", "copilot", "geminivision", "openrouter", "perplexity", "venice", "deepimg"],
            "⚙️ Admin & Group": ["add", "leave", "notify", "unsend", "changeavatar", "post", "cmd"],
            "🛠️ Tools & Search": ["google", "wiki", "screenshot", "translate", "webcopilot", "say", "shoti"],
            "ℹ️ System": ["help", "prefix", "ping", "uptime"]
        };

        // 2. Logic to handle specific command help (e.g., "help ai")
        if (args.length > 0) {
            const cmdName = args[0].toLowerCase();
            const cmd = global.commands.get(cmdName) || [...global.commands.values()].find(c => c.aliases && c.aliases.includes(cmdName));

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

        // Create a Set of all listed commands to find "Others"
        let listedCommands = new Set();

        for (const [category, cmdList] of Object.entries(categories)) {
            const availableCmds = cmdList.filter(name => global.commands.has(name));
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
