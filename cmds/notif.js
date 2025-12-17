module.exports = {
    name: "notify",
    usePrefix: false,
    usage: "notify <message>",
    version: "3.1",
    admin: true,
    cooldown: 60,
    execute: async ({ api, event, args }) => {
        if (!args.includes("--confirm")) {
            return api.sendMessage("⚠️ Add --confirm to send broadcast.\nExample: notify --confirm Hello!", event.threadID);
        }
        const message = args.filter(arg => arg !== "--confirm").join(" ");
        if (!message) return api.sendMessage("⚠️ Message required.", event.threadID);
        const allThreads = await api.getThreadList(100, null, ["INBOX"]);
        const groups = allThreads.filter(t => t.isGroup && !t.isArchived);
        api.sendMessage(`🚀 Broadcast to ${groups.length} groups.`, event.threadID);
        let sent = 0;
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        for (let i = 0; i < groups.length; i++) {
            try {
                await api.sendMessage(`📢 **ANNOUNCEMENT**\n━━━━━━━━━━━━\n${message}`, groups[i].threadID);
                sent++;
                await sleep(Math.floor(Math.random() * 35000) + 25000);
                if ((i + 1) % 10 === 0) await sleep(180000);
            } catch (e) { console.error(`Failed: ${groups[i].threadID}`); }
        }
        api.sendMessage(`✅ Sent to ${sent} groups.`, event.threadID);
    }
};
