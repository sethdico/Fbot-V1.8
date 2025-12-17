module.exports = {
    name: "friendlist",
    aliases: ["friends", "flist"],
    usePrefix: false,
    description: "View a user's public friend list.",
    usage: "friendlist @mention | friendlist <uid>",
    
    execute: async ({ api, event, args }) => {
        let targetID = args[0];
        if (event.mentions && Object.keys(event.mentions).length > 0) {
            targetID = Object.keys(event.mentions)[0];
        }
        if (!targetID) targetID = event.senderID;

        try {
            api.sendMessage(`🔍 Fetching friend list for ${targetID}...`, event.threadID);
            
            // api.friend.list(userID)
            const friends = await api.friend.list(targetID);
            
            if (!friends || friends.length === 0) {
                return api.sendMessage("🔒 Friend list is private or empty.", event.threadID);
            }

            let msg = `👥 **FRIENDS LIST (${friends.length} found)**\n━━━━━━━━━━━━━━━━\n`;
            // Limit to 15 to avoid spam
            friends.slice(0, 15).forEach((f, i) => {
                msg += `${i+1}. ${f.name}\n`;
            });
            
            if (friends.length > 15) msg += `\n...and ${friends.length - 15} more.`;

            api.sendMessage(msg, event.threadID);

        } catch (e) {
            api.sendMessage("❌ Error. Profile might be locked/private.", event.threadID);
        }
    }
};
