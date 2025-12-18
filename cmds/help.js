module.exports = {
    name: "help",
    aliases: ["menu", "h", "commands"],
    usePrefix: false, // Works with or without prefix
    description: "Shows you the fun things I can do!",
    usage: "help",

    execute: async ({ api, event, args, config }) => {
        const { threadID, senderID } = event;
        const prefix = config.prefix || "/";

        // 1. Check Permissions (To hide admin commands from regular members)
        const isOwner = String(senderID) === String(config.ownerID);
        const isAdmin = config.admin.includes(String(senderID));
        const hasPerms = isOwner || isAdmin;

        // 2. Get and Sort Commands
        const commands = Array.from(global.commands.values());
        // Remove duplicates (aliases)
        const uniqueCmds = [...new Map(commands.map(c => [c.name, c])).values()];
        
        // Filter: Show only commands the user can actually use
        const visibleCmds = uniqueCmds.filter(cmd => {
            if (cmd.admin && !hasPerms) return false; // Hide admin commands
            return true;
        });

        // Sort alphabetically (A-Z)
        visibleCmds.sort((a, b) => a.name.localeCompare(b.name));

        // ============================
        // 🔎 HELP FOR SPECIFIC COMMAND
        // ============================
        if (args[0]) {
            const cmdName = args[0].toLowerCase();
            const cmd = global.commands.get(cmdName);

            // If command doesn't exist or is hidden
            if (!cmd || (cmd.admin && !hasPerms)) {
                return api.sendMessage(`🤔 Hmmm... I don't know a command called "${cmdName}".`, threadID);
            }

            const msg = `
📘 **Help: ${cmd.name.toUpperCase()}**
━━━━━━━━━━━━━━━━
✨ **What it does:**
${cmd.description || "Something cool!"}

⌨️ **Type this:**
${cmd.usage ? cmd.usage : `${prefix}${cmd.name}`}

${cmd.aliases ? `🖇️ **Shortcuts:** ${cmd.aliases.join(", ")}` : ""}
━━━━━━━━━━━━━━━━
`;
            return api.sendMessage(msg, threadID);
        }

        // ============================
        // 📜 MAIN MENU (Clean List)
        // ============================
        const cmdList = visibleCmds.map(c => `/${c.name}`).join(", ");
        const randomCmd = visibleCmds[Math.floor(Math.random() * visibleCmds.length)].name;

        const msg = `
🤖 **Hello! I am ${config.botName || "Amadeus"}!**
Here are the cool things I can do:

━━━━━━━━━━━━━━━━
${cmdList}
━━━━━━━━━━━━━━━━

💡 **Tip:** Want to know more about a command?
Type: \`/help <name>\` (Example: \`/help ${randomCmd}\`)
        `;

        return api.sendMessage(msg, threadID);
    }
};
