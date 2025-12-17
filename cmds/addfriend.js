module.exports = {
    name: "addfriend",
    usePrefix: false,
    admin: true, // Owner only
    description: "Send a friend request to a user.",
    usage: "addfriend <uid>",
    
    execute: async ({ api, event, args }) => {
        const targetID = args[0];
        if (!targetID) return api.sendMessage("⚠️ Usage: addfriend <uid>", event.threadID);

        try {
            // api.friend.suggest.request(userID)
            await api.friend.suggest.request(targetID);
            api.sendMessage(`✅ Friend request sent to ${targetID}.`, event.threadID);
        } catch (e) {
            api.sendMessage("❌ Failed. ID might be invalid or user blocked bot.", event.threadID);
        }
    }
};
