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

        // 2. 🔍 AUTO-DETECT THE FUNCTION NAME
        // We look for any function in the API that sounds like "remove" or "kick"
        const apiFunctions = Object.keys(api);
        const kickFunction = apiFunctions.find(func => 
            func === "removeUserFromGroup" || 
            func === "removeParticipant" || 
            func === "removeMember"
        );

        if (!kickFunction) {
            console.log("❌ Available API Functions:", apiFunctions.filter(f => f.includes("remove")));
            return api.sendMessage("❌ CRITICAL: Your bot library (ws3-fca) is missing the 'removeUserFromGroup' function. It cannot kick people.", threadID);
        }

        api.sendMessage(`⚙️ Using function: api.${kickFunction}()...`, threadID);

        try {
            // 3. Execute the detected function
            await api[kickFunction](targetID, threadID);
            api.sendMessage("👋 Begone!", threadID);

        } catch (err) {
            console.error("Kick Error Full Object:", err);
            
            // 4. IMPROVED ERROR READING
            // We check .message, .error, and .summary to ensure we get the real reason
            const errorMsg = err.message || err.error || err.summary || JSON.stringify(err);

            if (errorMsg.includes("1357004") || errorMsg.includes("permissions")) {
                return api.sendMessage("❌ Failed: I do not have permission. Make sure I am Admin and the target is NOT Admin.", threadID);
            }

            api.sendMessage(`❌ Failed to kick user.\n🛑 Reason: ${errorMsg}`, threadID);
        }
    }
};
