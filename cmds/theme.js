module.exports = {
    name: "theme",
    usePrefix: false,
    admin: true, // Only admins should change themes to prevent spam
    description: "Change the group chat theme.",
    usage: "theme <theme_name> | theme list",
    cooldown: 10,
    
    execute: async ({ api, event, args }) => {
        if (!args[0]) return api.sendMessage("⚠️ Usage: theme list | theme <name>", event.threadID);
        
        try {
            if (args[0].toLowerCase() === "list") {
                // api.theme("list", ...) returns an array of themes
                api.theme("list", event.threadID, (err, themes) => {
                    if (err) return api.sendMessage("❌ Failed to fetch themes.", event.threadID);
                    
                    let msg = "🎨 **Available Themes:**\n\n";
                    // List first 20 to avoid spamming
                    themes.slice(0, 20).forEach((t, i) => msg += `${i+1}. ${t.name}\n`);
                    msg += "\nType 'theme <name>' to set one.";
                    api.sendMessage(msg, event.threadID);
                });
            } else {
                const themeName = args.join(" ");
                api.sendMessage(`🎨 Attempting to set theme to: ${themeName}...`, event.threadID);
                
                // api.theme(name, threadID, callback)
                api.theme(themeName, event.threadID, (err) => {
                    if (err) return api.sendMessage(`❌ Theme not found or error: ${err.message}`, event.threadID);
                    api.sendMessage("✅ Theme updated successfully!", event.threadID);
                });
            }
        } catch (e) {
            console.error(e);
            api.sendMessage("❌ Error executing theme command.", event.threadID);
        }
    }
};
