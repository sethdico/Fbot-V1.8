// cmds/help.js
module.exports = {
    name: "help",
    usePrefix: false,
    usage: "help [command] | help all",
    version: "6.1",
    description: "Smart help menu with auto-categories and no duplicates.",
    execute({ api, event, args }) {
        const { threadID, messageID } = event;
        const botPrefix = (global.config && typeof global.config.prefix === 'string') 
            ? global.config.prefix 
            : "/";

        // ✅ Get UNIQUE command objects (not per alias)
        const uniqueCommands = [...new Map(global.commands.entries()).values()]
            .filter(cmd => cmd.name); // Only valid commands

        // --- /help <command> ---
        if (args.length > 0 && args[0].toLowerCase() !== "all") {
            const cmdName = args[0].toLowerCase();
            const cmd = global.commands.get(cmdName);
            if (!cmd) {
                return api.sendMessage(`❌ Command "${cmdName}" not found.`, threadID, messageID);
            }
            const aliases = cmd.aliases?.length ? cmd.aliases.join(", ") : "None";
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

        // --- /help all ---
        if (args[0]?.toLowerCase() === "all") {
            const sorted = uniqueCommands.sort((a, b) => a.name.localeCompare(b.name));
            let msg = `╔══════════════════╗
     🤖 ALL COMMANDS (A-Z)
╚══════════════════╝\n`;
            sorted.forEach(cmd => {
                const adminTag = cmd.admin ? " 👑" : "";
                const desc = cmd.description || "No description";
                msg += `🔹 ${botPrefix}${cmd.name}${adminTag}\n   → ${desc}\n`;
            });
            msg += `\n💡 Tip: Type \`${botPrefix}help <command>\` for details.`;
            return api.sendMessage(msg, threadID, messageID);
        }

        // --- AUTO-CATEGORIZED MENU (NO DUPLICATES!) ---
        const categories = {
            "🤖 AI & Smart Tools": [],
            "🎮 Entertainment & Fun": [],
            "🛠️ Utilities & Info": [],
            "👑 Admin & System": [],
            "📦 Others": []
        };

        const aiKeywords = ["ai", "gemini", "gpt", "copilot", "you", "webpilot", "quill", "venice", "aria", "xdash", "nano", "bard", "vision"];
        const funKeywords = ["8ball", "bible", "48laws", "deepimg", "lyrics", "pinterest", "spotify", "post"];
        const utilKeywords = ["dict", "trans", "remind", "uptime", "myid", "prefix", "debug", "define", "meaning", "wiki"];

        uniqueCommands.forEach(cmd => {
            const name = cmd.name.toLowerCase();
            let placed = false;

            if (cmd.admin) {
                categories["👑 Admin & System"].push(cmd);
                placed = true;
            }
            else if (aiKeywords.some(kw => name.includes(kw))) {
                categories["🤖 AI & Smart Tools"].push(cmd);
                placed = true;
            }
            else if (funKeywords.some(kw => name.includes(kw))) {
                categories["🎮 Entertainment & Fun"].push(cmd);
                placed = true;
            }
            else if (utilKeywords.some(kw => name.includes(kw))) {
                categories["🛠️ Utilities & Info"].push(cmd);
                placed = true;
            }

            if (!placed) {
                categories["📦 Others"].push(cmd);
            }
        });

        // --- BUILD MESSAGE ---
        let msg = `╔══════════════════╗
     🤖 SMART HELP MENU
╚══════════════════╝\n`;

        for (const [category, cmds] of Object.entries(categories)) {
            if (cmds.length > 0) {
                msg += `\n➤ **${category}**\n`;
                cmds
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .forEach(cmd => {
                        const adminTag = cmd.admin ? " 👑" : "";
                        const cooldownTag = cmd.cooldown ? ` ⏱️${cmd.cooldown}s` : "";
                        msg += `  • ${botPrefix}${cmd.name}${adminTag}${cooldownTag}\n`;
                    });
            }
        }

        msg += `\n💡 Type \`${botPrefix}help all\` to see all commands.`;
        msg += `\n💡 Type \`${botPrefix}help <command>\` for usage details.`;

        api.sendMessage(msg, threadID, messageID);
    }
};
