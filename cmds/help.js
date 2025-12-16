// cmds/help.js
module.exports = {
    name: "help",
    usePrefix: false,
    usage: "help [command] | help all",
    version: "5.0",
    description: "Shows all commands or detailed info for a specific one.",
    execute({ api, event, args }) {
        const { threadID, messageID } = event;
        const botPrefix = global.config?.prefix || "/";
        const commands = [...new Set(global.commands.values())];

        // --- 1. Handle: /help <specific command> ---
        if (args.length > 0 && args[0].toLowerCase() !== "all") {
            const cmdName = args[0].toLowerCase();
            const cmd = global.commands.get(cmdName);
            if (!cmd) {
                return api.sendMessage(`❌ Command "${cmdName}" not found.`, threadID, messageID);
            }
            const aliases = cmd.aliases ? cmd.aliases.join(", ") : "None";
            const usage = cmd.usage || `${botPrefix}${cmd.name}`;
            const admin = cmd.admin ? "✅ Yes" : "❌ No";
            const cooldown = cmd.cooldown ? `${cmd.cooldown}s` : "None";

            return api.sendMessage(
                `╔══════════════════╗
         📖 COMMAND GUIDE
╚══════════════════╝
🔹 **Name:** ${cmd.name}
📝 **Description:** ${cmd.description || "No description."}
⌨️ **Usage:** ${usage}
🖇️ **Aliases:** ${aliases}
⏱️ **Cooldown:** ${cooldown}
👑 **Admin Only:** ${admin}
`,
                threadID,
                messageID
            );
        }

        // --- 2. Handle: /help all ---
        if (args[0]?.toLowerCase() === "all") {
            const allCmds = commands
                .filter(cmd => cmd.name)
                .sort((a, b) => a.name.localeCompare(b.name));

            if (allCmds.length === 0) {
                return api.sendMessage("❌ No commands available.", threadID, messageID);
            }

            let msg = `╔══════════════════╗
     🤖 ALL COMMANDS (A-Z)
╚══════════════════╝\n\n`;

            allCmds.forEach(cmd => {
                const desc = cmd.description || "No description";
                const adminTag = cmd.admin ? " 👑" : "";
                msg += `🔹 ${botPrefix}${cmd.name}${adminTag}\n   → ${desc}\n\n`;
            });

            msg += `💡 Tip: Type \`${botPrefix}help <command>\` for details.`;
            return api.sendMessage(msg, threadID, messageID);
        }

        // --- 3. Default: Categorized Menu ---
        const categories = {
            "🤖 AI & Chat": [
                "ai", "gemini", "gptnano",
                "you", "webpilot", "quillbot", "venice", "aria", "copilot", "xdash"
            ],
            "🎧 Media & Fun": [
                "spotify", "lyrics", "pinterest", "screenshot", 
                "deepimg", "post", "8ball", "bible", "48laws"
            ],
            "🛠️ Tools & Utility": [
                "translate", "dict", "remind", "uptime",
                "help", "prefix", "myid"
            ],
            "⚙️ Admin & System": [
                "kick", "add", "leave", "notify", 
                "unsend", "changeavatar", "restart", "cmd", "welcome"
            ]
        };

        let msg = `╔══════════════════╗
     🤖 BOT MENU
╚══════════════════╝\n`;

        let listed = new Set();

        for (const [category, cmdList] of Object.entries(categories)) {
            const available = cmdList.filter(name => {
                const cmd = global.commands.get(name);
                return cmd && cmd.name && !listed.has(cmd.name);
            });

            if (available.length > 0) {
                msg += `\n➤ **${category}**\n`;
                available.forEach(name => {
                    const cmd = global.commands.get(name);
                    const adminTag = cmd?.admin ? " 👑" : "";
                    msg += `  • ${botPrefix}${name}${adminTag}\n`;
                    listed.add(cmd.name);
                });
            }
        }

        // Add any unlisted commands under "Others"
        const others = commands
            .filter(cmd => cmd.name && !listed.has(cmd.name))
            .sort((a, b) => a.name.localeCompare(b.name));

        if (others.length > 0) {
            msg += `\n➤ **📂 Others**\n`;
            others.forEach(cmd => {
                const adminTag = cmd.admin ? " 👑" : "";
                msg += `  • ${botPrefix}${cmd.name}${adminTag}\n`;
            });
        }

        msg += `\n💡 Type \`${botPrefix}help all\` to see all commands.\n`;
        msg += `💡 Type \`${botPrefix}help <command>\` for details.`;

        return api.sendMessage(msg, threadID, messageID);
    }
};
