module.exports = {
    name: "kick",
    usePrefix: false,
    admin: true,
    description: "Remove a user from the group.",
    usage: "kick (reply/mention)",
    cooldown: 5,

    execute: async ({ api, event }) => {
        if (!event.isGroup) return api.sendMessage("❌ Groups only.", event.threadID);
        
        let targetID = event.messageReply ? event.messageReply.senderID : Object.keys(event.mentions)[0];
        if (!targetID) return api.sendMessage("⚠️ Reply to a user to kick.", event.threadID);

        try {
            // Try the NethWs3Dev function first
            if (typeof api.gcmember === 'function') {
                await api.gcmember("remove", targetID, event.threadID);
            } else {
                // Fallback for other versions
                await api.removeUserFromGroup(targetID, event.threadID);
            }
            api.sendMessage("👋 Begone!", event.threadID);
        } catch (err) {
            api.sendMessage("❌ Failed to kick. Ensure I am Admin.", event.threadID);
        }
    }
};
