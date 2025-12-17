const fs = require("fs");
const path = require("path");

module.exports = {
    name: "group_events",

    async execute({ api, event }) {
        const { logMessageType, logMessageData, threadID } = event;

        // 1. Load Settings (Safely)
        const settingsPath = path.resolve(__dirname, "..", "settings.json");
        let settings = { welcome: true }; // Default to ON if file missing

        try {
            if (fs.existsSync(settingsPath)) {
                settings = JSON.parse(fs.readFileSync(settingsPath));
            }
        } catch (e) {
            console.error("⚠️ Could not read settings.json in group event.");
        }

        // 2. Stop if welcome is disabled
        if (settings.welcome === false) return;

        try {
            // ============================
            // 🟢 USER JOINED (Welcome)
            // ============================
            if (logMessageType === "log:subscribe") {
                // Get Thread Info to find the Group Name
                const threadInfo = await api.getThreadInfo(threadID);
                const threadName = threadInfo.threadName || "the group";
                const addedParticipants = logMessageData.addedParticipants;

                for (const user of addedParticipants) {
                    // Don't welcome the bot itself
                    if (String(user.userFbId) === String(api.getCurrentUserID())) continue;

                    const userName = user.fullName || "New Member";
                    
                    const msg = {
                        body: `👋 **Welcome to ${threadName}!**\n━━━━━━━━━━━━━━━━\nHello @${userName}, enjoy your stay!\nRead the rules if there are any.`,
                        mentions: [{ tag: `@${userName}`, id: user.userFbId }]
                    };

                    await api.sendMessage(msg, threadID);
                }
            } 
            
            // ============================
            // 🔴 USER LEFT (Goodbye)
            // ============================
else if (logMessageType === "log:unsubscribe") {
    const leftUserID = logMessageData.leftParticipantFbId;
    if (String(leftUserID) === String(api.getCurrentUserID())) return;
    // Just use the ID as name (no API call)
    const msg = `🚪 **Goodbye, user ${leftUserID}.**\nWe will miss you!`;
    await api.sendMessage(msg, threadID);
}
