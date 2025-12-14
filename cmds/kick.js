module.exports = {
    name: "kick",
    usePrefix: false,
    admin: true,
    description: "Remove a user from the group.",
    usage: "Reply to a message or mention @user",
    cooldown: 5,

    execute: async ({ api, event }) => {
        if (!event.isGroup) return api.sendMessage("❌ This command only works in groups.", event.threadID);

        let targetID;

        // Check if reply
        if (event.messageReply) {
            targetID = event.messageReply.senderID;
        } 
        // Check if mention
        else if (Object.keys(event.mentions).length > 0) {
            targetID = Object.keys(event.mentions)[0];
        } else {
            return api.sendMessage("⚠️ Please reply to a user or mention them to kick.", event.threadID);
        }

        if (targetID === api.getCurrentUserID()) {
            return api.sendMessage("❌ I cannot kick myself.", event.threadID);
        }

        try {
            await api.removeUserFromGroup(targetID, event.threadID);
            api.sendMessage("👋 Begone!", event.threadID);
        } catch (err) {
            console.error(err);
            api.sendMessage("❌ Failed to kick user. Make sure I am an Admin in this group.", event.threadID);
        }
    }
};
