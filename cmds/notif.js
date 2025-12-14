const config = require("../config.json"); // Import config

module.exports = {
    name: "notify",
    usePrefix: false,
    usage: "notify <message>",
    version: "2.1",
    cooldown: 10,
    admin: true,

    execute: async ({ api, event, args }) => {
        // FIX: Check against config ownerID and admin array
        const isOwner = event.senderID === config.ownerID;
        const isAdmin = config.admin && config.admin.includes(event.senderID);
        
        if (!isOwner && !isAdmin) return;

        const message = args.join(" ");
        if (!message) return api.sendMessage("⚠️ No message provided.", event.threadID);

        const allThreads = await api.getThreadList(100, null, ["INBOX"]);
        const groupThreads = allThreads.filter(t => t.isGroup && !t.isArchived);

        api.sendMessage(`🚀 Sending to ${groupThreads.length} groups. This will take approx ${groupThreads.length * 4} seconds...`, event.threadID);

        let sentCount = 0;

        for (const thread of groupThreads) {
            try {
                await api.sendMessage(`📢 **ANNOUNCEMENT**\n━━━━━━━━━━━━━━━━\n${message}`, thread.threadID);
                sentCount++;
                console.log(`✅ Sent to ${thread.name || thread.threadID}`);
                await new Promise(resolve => setTimeout(resolve, 4000)); 
            } catch (err) {
                console.error(`❌ Failed: ${thread.threadID}`);
            }
        }

        return api.sendMessage(`✅ Broadcast complete! Sent to ${sentCount} groups.`, event.threadID);
    }
};
