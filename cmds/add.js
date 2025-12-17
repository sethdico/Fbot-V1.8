module.exports = {
    name: "add",
    usePrefix: false,
    admin: true, // Only you (Owner) can use this
    description: "List groups the bot is in and add yourself to them.",
    usage: "add list | add <number>",
    cooldown: 5,

    async execute({ api, event, args, config }) {
        const { threadID } = event;

        // 1. Wrapper to catch crashes
        try {
            // Fetch the last 50 conversations (Safe limit to prevent crashing)
            // We assume the bot is active in the group you want to join.
            const threadList = await api.getThreadList(50, null, ["INBOX"]);
            
            // Filter: Keep only Group Chats
            const groups = threadList.filter(t => t.isGroup);

            // --- OPTION A: LIST GROUPS ---
            // Usage: /add list
            if (args[0] && args[0].toLowerCase() === "list") {
                if (groups.length === 0) {
                    return api.sendMessage("❌ No groups found in the bot's recent inbox.", threadID);
                }

                let msg = "📋 **Available Groups:**\n━━━━━━━━━━━━━━━━\n";
                groups.forEach((group, i) => {
                    const name = group.name || "Unnamed Group";
                    msg += `**${i + 1}.** ${name}\nID: ${group.threadID}\n\n`;
                });
                msg += "━━━━━━━━━━━━━━━━\n💡 Usage: `/add <number>` to join.";
                
                return api.sendMessage(msg, threadID);
            }

            // --- OPTION B: ADD OWNER TO GROUP ---
            // Usage: /add 1
            const index = parseInt(args[0]) - 1;

            if (isNaN(index)) {
                return api.sendMessage("⚠️ Invalid usage.\n1. Type `/add list` to see groups.\n2. Type `/add <number>` to join one.", threadID);
            }

            if (index < 0 || index >= groups.length) {
                return api.sendMessage(`❌ Invalid number. Please choose between 1 and ${groups.length}.`, threadID);
            }

            const targetGroup = groups[index];
            const ownerID = config.ownerID; // Gets your ID from config

            api.sendMessage(`⏳ Adding you to **${targetGroup.name || "Unnamed Group"}**...`, threadID);

            // Attempt to add YOU (Owner) to that group
            await api.addUserToGroup(ownerID, targetGroup.threadID);
            return api.sendMessage("✅ Success! Check your message requests if you don't see the group.", threadID);

        } catch (error) {
            console.error("Add Command Error:", error);
            
            // Specific error handling
            if (error.error === 1357004) {
                 return api.sendMessage("❌ Failed: The bot is not an Admin in that group, or the group does not allow members to add others.", threadID);
            }
            if (error.error === 1357031) {
                 return api.sendMessage("❌ Failed: You are already in that group.", threadID);
            }

            return api.sendMessage("❌ An error occurred. The group might be full or private.", threadID);
        }
    }
};
