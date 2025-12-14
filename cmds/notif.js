module.exports = {
    name: "notify",
    usePrefix: false,
    usage: "notify <message>",
    version: "2.0",
    cooldown: 10,
    admin: true,

    execute: async ({ api, event, args }) => {
        const ADMIN_IDS = ["100052951819398"]; 
        if (!ADMIN_IDS.includes(event.senderID)) return;

        const message = args.join(" ");
        if (!message) return api.sendMessage("⚠️ No message provided.", event.threadID);

        const allThreads = await api.getThreadList(100, null, ["INBOX"]);
        const groupThreads = allThreads.filter(t => t.isGroup && !t.isArchived);

        api.sendMessage(`🚀 Sending to ${groupThreads.length} groups. This will take approx ${groupThreads.length * 4} seconds to avoid bans...`, event.threadID);

        let sentCount = 0;

        // 🛡️ ANTI-BAN LOOP
        for (const thread of groupThreads) {
            try {
                await api.sendMessage(`📢 **ANNOUNCEMENT**\n━━━━━━━━━━━━━━━━\n${message}`, thread.threadID);
                sentCount++;
                console.log(`✅ Sent to ${thread.name || thread.threadID}`);
                
                // 🛑 SAFETY PAUSE: Wait 4 seconds between messages
                await new Promise(resolve => setTimeout(resolve, 4000)); 

            } catch (err) {
                console.error(`❌ Failed: ${thread.threadID}`);
            }
        }

        return api.sendMessage(`✅ Broadcast complete! Sent to ${sentCount} groups.`, event.threadID);
    }
};
