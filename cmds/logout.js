module.exports = {
    name: "logout",
    usePrefix: false,
    admin: true, // STRICTLY OWNER
    description: "Log out of Facebook and kill session.",
    
    execute: async ({ api, event }) => {
        try {
            api.sendMessage("👋 Logging out from Facebook...", event.threadID);
            
            await api.logout();
            
            console.log("⚠️ Bot logged out via command.");
            process.exit(0); // Stop the process
        } catch (e) {
            api.sendMessage("❌ Error logging out.", event.threadID);
        }
    }
};
