const fs = require("fs");
const path = require("path");

module.exports = {
    name: "group_events",

    async execute({ api, event }) {
        // 1. Check Settings
        const settingsPath = path.resolve(__dirname, "..", "settings.json");
        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath));
            if (settings.welcome === false) return; // If OFF, do nothing
        }

        const { threadID, logMessageType, logMessageData } = event;

        try {
            // ============================
            // 🟢 USER JOINED (Welcome)
            // ============================
            if (logMessageType === "log:subscribe") {
                const threadInfo = await api.getThreadInfo(threadID);
                const { threadName } = threadInfo;
                const newUsers = logMessageData.addedParticipants;

                for (const user of newUsers) {
                    if (user.userFbId === api.getCurrentUserID()) continue; // Ignore bot

                    const userName = user.fullName || "New Member";
                    
                    const msg = {
                        body: `👋 Welcome to ${threadName || "the group"}, @${userName}!\nEnjoy your stay!`,
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
                
                // Ignore if the bot itself left/kicked
                if (leftUserID === api.getCurrentUserID()) return;

                // Get user info to say their name
                const userInfo = await api.getUserInfo(leftUserID);
                const name = userInfo[leftUserID]?.name || "Facebook User";

                const msg = {
                    body: `🚪 Goodbye, ${name}.\nWe will miss you! (maybe)`,
                };

                await api.sendMessage(msg, threadID);
            }

        } catch (err) {
            console.error("Group event error:", err);
        }
    }
};
