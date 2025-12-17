module.exports = {
    name: "pending",
    aliases: ["requests", "frequests"],
    usePrefix: false,
    admin: true,
    description: "View pending friend requests.",
    
    execute: async ({ api, event }) => {
        try {
            // api.friend.requests() returns an array
            const requests = await api.friend.requests();
            
            if (requests.length === 0) {
                return api.sendMessage("📭 No pending friend requests.", event.threadID);
            }

            let msg = "👥 **FRIEND REQUESTS**\n━━━━━━━━━━━━━━━━\n";
            requests.forEach((req, i) => {
                msg += `${i+1}. ${req.name}\n🆔 ${req.userID}\n\n`;
            });
            msg += "💡 Use 'accept <uid>' to add them.";

            api.sendMessage(msg, event.threadID);
        } catch (e) {
            api.sendMessage("❌ Error fetching requests.", event.threadID);
        }
    }
};
