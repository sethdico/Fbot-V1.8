module.exports = {
    name: "leave",
    usePrefix: false,
    description: "Make the bot leave a group or list groups.",
    usage: "leave [list | number]",
    version: "1.3",
    cooldown: 5,
    admin: true,

    async execute({ api, event, args }) {
        const senderID = event.senderID;
        const threadID = event.threadID;

        const allowedUsers = ["100052951819398"]; // Replace with your UID

        if (!allowedUsers.includes(senderID)) {
            return api.sendMessage("❌ You are not authorized to use this command.", threadID);
        }

        // Restrict basic "leave" command in private chat
        if (!args[0] && event.isGroup === false) {
            return api.sendMessage("⚠️ You can't use `leave` in private chat. Use `leave list` or `leave <number>` instead.", threadID);
        }

        const threads = await api.getThreadList(100, null, ["INBOX"]);
        const groupThreads = threads.filter(t => t.isGroup);

        if (args[0] === "list") {
            if (groupThreads.length === 0) return api.sendMessage("❌ No groups found.", threadID);

            let msg = "📋 List of Groups:\n\n";
            groupThreads.forEach((group, index) => {
                msg += `${index + 1}. ${group.name || "Unnamed Group"} (${group.threadID})\n`;
            });

            return api.sendMessage(msg, threadID);
        }

        const tagEveryone = {
            body: "👋 Goodbye @everyone.",
            mentions: [{
                tag: "@everyone",
                id: threadID
            }]
        };

        if (!args[0]) {
            // leave current group
            return api.sendMessage(tagEveryone, threadID, () => {
                api.removeUserFromGroup(api.getCurrentUserID(), threadID);
            });
        }

        // leave specific group
        const index = parseInt(args[0]) - 1;
        const group = groupThreads[index];

        if (!group) {
            return api.sendMessage("❌ Invalid group number.", threadID);
        }

        try {
            await api.sendMessage(tagEveryone, group.threadID, () => {
                api.removeUserFromGroup(api.getCurrentUserID(), group.threadID);
            });
            return api.sendMessage(`✅ Left group: ${group.name || "Unnamed Group"}`, threadID);
        } catch (err) {
            console.error("❌ Error leaving group:", err);
            return api.sendMessage("❌ Failed to leave the group.", threadID);
        }
    }
};
