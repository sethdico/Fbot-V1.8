module.exports = {
    name: "debug",
    usePrefix: false,
    admin: false, // allow everyone to use this for testing
    description: "Checks why admin commands aren't working",
    
    execute: async ({ api, event, config }) => {
        const senderID = event.senderID;
        const ownerID = config.ownerID;
        
        // Check exact types
        const isMatch = (String(senderID) === String(ownerID));
        
        const msg = `
🛠️ **DEBUG INFO** 🛠️

👤 **Your ID (Sender):** 
${senderID} 
(Type: ${typeof senderID})

👑 **Config Owner ID:** 
${ownerID || "⚠️ UNDEFINED (Config not loaded!)"} 
(Type: ${typeof ownerID})

✅ **Match Status:** ${isMatch ? "YES (You are Owner)" : "NO (ID Mismatch)"}
        `;
        
        return api.sendMessage(msg, event.threadID);
    }
};
