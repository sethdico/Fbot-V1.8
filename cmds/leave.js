module.exports = {
    name: "leave",
    usePrefix: false,
    description: "Make the bot leave the current group.",
    usage: "leave",
    cooldown: 5,
    admin: true,

    async execute({ api, event, args }) {
        const threadID = event.threadID;

        // 1. Safety Check: Is this a group?
        if (!event.isGroup) {
            return api.sendMessage("⚠️ I can only leave groups, not private chats.", threadID);
        }

        // 2. Prepare Goodbye Message
        const tagEveryone = {
            body: "👋 Goodbye everyone! usage of the bot has been revoked.",
            mentions: [{
                tag: "@everyone",
                id: threadID
            }]
        };

        try {
            // 3. Send message first, then leave
            await api.sendMessage(tagEveryone, threadID);
            
            // 4. Leave the group
            await api.removeUserFromGroup(api.getCurrentUserID(), threadID);
            
        } catch (err) {
            console.error("❌ Error leaving group:", err);
            // If we can't send the message (maybe muted), try to force leave anyway
            try {
                await api.removeUserFromGroup(api.getCurrentUserID(), threadID);
            } catch (e) {
                api.sendMessage("❌ I am trying to leave, but Facebook is blocking the request.", threadID);
            }
        }
    }
};
