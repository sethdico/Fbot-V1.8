module.exports = {
    name: "tagall",
    aliases: ["everyone", "mentionall"],
    usePrefix: false,
    admin: true, // Keep TRUE to prevent members from spamming
    description: "Mention everyone in the group.",
    usage: "tagall [message]",
    
    execute: async ({ api, event, args }) => {
        if (!event.isGroup) return api.sendMessage("❌ This command is for groups only.", event.threadID);
        
        const message = args.join(" ") || "📣 EVERYONE, WAKE UP!";
        
        try {
            const threadInfo = await api.getThreadInfo(event.threadID);
            const participants = threadInfo.participantIDs;
            
            let mentions = [];
            let body = message + "\n\n";
            
            participants.forEach(id => {
                // Uses an invisible character to tag without cluttering the text
                body += "@\u200E "; 
                mentions.push({
                    tag: "@\u200E ",
                    id: id,
                    fromIndex: body.length - 1
                });
            });

            api.sendMessage({
                body: body,
                mentions: mentions
            }, event.threadID);

        } catch (e) {
            console.error(e);
            api.sendMessage("❌ Failed to tag everyone.", event.threadID);
        }
    }
};
