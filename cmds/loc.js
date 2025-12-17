module.exports = {
    name: "loc",
    aliases: ["location", "map"],
    usePrefix: false,
    description: "Send a location map.",
    usage: "loc <lat> <long> | loc",
    
    execute: async ({ api, event, args }) => {
        // Default to Manila coordinates if none provided
        const lat = args[0] || "14.5995";
        const long = args[1] || "120.9842";

        const message = {
            body: "📍 Here is the location:",
            location: {
                latitude: lat,
                longitude: long,
                current: true
            }
        };

        try {
            await api.sendMessage(message, event.threadID);
        } catch (e) {
            api.sendMessage("❌ Failed to send location.", event.threadID);
        }
    }
};
