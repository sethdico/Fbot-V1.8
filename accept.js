module.exports = {
    name: "accept",
    usePrefix: false,
    admin: true,
    description: "Accept a friend request.",
    usage: "accept <uid> | accept <name>",
    
    execute: async ({ api, event, args }) => {
        const target = args.join(" ");
        if (!target) return api.sendMessage("⚠️ Usage: accept <uid> or <name>", event.threadID);

        try {
            // api.friend.accept(identifier)
            await api.friend.accept(target);
            api.sendMessage(`✅ Accepted friend request from: ${target}`, event.threadID);
        } catch (e) {
            api.sendMessage(`❌ Failed: ${e.message || "User not found in requests."}`, event.threadID);
        }
    }
};
