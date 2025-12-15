const fs = require("fs");
const path = require("path");

module.exports = {
    name: "antiunsent",
    usePrefix: false,
    admin: true, // 🔒 SECURED: Only admins can use this
    usage: "antiunsent <on/off>",
    description: "Turn anti-unsent mode on or off.",
    
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

        if (!args[0]) return api.sendMessage("⚠️ Usage: antiunsent on | antiunsent off", event.threadID);

        const mode = args[0].toLowerCase();

        if (mode === "on") {
            settings.antiUnsent = true;
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));
            return api.sendMessage("✅ Anti-Unsent is now ON.", event.threadID);
        } 
        else if (mode === "off") {
            settings.antiUnsent = false;
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));
            return api.sendMessage("❌ Anti-Unsent is now OFF.", event.threadID);
        } 
        else {
            return api.sendMessage("⚠️ Usage: antiunsent on | antiunsent off", event.threadID);
        }
    }
};
