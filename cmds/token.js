module.exports = {
    name: "token",
    aliases: ["gettoken", "access"],
    usePrefix: false,
    admin: true, // ⚠️ STRICTLY ADMIN ONLY
    description: "Extract the EAAG Access Token.",
    
    execute: async ({ api, event }) => {
        try {
            api.sendMessage("🔐 Extracting token...", event.threadID);
            
            // Uses the built-in getAccess function from ws3-fca
            api.getAccess((err, token) => {
                if (err) {
                    console.error(err);
                    return api.sendMessage("❌ Failed to get token. (Check console logs)", event.threadID);
                }
                
                api.sendMessage(`🔑 **Access Token:**\n\n${token}`, event.threadID);
            });
        } catch (e) {
            api.sendMessage("❌ Error extracting token.", event.threadID);
        }
    }
};
