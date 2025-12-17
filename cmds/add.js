module.exports = {
    name: "add",
    usePrefix: false,
    admin: true,
    description: "List groups or add owner.",
    usage: "add list | add <number>",
    cooldown: 5,

    async execute({ api, event, args, config }) {
        const threadList = await api.getThreadList(50, null, ["INBOX"]);
        const groups = threadList.filter(t => t.isGroup);

        if (!args[0] || args[0] === "list") {
            let msg = "📋 **Groups:**\n";
            groups.forEach((g, i) => msg += `${i + 1}. ${g.name}\n`);
            return api.sendMessage(msg, event.threadID);
        }

        const index = parseInt(args[0]) - 1;
        if (isNaN(index) || !groups[index]) return api.sendMessage("❌ Invalid number.", event.threadID);

        try {
            // NethWs3Dev function
            if (typeof api.gcmember === 'function') {
                await api.gcmember("add", config.ownerID, groups[index].threadID);
            } else {
                await api.addUserToGroup(config.ownerID, groups[index].threadID);
            }
            api.sendMessage("✅ Owner added!", event.threadID);
        } catch (e) {
            api.sendMessage("❌ Failed to add owner.", event.threadID);
        }
    }
};
