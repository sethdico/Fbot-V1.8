module.exports = {
    name: "mention",
    execute: async ({ api, event, config }) => {
        if (!event.body) return;

        const botID = api.getCurrentUserID();
        const prefix = config.prefix || "/";

        // Messenger uses @[USER_ID] format for mentions in raw message body
        if (event.body.includes(`@[${botID}]`)) {
            return api.sendMessage(
                `Hello! I am online.\nMy prefix is: ${prefix}\nType ${prefix}help to see commands.`,
                event.threadID,
                event.messageID
            );
        }
    }
};
