module.exports = {
    name: "pin",
    aliases: ["unpin"],
    usePrefix: false,
    admin: true,
    description: "Pin or Unpin a message.",
    usage: "Reply to a message with 'pin' or 'unpin'",
    
    execute: async ({ api, event, args }) => {
        if (!event.messageReply) {
            return api.sendMessage("⚠️ Reply to a message to pin/unpin it.", event.threadID);
        }

        const action = event.body.toLowerCase().startsWith("unpin") ? "unpin" : "pin";
        const messageID = event.messageReply.messageID;

        try {
            // api.pin(action, threadID, messageID)
            await api.pin(action, event.threadID, messageID);
            api.sendMessage(`✅ Message ${action}ned successfully!`, event.threadID);
        } catch (e) {
            api.sendMessage(`❌ Failed to ${action} message. (I might need to be admin)`, event.threadID);
        }
    }
};
