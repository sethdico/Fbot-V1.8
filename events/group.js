module.exports = {
    name: "event",

    async execute({ api, event }) {
        if (event.logMessageType === "log:subscribe") {
            try {
                // Get fresh thread info
                const threadInfo = await api.getThreadInfo(event.threadID);
                const { threadName, participantIDs } = threadInfo;
                const newUsers = event.logMessageData.addedParticipants;

                for (const user of newUsers) {
                    if (user.userFbId === api.getCurrentUserID()) {
                        // If Bot is added, send a general greeting
                        api.sendMessage(`👋 Hello everyone! I am amadeusbot. Made by asher\nType /help to see my commands.`, event.threadID);
                        api.changeNickname("amadeusbot", event.threadID, api.getCurrentUserID());
                        continue;
                    }

                    // Welcome the user
                    const userName = user.fullName || "New Member";
                    const welcomeMsg = {
                        body: `👋 Welcome to ${threadName || "the group"}, @${userName}!\n👥 You are member #${participantIDs.length}.`,
                        mentions: [{ tag: `@${userName}`, id: user.userFbId }]
                    };

                    await api.sendMessage(welcomeMsg, event.threadID);
                    
                    // 🛡️ SAFETY DELAY: Wait 2s if multiple people are added
                    await new Promise(r => setTimeout(r, 2000));
                }
            } catch (err) {
                console.error("Group event error:", err);
            }
        }
    }
};
