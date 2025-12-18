module.exports = {
    name: "help",
    aliases: ["h", "menu"],
    usePrefix: false,
    admin: false,
    cooldown: 3,
    description: "View the command list and categories.",
    usage: "help [command] | help all | help [category]",

    execute({ api, event, args }) {
        const { threadID, messageID } = event;
        const prefix = global.config?.prefix || "/";

        const cmds = Array.from(global.commands.values());
        // Filter unique commands to avoid listing aliases
        const uniqueCmds = [...new Map(cmds.map(c => [c.name, c])).values()];

        // 1. DETAIL VIEW (Usage: /help ai)
        if (args.length > 0 && !["all", "ai", "fun", "info", "tools", "admin", "group"].includes(args[0].toLowerCase())) {
            const query = args[0].toLowerCase();
            const cmd = global.commands.get(query);

            if (!cmd) return api.sendMessage(`❌ Command "${query}" not found.`, threadID, messageID);

            return api.sendMessage(
                `📖 **COMMAND INFO: ${cmd.name.toUpperCase()}**\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `📝 **Desc:** ${cmd.description || "No description"}\n` +
                `⌨️ **Usage:** ${cmd.usage || prefix + cmd.name}\n` +
                `⏱️ **Wait:** ${cmd.cooldown || 0}s\n` +
                `👑 **Admin:** ${cmd.admin ? "Yes" : "No"}\n` +
                `🔗 **Aliases:** ${cmd.aliases ? cmd.aliases.join(", ") : "None"}`,
                threadID, messageID
            );
        }

        // 2. CATEGORIES LOGIC
        const categories = {
            "🤖 AI": ["ai", "aria", "copilot", "deepimg", "gemini", "gptnano", "quillbot", "venice", "webpilot", "xdash", "you"],
            "🎮 FUN": ["48laws", "8ball", "bible", "pair"],
            "🌍 INFO": ["define", "translate", "wiki", "stalk", "friendlist", "uid", "avatar", "pfp", "gcinfo"],
            "⚡ TOOLS": ["remind", "uptime", "debug", "unsend", "loc", "say"],
            "🔄 GROUP": ["theme", "nickname", "pin", "promote", "rename", "setemoji", "tagall", "kick", "leave"],
            "👑 ADMIN": ["accept", "add", "addfriend", "inbox", "logout", "note", "notify", "pending", "pm", "restart", "story", "token", "welcome", "api_debug"]
        };

        // 3. SHOW ALL VIEW (Usage: /help all)
        if (args[0]?.toLowerCase() === "all") {
            let allMsg = `📜 **FULL COMMAND LIST (${uniqueCmds.length})**\n\n`;
            uniqueCmds.sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
                allMsg += `• ${prefix}${c.name}${c.admin ? " 👑" : ""}\n`;
            });
            allMsg += `\n💡 Type ${prefix}help <name> for details.`;
            return api.sendMessage(allMsg, threadID, messageID);
        }

        // 4. CATEGORY DETAIL VIEW (Usage: /help ai)
        const requestedCat = Object.keys(categories).find(k => k.toLowerCase().includes(args[0]?.toLowerCase()));
        if (requestedCat) {
            let catMsg = `${requestedCat} **COMMANDS**\n━━━━━━━━━━━━━━━━━━\n`;
            categories[requestedCat].forEach(name => {
                const c = global.commands.get(name);
                if (c) catMsg += `🔹 ${prefix}${c.name}\n`;
            });
            return api.sendMessage(catMsg, threadID, messageID);
        }

        // 5. DEFAULT MENU (Usage: /help)
        let menuMsg = `╔═════════════════╗\n    🤖 **SYSTEM MENU**\n╚═════════════════╝\n`;
        menuMsg += `👋 Hello! I have **${uniqueCmds.length}** commands.\n\n`;
        
        Object.entries(categories).forEach(([name, list]) => {
            const count = list.filter(n => global.commands.has(n)).length;
            if (count > 0) menuMsg += `${name} (${count} cmds)\n`;
        });

        menuMsg += `\n━━━━━━━━━━━━━━━━━━\n`;
        menuMsg += `🔍 **View Category:** \`${prefix}help <category_name>\`\n`;
        menuMsg += `📜 **View All:** \`${prefix}help all\`\n`;
        menuMsg += `💡 **Command Details:** \`${prefix}help <command>\``;

        return api.sendMessage(menuMsg, threadID, messageID);
    }
};
