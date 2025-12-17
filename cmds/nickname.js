module.exports = {
    name: "nickname",
    aliases: ["setnick", "nick"],
    usePrefix: false,
    admin: false, // Everyone can use (add logic if you want restrictions)
    description: "Change a user's nickname.",
    usage: "nick @mention <new_name> | nick <new_name> (for self)",
    
    execute: async ({ api, event, args }) => {
        const { threadID, senderID, mentions } = event;
        let targetID = senderID;
        let newName = args.join(" ");

        // Check if a user is mentioned
        if (Object.keys(mentions).length > 0) {
            targetID = Object.keys(mentions)[0];
            // Remove the mention from the name
            newName = newName.replace(mentions[targetID], "").trim();
        }

        if (!newName) return api.sendMessage("⚠️ Provide a nickname.", threadID);

        try {
            // api.nickname(name, threadID, userID)
            await api.nickname(newName, threadID, targetID);
            api.sendMessage("✅ Nickname updated.", threadID);
        } catch (e) {
            api.sendMessage("❌ Failed to change nickname.", threadID);
        }
    }
};
