module.exports = {
    name: "remind",
    usePrefix: false,
    usage: "remind <time> <message>",
    description: "Sets a reminder. (m=mins, h=hours, s=seconds)",
    
    execute: async ({ api, event, args }) => {
        const { threadID, messageID, senderID } = event;
        const input = args.join(" ");
        
        // Split time and message (e.g., "10m" and "check rice")
        const timeMatch = input.match(/^(\d+)([smh])\s+(.+)$/);
        
        if (!timeMatch) {
            return api.sendMessage("⚠️ Invalid format.\nUsage: remind 10m Check Rice\n(s=sec, m=min, h=hour)", threadID, messageID);
        }

        const value = parseInt(timeMatch[1]);
        const unit = timeMatch[2];
        const msg = timeMatch[3];
        
        let delay = 0;
        if (unit === 's') delay = value * 1000;
        if (unit === 'm') delay = value * 60 * 1000;
        if (unit === 'h') delay = value * 60 * 60 * 1000;

        if (delay > 2147483647) return api.sendMessage("⚠️ Time is too long!", threadID);

        api.sendMessage(`⏰ I will remind you in ${value}${unit}: "${msg}"`, threadID, messageID);

        setTimeout(() => {
            api.sendMessage({
                body: `⏰ **REMINDER**\n━━━━━━━━━━━━\nHello @User, you asked me to remind you:\n\n"${msg}"`,
                mentions: [{ tag: "@User", id: senderID }]
            }, threadID);
        }, delay);
    }
};
