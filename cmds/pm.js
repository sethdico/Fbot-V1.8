module.exports = {
    name: "pm",
    aliases: ["dm", "sendpm"],
    usePrefix: false,
    admin: true, // Owner Only
    description: "Send a private message to a user via the bot.",
    usage: "pm <uid> <message>",
    
    execute: async ({ api, event, args }) => {
        const targetID = args[0];
        const message = args.slice(1).join(" ");

        if (!targetID || !message) {
            return api.sendMessage("⚠️ Usage: pm <uid> <message>", event.threadID);
        }

        try {
            await api.sendMessage(message, targetID);
            api.sendMessage(`✅ Sent message to ${targetID}`, event.threadID);
        } catch (e) {
            api.sendMessage(`❌ Failed. The user might have blocked the bot or isn't reachable.`, event.threadID);
        }
    }
};
