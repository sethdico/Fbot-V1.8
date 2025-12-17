module.exports = {
    name: "kick",
    usePrefix: false,
    admin: true,
    description: "Remove a user from the group.",
    usage: "Reply to a message or mention @user",
    cooldown: 5,

    execute: async ({ api, event }) => {
        const { threadID, messageReply, mentions } = event;

        if (!event.isGroup) return api.sendMessage("❌ This command only works in groups.", threadID);

        let targetID;

        // 1. Determine who to kick
        if (messageReply) {
            targetID = messageReply.senderID;
        } else if (Object.keys(mentions).length > 0) {
            targetID = Object.keys(mentions)[0];
        } else {
            return api.sendMessage("⚠️ Please reply to a user or mention them to kick.", threadID);
        }

        // 2. Prevent kicking self
        if (targetID === api.getCurrentUserID()) {
            return api.sendMessage("❌ I cannot kick myself.", threadID);
        }

        try {
            // 3. Check Thread Info to see if Target is Admin
            const threadInfo = await api.getThreadInfo(threadID);
            const adminIDs = threadInfo.adminIDs.map(u => u.id).map(String); // Convert to strings

            // Check if Bot is Admin
            if (!adminIDs.includes(String(api.getCurrentUserID()))) {
                 return api.sendMessage("❌ I need to be an Admin to kick people. Please promote me first.", threadID);
            }

            // Check if Target is Admin
            if (adminIDs.includes(String(targetID))) {
                return api.sendMessage("🛡️ **Access Denied:** The target user is an Admin/Moderator. Facebook does not allow me to kick them.", threadID);
            }

            // 4. Execute Kick
            await api.removeUserFromGroup(targetID, threadID);
            return api.sendMessage("👋 Begone!", threadID);

        } catch (err) {
            console.error("Kick Error:", err);
            
            // Handle specific Facebook errors
            if (err.error === 1357004) {
                return api.sendMessage("❌ Failed: I don't have permission. Ensure I am an Admin and the target is NOT an Admin.", threadID);
            }
            
            return api.sendMessage(`❌ Failed to kick user.\nError Code: ${err.error || "Unknown"}`, threadID);
        }
    }
};
