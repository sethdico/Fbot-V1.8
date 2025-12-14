module.exports = {
    name: "event",

    async execute({ api, event }) {
        if (event.logMessageType === "log:subscribe") {
            try {
                const threadInfo = await api.getThreadInfo(event.threadID);
                const { threadName, participantIDs } = threadInfo;
                const newUsers = event.logMessageData.addedParticipants;

                for (const user of newUsers) {
                    // If Bot is added
                    if (user.userFbId === api.getCurrentUserID()) {
                        api.sendMessage(`👋 Hello! I am connected.`, event.threadID);
                        // Try-catch for nickname permissions
                        try {
                            await api.changeNickname("Amadeus", event.threadID, api.getCurrentUserID());
                        } catch (e) {
                            console.log("Could not change nickname (Permissions).");
                        }
                        continue;
                    }

                    // Welcome User
                    const userName = user.fullName || "New Member";
                    const welcomeMsg = {
                        body: `👋 Welcome to ${threadName || "the group"}, @${userName}!`,
                        mentions: [{ tag: `@${userName}`, id: user.userFbId }]
                    };

                    await api.sendMessage(welcomeMsg, event.threadID);
                    await new Promise(r => setTimeout(r, 1500)); // Anti-spam delay
                }
            } catch (err) {
                console.error("Group event error:", err);
            }
        }
    }
};
