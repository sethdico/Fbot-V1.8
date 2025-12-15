const config = require("../config.json"); // Import config to use YOUR ID

module.exports = {
    name: "leave",
    usePrefix: false,
    description: "Make the bot leave a group or list groups.",
    usage: "leave [list | number]",
    version: "1.4", // Bumped version
    cooldown: 5,
    admin: true,

    async execute({ api, event, args }) {
        const threadID = event.threadID;

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
            return api.sendMessage(tagEveryone, threadID, () => {
                api.removeUserFromGroup(api.getCurrentUserID(), threadID);
            });
        }

        // FIX: Crash prevention
        const index = parseInt(args[0]) - 1;
        if (isNaN(index) || index < 0 || index >= groupThreads.length) {
            return api.sendMessage("❌ Invalid group number.", threadID);
        }

        const group = groupThreads[index];

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
