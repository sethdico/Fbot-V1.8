module.exports = {
    name: "cmd",
    usePrefix: false,
    admin: true,
    usage: "cmd",
    description: "Show admin-only commands.",

    async execute({ api, event }) {
        const adminCommands = Array.from(global.commands.values())
            .filter(cmd => cmd.admin === true)
            .map(cmd => cmd.name)
            .sort();

        if (adminCommands.length === 0) {
            return api.sendMessage("❌ No admin commands found.", event.threadID);
        }

        const msg = `
╔════════════╗
   🔐 ADMIN COMMANDS
╚════════════╝

${adminCommands.join(", ")}

⚠️ authorized personnel only.
`;

        return api.sendMessage(msg, event.threadID);
    }
};
