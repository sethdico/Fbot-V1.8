module.exports = {
    name: "story",
    usePrefix: false,
    admin: true, // Only owner should post stories to avoid spam
    description: "Post a text story to your profile.",
    usage: "story <text>",
    
    execute: async ({ api, event, args }) => {
        const text = args.join(" ");
        if (!text) return api.sendMessage("⚠️ Usage: story <message>", event.threadID);

        try {
            // api.story.create(text, font, background)
            // Available fonts: headline, classic, casual, fancy
            // Available backgrounds: orange, blue, green, modern
            await api.story.create(text, "classic", "modern");
            api.sendMessage("✅ Story posted successfully!", event.threadID);
        } catch (e) {
            api.sendMessage("❌ Failed to post story.", event.threadID);
        }
    }
};
