module.exports = {
    name: "notify",
    admin: true,
    
    execute: async ({ api, event, args }) => {
        if (!args.includes("-confirm")) return api.sendMessage("⚠️ Add '-confirm' to send.", event.threadID);
        
        const msg = args.filter(a => a !== "-confirm").join(" ");
        const threads = await api.getThreadList(100, null, ["INBOX"]);
        const groups = threads.filter(t => t.isGroup);

        api.sendMessage(`🚀 Queuing broadcast to ${groups.length} groups...`, event.threadID);

        let count = 0;
        for (const group of groups) {
            // Because index.js has a queue, we can just call this loop.
            // The queue will automatically space them out by 2 seconds.
            // 50 groups = 100 seconds total time. Safe.
            api.sendMessage(`📢 **BROADCAST**\n\n${msg}`, group.threadID);
            count++;
        }
    }
};
