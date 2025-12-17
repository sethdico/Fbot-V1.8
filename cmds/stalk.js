module.exports = {
    name: "stalk",
    usePrefix: false,
    description: "Get info about a user.",
    usage: "stalk @mention | stalk",
    
    execute: async ({ api, event, args }) => {
        let targetID = event.senderID;
        
        if (event.mentions && Object.keys(event.mentions).length > 0) {
            targetID = Object.keys(event.mentions)[0];
        } else if (args[0]) {
            targetID = args[0];
        }

        try {
            // api.getUserInfo(id, callback)
            api.getUserInfo(targetID, (err, data) => {
                if (err) return api.sendMessage("❌ Could not fetch user info.", event.threadID);
                
                // If fetching single user, data is an object. If array, it's an array.
                const user = data[targetID] || data;
                
                if (!user) return api.sendMessage("❌ User not found.", event.threadID);

                const msg = `
👤 **USER INFO**
━━━━━━━━━━━━━━━━
📛 Name: ${user.name}
🆔 ID: ${targetID}
🚻 Gender: ${user.gender === 1 ? "Female" : "Male"}
🔗 Profile: ${user.profileUrl}
🎂 Birthday: ${user.isBirthday ? "Today! 🎂" : "Not Today"}
🖼️ Pic: ${user.thumbSrc || user.profilePicUrl}
                `;
                
                api.sendMessage(msg, event.threadID);
            });
        } catch (e) {
            api.sendMessage("❌ Error retrieving data.", event.threadID);
        }
    }
};
