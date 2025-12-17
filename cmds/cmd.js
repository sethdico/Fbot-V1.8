module.exports = {
    name: "cmd",
    aliases: ["admincmd", "acmd"],
    usePrefix: false,
    admin: true,
    cooldown: 3,
    version: "2.0",
    usage: "cmd",
    description: "Shows all admin-only commands available to you.",
    async execute({ api, event }) {
        const adminCommands = Array.from(global.commands.values())
            .filter(cmd => cmd.admin === true)
            .map(cmd => ({
                name: cmd.name,
                description: cmd.description || "No description",
                cooldown: cmd.cooldown || 3
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
        
        if (adminCommands.length === 0) {
            return api.sendMessage("❌ No admin commands found.", event.threadID);
        }
        
        const botPrefix = global.config?.prefix || "/";
        let msg = `╔═════════════════════════╗
        🔐 ADMIN COMMANDS
╚═════════════════════════╝\n`;
        
        adminCommands.forEach(cmd => {
            msg += `🔹 ${botPrefix}${cmd.name} ⏱️${cmd.cooldown}s\n   → ${cmd.description}\n`;
        });
        
        msg += `\n💡 Usage: ${botPrefix}help <command> for details on any command.`;
        return api.sendMessage(msg, event.threadID);
    }
};
