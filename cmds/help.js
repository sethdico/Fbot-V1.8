// cmds/help.js
module.exports = {
    name: "help",
    usePrefix: false,
    usage: "help [command] | help all",
    version: "5.1",
    description: "Shows all commands or detailed info for a specific one.",
    execute({ api, event, args }) {
        const { threadID, messageID } = event;
        const botPrefix = global.config?.prefix || "/";

        // ✅ Get UNIQUE command objects (no alias duplicates)
        const uniqueCommands = [...new Set(global.commands.values())].filter(cmd => cmd.name);

        // --- 1. /help <specific command> ---
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
👑 **Admin Only:** ${admin}`,
                threadID,
                messageID
            );
        }

        // --- 2. /help all ---
        if (args[0]?.toLowerCase() === "all") {
            const allCmds = uniqueCommands.sort((a, b) => a.name.localeCompare(b.name));
            if (allCmds.length === 0) {
                return api.sendMessage("❌ No commands available.", threadID, messageID);
            }
            let msg = `╔══════════════════╗
     🤖 ALL COMMANDS (A-Z)
╚══════════════════╝\n`;
            allCmds.forEach(cmd => {
                const adminTag = cmd.admin ? " 👑" : "";
                const desc = cmd.description || "No description";
                msg += `🔹 ${botPrefix}${cmd.name}${adminTag}\n   → ${desc}\n`;
            });
            msg += `\n💡 Tip: Type \`${botPrefix}help <command>\` for details.`;
            return api.sendMessage(msg, threadID, messageID);
        }

        // --- 3. MANUAL CATEGORIES (NO AUTO-DETECTION) ---
        const categories = {
            "🤖 AI & Smart Tools": [
                "ai", "gemini", "gptnano", "you", "webpilot",
                "quillbot", "venice", "aria", "copilot", "xdash"
            ],
            "🎮 Entertainment & Fun": [
                "8ball", "bible", "48laws", "deepimg"
            ],
            "🛠️ Utilities & Info": [
                "dict", "translate", "remind", "uptime", "debug", "myid"
            ],
            "👑 Admin & System": [
                "add", "kick", "leave", "notify", "welcome", 
                "changeavatar", "cmd", "api_debug"
            ],
            "📦 Others": [
                "help", "unsend"
            ]
        };

        let msg = `╔══════════════════╗
     🤖 SMART HELP MENU
╚══════════════════╝\n`;

        // Track which commands we've already shown (to avoid duplicates from aliases)
        const shown = new Set();

        for (const [category, cmdList] of Object.entries(categories)) {
            const available = cmdList
                .map(name => global.commands.get(name))
                .filter(cmd => cmd && cmd.name && !shown.has(cmd.name));

            if (available.length > 0) {
                msg += `\n➤ **${category}**\n`;
                available.forEach(cmd => {
                    const adminTag = cmd.admin ? " 👑" : "";
                    const cooldownTag = cmd.cooldown ? ` ⏱️${cmd.cooldown}s` : "";
                    msg += `  • ${botPrefix}${cmd.name}${adminTag}${cooldownTag}\n`;
                    shown.add(cmd.name);
                });
            }
        }

        // Show any leftover commands (should be none if list is complete)
        const others = uniqueCommands.filter(cmd => !shown.has(cmd.name));
        if (others.length > 0) {
            msg += `\n➤ **📦 Others**\n`;
            others.forEach(cmd => {
                const adminTag = cmd.admin ? " 👑" : "";
                const cooldownTag = cmd.cooldown ? ` ⏱️${cmd.cooldown}s` : "";
                msg += `  • ${botPrefix}${cmd.name}${adminTag}${cooldownTag}\n`;
            });
        }

        msg += `\n💡 Type \`${botPrefix}help all\` to see all commands.`;
        msg += `\n💡 Type \`${botPrefix}help <command>\` for usage details.`;

        return api.sendMessage(msg, threadID, messageID);
    }
};
