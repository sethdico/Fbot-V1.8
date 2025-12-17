module.exports = {
    name: "kick",
    usePrefix: false,
    admin: true,
    description: "Remove a user from the group.",
    usage: "kick (reply/mention)",
    cooldown: 5,

    execute: async ({ api, event }) => {
        const { threadID, messageReply, mentions } = event;
        if (!event.isGroup) return api.sendMessage("❌ Groups only.", threadID);

        // 1. Get Target ID
        let targetID;
        if (messageReply) targetID = messageReply.senderID;
        else if (Object.keys(mentions).length > 0) targetID = Object.keys(mentions)[0];
        else return api.sendMessage("⚠️ Reply to a user to kick.", threadID);

        if (targetID === api.getCurrentUserID()) return api.sendMessage("❌ I cannot kick myself.", threadID);

        api.sendMessage("👋 Begone!", threadID);

        try {
            // 🔍 CHECK 1: NethWs3Dev Library (gcmember)
            if (typeof api.gcmember === 'function') {
                // This library uses a special function: gcmember("remove", id, thread)
                await api.gcmember("remove", targetID, threadID);
            } 
            // 🔍 CHECK 2: Standard Libraries
            else if (typeof api.removeUserFromGroup === 'function') {
                await api.removeUserFromGroup(targetID, threadID);
            } 
            // 🔍 CHECK 3: Other Forks
            else if (typeof api.removeParticipant === 'function') {
                await api.removeParticipant(targetID, threadID);
            } 
            else {
                throw new Error("No kick function found in this library version.");
            }

        } catch (err) {
            console.error("Kick Error:", err);
            
            // Check for the "Add/Remove" object error from NethWs3Dev
            if (err.type === "error_gc" || (err.error && err.error.includes("permissions"))) {
                return api.sendMessage("❌ Failed: Permissions error. Make sure I am Admin and the target is NOT Admin.", threadID);
            }

            api.sendMessage(`❌ Failed to kick user.`, threadID);
        }
    }
};
