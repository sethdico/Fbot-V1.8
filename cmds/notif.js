// ================================================
// FILE: cmds/notif.js
// ================================================
const config = require("../config.json");

module.exports = {
    name: "notify",
    usePrefix: false,
    usage: "notify <message>",
    version: "3.0", // Safety Update
    cooldown: 30, // High cooldown
    admin: true,

    execute: async ({ api, event, args }) => {
        const isOwner = event.senderID === config.ownerID;
        const isAdmin = config.admin && config.admin.includes(event.senderID);
        
        if (!isOwner && !isAdmin) return;

        const message = args.join(" ");
        if (!message) return api.sendMessage("⚠️ No message provided.", event.threadID);

        const allThreads = await api.getThreadList(100, null, ["INBOX"]);
        const groupThreads = allThreads.filter(t => t.isGroup && !t.isArchived);

        api.sendMessage(`🚀 Starting SAFE broadcast to ${groupThreads.length} groups.\nThis will be slow to prevent bans.`, event.threadID);

        let sentCount = 0;
        
        // Random integer helper
        const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        const sleep = ms => new Promise(r => setTimeout(r, ms));

        for (let i = 0; i < groupThreads.length; i++) {
            const thread = groupThreads[i];
            
            try {
                // 1. Send Message
                await api.sendMessage(`📢 **ANNOUNCEMENT**\n━━━━━━━━━━━━━━━━\n${message}`, thread.threadID);
                sentCount++;
                console.log(`✅ Sent to ${thread.name || thread.threadID} (${i + 1}/${groupThreads.length})`);

                // 2. LONG Random Delay (20s to 60s)
                // Sending too fast = Immediate Flag
                const waitTime = rnd(20000, 60000);
                await sleep(waitTime);

                // 3. "Coffee Break" Logic
                // Every 10 messages, take a long break (2 to 5 minutes)
                if ((i + 1) % 10 === 0) {
                    console.log("☕ Taking a safety break...");
                    const breakTime = rnd(120000, 300000);
                    await sleep(breakTime);
                }

            } catch (err) {
                console.error(`❌ Failed: ${thread.threadID}`);
                // If failed, wait a bit anyway to be safe
                await sleep(5000);
            }
        }

        return api.sendMessage(`✅ Safe Broadcast complete! Sent to ${sentCount} groups.`, event.threadID);
    }
};
