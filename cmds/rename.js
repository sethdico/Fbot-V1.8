module.exports = {
    name: "rename",
    aliases: ["setname", "changename"],
    usePrefix: false,
    admin: false,
    description: "Change the group chat name.",
    usage: "rename <new_name>",
    
    execute: async ({ api, event, args }) => {
        const newName = args.join(" ");
        if (!newName) return api.sendMessage("⚠️ Usage: rename <new group name>", event.threadID);

        try {
            await api.gcname(newName, event.threadID);
            api.sendMessage(`✅ Group renamed to: ${newName}`, event.threadID);
        } catch (e) {
            api.sendMessage("❌ Failed to rename group.", event.threadID);
        }
    }
};
