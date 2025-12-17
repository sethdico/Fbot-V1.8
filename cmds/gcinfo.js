module.exports = {
    name: "gcinfo",
    aliases: ["groupinfo"],
    usePrefix: false,
    description: "Shows detailed information about the group.",
    
    execute: async ({ api, event }) => {
        if (!event.isGroup) return api.sendMessage("❌ This command is for groups only.", event.threadID);

        try {
            const info = await api.getThreadInfo(event.threadID);
            
            const adminCount = info.adminIDs.length;
            const memberCount = info.participantIDs.length;
            const approvalMode = info.approvalMode ? "ON" : "OFF";
            const emoji = info.emoji || "👍";
            
            // Create a nice report
            const msg = `
📊 **GROUP INFORMATION**
━━━━━━━━━━━━━━━━
📛 Name: ${info.threadName || "Unnamed Group"}
🆔 ID: ${info.threadID}
👥 Members: ${memberCount}
👑 Admins: ${adminCount}
🎨 Emoji: ${emoji}
🛡️ Approval Mode: ${approvalMode}
📨 Message Count: ${info.messageCount}
━━━━━━━━━━━━━━━━
`;
            api.sendMessage(msg, event.threadID);
        } catch (e) {
            api.sendMessage("❌ Failed to fetch group info.", event.threadID);
        }
    }
};
