module.exports = {
    name: "leave",
    usePrefix: false,
    description: "Make the bot leave the current group.",
    usage: "leave",
    cooldown: 5,
    admin: true,

    async execute({ api, event }) {
        const threadID = event.threadID;

        // 1. Safety Check: Is this a group?
        if (!event.isGroup) {
            return api.sendMessage("⚠️ I can only leave groups, not private chats.", threadID);
        }

        // 2. Prepare Goodbye Message
        const tagEveryone = {
            body: "👋 Goodbye everyone! Usage of the bot has been revoked.",
            mentions: [{
                tag: "@everyone",
                id: threadID
            }]
        };

        try {
            // 3. Send message first
            await api.sendMessage(tagEveryone, threadID);
            
            const botID = String(api.getCurrentUserID());

            // 4. 🔍 NethWs3Dev Library Support (The Critical Fix)
            if (typeof api.gcmember === 'function') {
                // api.gcmember("remove", userID, threadID)
                await api.gcmember("remove", botID, threadID);
            } 
            // Standard Library Fallbacks
            else if (typeof api.removeUserFromGroup === 'function') {
                await api.removeUserFromGroup(botID, threadID);
            } 
            else if (typeof api.removeParticipant === 'function') {
                await api.removeParticipant(botID, threadID);
            }
            else {
                throw new Error("No remove function found in API.");
            }

            console.log("✅ Successfully left the group.");

        } catch (err) {
            console.error("Leave Error:", err);
            api.sendMessage("❌ I tried to leave, but the library function failed. Please kick me manually.", threadID);
        }
    }
};
