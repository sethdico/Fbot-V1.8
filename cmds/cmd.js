module.exports = {
    name: "cmd",
    aliases: ["admin", "panel", "acmd"],
    usePrefix: false, // Works with or without prefix
    admin: true, // This command is strictly for admins
    description: "Shows the secret Admin Control Panel.",

    execute: async ({ api, event, config }) => {
        const { threadID, senderID } = event;
        const prefix = config.prefix || "/";

        // 1. Security Check (Double verification)
        const isOwner = String(senderID) === String(config.ownerID);
        const isAdmin = config.admin.includes(String(senderID));

        if (!isOwner && !isAdmin) {
            return api.setMessageReaction("🔒", event.messageID, () => {}, true);
        }

        // 2. Find all Admin Commands dynamically
        // We get all commands, remove duplicates, and keep only the ones with 'admin: true'
        const commands = Array.from(global.commands.values());
        const adminCmds = [...new Map(commands.map(c => [c.name, c])).values()]
            .filter(cmd => cmd.admin === true)
            .sort((a, b) => a.name.localeCompare(b.name));

        if (adminCmds.length === 0) {
            return api.sendMessage("⚠️ No admin commands found loaded.", threadID);
        }

        // 3. Build the Panel Message
        let msg = `🔐 **ADMIN CONTROL PANEL**\n`;
        msg += `━━━━━━━━━━━━━━━━\n`;
        msg += `👑 **Access Granted.**\n`;
        msg += `Active Admin Tools: **${adminCmds.length}**\n\n`;

        adminCmds.forEach(cmd => {
            msg += `🔴 **${prefix}${cmd.name}**\n`;
            // Only show description if it exists
            if (cmd.description) {
                msg += `   └ _${cmd.description}_\n`;
            }
        });

        msg += `\n━━━━━━━━━━━━━━━━\n`;
        msg += `⚠️ **Warning:** Use these commands with caution.`;

        return api.sendMessage(msg, threadID);
    }
};
