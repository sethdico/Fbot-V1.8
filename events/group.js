const fs = require("fs");
const path = require("path");

module.exports = {
    name: "group_events",

    async execute({ api, event }) {
        const { logMessageType, logMessageData, threadID } = event;

        // Safe Settings Load
        let settings = { welcome: true };
        try {
            const settingsPath = path.resolve(__dirname, "..", "settings.json");
            if (fs.existsSync(settingsPath)) {
                settings = JSON.parse(fs.readFileSync(settingsPath));
            }
        } catch (e) {}

        if (!settings.welcome) return;

        try {
            // WELCOME MESSAGE
            if (logMessageType === "log:subscribe") {
                const threadInfo = await api.getThreadInfo(threadID);
                const threadName = threadInfo.threadName || "the group";
                const addedParticipants = logMessageData.addedParticipants;

                for (const user of addedParticipants) {
                    if (String(user.userFbId) === String(api.getCurrentUserID())) continue;

                    const userName = user.fullName || "New Member";
                    
                    const msg = {
                        body: `👋 **Welcome to ${threadName}!**\n━━━━━━━━━━━━━━━━\nHello @${userName}, enjoy your stay!`,
                        mentions: [{ tag: `@${userName}`, id: user.userFbId }]
                    };

                    await api.sendMessage(msg, threadID);
                }
            } 
            // GOODBYE MESSAGE
            else if (logMessageType === "log:unsubscribe") {
                const leftUserID = logMessageData.leftParticipantFbId;
                if (String(leftUserID) === String(api.getCurrentUserID())) return;
                
                await api.sendMessage(`🚪 **Goodbye!** A member has left the group.`, threadID);
            }
        } catch (e) {
            console.error("Group Event Error:", e.message);
        }
    }
};
