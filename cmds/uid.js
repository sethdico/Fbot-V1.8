module.exports = {
    name: "uid",
    aliases: ["id", "getid"],
    usePrefix: false,
    description: "Get the Facebook User ID.",
    usage: "uid | uid @mention | Reply to message",
    
    execute: async ({ api, event, args }) => {
        let targetID = event.senderID;
        let targetName = "Your";

        // Priority 1: Mention
        if (event.mentions && Object.keys(event.mentions).length > 0) {
            targetID = Object.keys(event.mentions)[0];
            targetName = event.mentions[targetID].replace("@", "");
        }
        // Priority 2: Reply
        else if (event.messageReply) {
            targetID = event.messageReply.senderID;
            targetName = "Target";
        }

        api.sendMessage(`🆔 **${targetName} ID:**\n${targetID}`, event.threadID);
    }
};
