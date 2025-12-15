const fs = require("fs");
const path = require("path");

module.exports = {
    name: "welcome",
    usePrefix: false,
    admin: true, // 🔒 SECURED: Only admins can use this
    usage: "welcome <on/off>",
    description: "Turn welcome messages on or off.",
    
    execute: async ({ api, event, args }) => {
        const settingsPath = path.resolve(__dirname, "..", "settings.json");
        let settings = {};
        
        // Load existing settings if file exists
        if (fs.existsSync(settingsPath)) {
            try {
                settings = JSON.parse(fs.readFileSync(settingsPath));
            } catch (e) {
                settings = {};
            }
        }

        if (!args[0]) return api.sendMessage("⚠️ Usage: welcome on | welcome off", event.threadID);

        const mode = args[0].toLowerCase();

        if (mode === "on") {
            settings.welcome = true;
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));
            return api.sendMessage("✅ Welcome messages are now ON.", event.threadID);
        } 
        else if (mode === "off") {
            settings.welcome = false;
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));
            return api.sendMessage("❌ Welcome messages are now OFF.", event.threadID);
        } 
        else {
            return api.sendMessage("⚠️ Usage: welcome on | welcome off", event.threadID);
        }
    }
};
