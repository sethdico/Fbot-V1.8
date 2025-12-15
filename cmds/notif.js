const config = require("../config.json");

module.exports = {
    name: "notify",
    usePrefix: false,
    usage: "notify <message>",
    version: "3.0",
    admin: true,
    cooldown: 60,

    execute: async ({ api, event, args }) => {
        // --- FIXED: The redundant admin check was removed here. ---

        const message = args.join(" ");
        if (!message) return api.sendMessage("⚠️ Message required.", event.threadID);

        const allThreads = await api.getThreadList(100, null, ["INBOX"]);
        const groups = allThreads.filter(t => t.isGroup && !t.isArchived);

        api.sendMessage(`🚀 Broadcast started for ${groups.length} groups.\n⚠️ Speed: SLOW (Safe Mode).`, event.threadID);

        let sent = 0;
        const sleep = ms => new Promise(r => setTimeout(r, ms));

        for (let i = 0; i < groups.length; i++) {
            try {
                await api.sendMessage(`📢 **ANNOUNCEMENT**\n━━━━━━━━━━━━\n${message}`, groups[i].threadID);
                sent++;
                console.log(`✅ Sent to ${groups[i].name} (${i+1}/${groups.length})`);

                // WAIT 25-60 SECONDS BETWEEN GROUPS
                await sleep(Math.floor(Math.random() * 35000) + 25000);

                // BREAK EVERY 10 GROUPS
                if ((i + 1) % 10 === 0) {
                    console.log("☕ Taking a 3-minute break...");
                    await sleep(180000);
                }
            } catch (e) { console.error(`Failed: ${groups[i].threadID}`); }
        }
        api.sendMessage(`✅ Broadcast finished. Sent to ${sent} groups.`, event.threadID);
    }
};
