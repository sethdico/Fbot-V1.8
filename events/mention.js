module.exports = {
    name: "mention",
    
    execute: async ({ api, event, config }) => {
        // Check if the message contains a mention
        if (!event.mentions) return;

        const botID = api.getCurrentUserID();
        const prefix = config.prefix || "/";

        // If the bot was mentioned in the message
        if (event.mentions[botID]) {
            return api.sendMessage(
                `🤖 Hello! I am online.\nMy prefix is: ${prefix}\nType ${prefix}help to see commands.`,
                event.threadID,
                event.messageID
            );
        }
    }
};
