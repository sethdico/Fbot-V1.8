module.exports = {
    name: "pair",
    aliases: ["love", "ship"],
    usePrefix: false,
    description: "Calculate love percentage.",
    usage: "pair @mention",
    
    execute: async ({ api, event, args }) => {
        const { mentions, senderID, threadID } = event;
        let p1 = senderID;
        let p2;
        let name1 = "You";
        let name2;

        if (Object.keys(mentions).length > 0) {
            p2 = Object.keys(mentions)[0];
            name2 = mentions[p2].replace("@", "");
        } else {
            // If no mention, pick a random person from group
            const info = await api.getThreadInfo(threadID);
            const participants = info.participantIDs;
            p2 = participants[Math.floor(Math.random() * participants.length)];
            const user = await api.getUserInfo(p2);
            name2 = user[p2].name;
        }

        const percentage = Math.floor(Math.random() * 101);
        let message = "";
        
        if (percentage < 30) message = "💔 No chance...";
        else if (percentage < 70) message = "🧡 Maybe works?";
        else message = "❤️ Perfect match!";

        const msg = `💘 **Love Calculator** 💘\n━━━━━━━━━━━━━━━━\n👩‍❤️‍💋‍👨 ${name1} + ${name2}\n📊 Score: ${percentage}%\n📝 Verdict: ${message}`;
        
        api.sendMessage(msg, threadID);
    }
};
