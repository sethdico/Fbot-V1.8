module.exports = {
    name: "myid",
    usePrefix: false, // Works with or without prefix
    description: "Get your UID",
    execute: ({ api, event }) => {
        api.sendMessage(`🆔 Your ID: ${event.senderID}`, event.threadID);
    }
};
