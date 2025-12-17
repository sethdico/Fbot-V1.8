module.exports = {
    name: "note",
    usePrefix: false,
    admin: true, // Owner only (since it posts to the bot's profile)
    description: "Post a Messenger Note.",
    usage: "note create <text> | note delete",
    
    execute: async ({ api, event, args }) => {
        const action = args[0]?.toLowerCase();
        const content = args.slice(1).join(" ");

        if (!["create", "delete", "check"].includes(action)) {
            return api.sendMessage("⚠️ Usage: note create <text> | note delete | note check", event.threadID);
        }

        try {
            if (action === "create") {
                if (!content) return api.sendMessage("⚠️ Provide text for the note.", event.threadID);
                
                // api.notes.create(text, privacy, callback)
                // Privacy defaults to "EVERYONE"
                api.notes.create(content, "EVERYONE", (err, res) => {
                    if (err) return api.sendMessage("❌ Failed to create note.", event.threadID);
                    api.sendMessage("✅ Note posted to Messenger Inbox!", event.threadID);
                });
            } 
            
            else if (action === "delete") {
                // First we need to find the note ID using check(), then delete it
                api.notes.check((err, note) => {
                    if (err || !note) return api.sendMessage("❌ No active note found to delete.", event.threadID);
                    
                    api.notes.delete(note.id, (err) => {
                        if (err) return api.sendMessage("❌ Failed to delete note.", event.threadID);
                        api.sendMessage("✅ Note deleted.", event.threadID);
                    });
                });
            }

            else if (action === "check") {
                api.notes.check((err, note) => {
                    if (err) return api.sendMessage("❌ Error checking notes.", event.threadID);
                    if (!note) return api.sendMessage("🤷‍♂️ No active note.", event.threadID);
                    api.sendMessage(`📝 **Current Note:**\n"${note.description.text}"`, event.threadID);
                });
            }

        } catch (e) {
            console.error(e);
            api.sendMessage("❌ Error executing note command.", event.threadID);
        }
    }
};
