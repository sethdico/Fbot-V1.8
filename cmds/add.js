const config = require("../config.json");

module.exports = {
    name: "add",
    usePrefix: false,
    admin: true,
    usage: "add [list | number]",
    version: "1.2", // Bumped version
    description: "Add the owner to a group.",
    cooldown: 5,

    async execute({ api, event, args }) {
        const threadID = event.threadID;
        const senderID = event.senderID;

        if (senderID !== config.ownerID) {
            return api.sendMessage("❌ You are not authorized to use this command.", threadID);
        }

        const threads = await api.getThreadList(100, null, ["INBOX"]);
        const groups = threads.filter(t => t.isGroup);

        if (args[0] === "list") {
            if (groups.length === 0) return api.sendMessage("❌ No groups found.", threadID);

            const msg = groups.map((g, i) => `${i + 1}. ${g.name || "Unnamed"} (${g.threadID})`).join("\n");
            return api.sendMessage("📋 List of Groups:\n\n" + msg, threadID);
        }

        const index = parseInt(args[0]) - 1;
        
        // FIX: Added safety check
        if (isNaN(index) || index < 0 || index >= groups.length) {
            return api.sendMessage("❌ Invalid group number.", threadID);
        }

        const group = groups[index];

        try {
            await api.addUserToGroup(config.ownerID, group.threadID);
            return api.sendMessage(`✅ Owner added to group: ${group.name || "Unnamed Group"}`, threadID);
        } catch (err) {
            console.error("❌ Failed to add owner:", err);
            return api.sendMessage("❌ Couldn't add owner. They might already be in the group or can't be added.", threadID);
        }
    }
};
