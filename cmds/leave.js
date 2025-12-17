module.exports = {
    name: "leave",
    usePrefix: false,
    description: "Make the bot leave the current group.",
    usage: "leave",
    cooldown: 5,
    admin: true,

    async execute({ api, event }) {
        const threadID = event.threadID;

        // 1. Safety Check: Is this a group?
        if (!event.isGroup) {
            return api.sendMessage("⚠️ I can only leave groups, not private chats.", threadID);
        }

        // 2. Prepare Goodbye Message
        const tagEveryone = {
            body: "👋 Goodbye everyone! Usage of the bot has been revoked.",
            mentions: [{
                tag: "@everyone",
                id: threadID
            }]
        };

        try {
            // 3. Send message first
            await api.sendMessage(tagEveryone, threadID);
            
            // 4. Get Bot ID and ensure it is a String (Fixes some library glitches)
            const botID = String(api.getCurrentUserID());

            console.log(`⚠️ Attempting to remove user: ${botID} from thread: ${threadID}`);

            // 5. Attempt to leave
            await api.removeUserFromGroup(botID, threadID);
            console.log("✅ Successfully left the group.");

        } catch (err) {
            console.error("❌ CRITICAL LEAVE ERROR:", err);

            // Check for specific Facebook errors
            if (err.error === 1357004) {
                 return api.sendMessage("❌ I cannot leave because I am the Group Creator or the only Admin. Please add another Admin or remove me manually.", threadID);
            }

            // Fallback message
            api.sendMessage(`❌ Failed to leave.\nError: ${err.error || err.message || "Unknown"}\n\n👉 Please kick me manually.`, threadID);
        }
    }
};
