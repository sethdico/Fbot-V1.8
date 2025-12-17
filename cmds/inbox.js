module.exports = {
    name: "inbox",
    usePrefix: false,
    admin: true,
    description: "List the bot's recent threads.",
    
    execute: async ({ api, event }) => {
        try {
            const threads = await api.getThreadList(10, null, ["INBOX"]);
            let msg = "📨 **RECENT INBOX**\n━━━━━━━━━━━━━━━━\n";
            threads.forEach((t, i) => {
                msg += `${i+1}. ${t.isGroup ? "👥" : "👤"} ${t.name || "Unnamed"}\nID: ${t.threadID}\n\n`;
            });
            api.sendMessage(msg, event.threadID);
        } catch (e) {
            api.sendMessage("❌ Failed to get inbox.", event.threadID);
        }
    }
};
