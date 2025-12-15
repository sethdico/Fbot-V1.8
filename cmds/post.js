const fs = require("fs");
const axios = require("axios");
const path = require("path");

module.exports = {
    name: "post",
    usePrefix: false,
    usage: "post <message> (or reply with an image attachment)",
    version: "1.5",
    description: "Creates a Facebook post with a message and optional attachment.",
    cooldown: 5,
    admin: true,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID, messageReply, attachments } = event;
        let postMessage = args.join(" ");
        let files = [];
        let tempFilePaths = []; // To track files for deletion

        // Check if there's any content to post
        if (!postMessage && (!messageReply || messageReply.attachments.length === 0) && (!attachments || attachments.length === 0)) {
             return api.sendMessage("⚠️ Please provide a message or reply to a message with an attachment.", threadID, messageID);
        }

        try {
            // Collect attachments from replied message or direct attachments
            const allAttachments = messageReply?.attachments?.length ? messageReply.attachments : attachments || [];

            // Download attachments if available
            for (let i = 0; i < allAttachments.length; i++) {
                const attachment = allAttachments[i];
                // FIX: Use a safe, unique filename to prevent path traversal issues.
                const tempFileName = `post_temp_${Date.now()}_${i}.${attachment.type === 'photo' ? 'jpg' : 'dat'}`;
                const filePath = path.join(process.cwd(), "cache", tempFileName); // Save to root cache folder
                tempFilePaths.push(filePath);
                
                // Ensure cache directory exists
                if (!fs.existsSync(path.join(process.cwd(), "cache"))) {
                    fs.mkdirSync(path.join(process.cwd(), "cache"), { recursive: true });
                }

                // Download the file
                const fileResponse = await axios({
                    url: attachment.url,
                    method: "GET",
                    responseType: "stream",
                    headers: { "User-Agent": "Mozilla/5.0" }
                });

                const writer = fs.createWriteStream(filePath);
                fileResponse.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on("finish", resolve);
                    writer.on("error", reject);
                });

                files.push(fs.createReadStream(filePath));
            }

            // Prepare post data
            const postData = { body: postMessage || "" }; // Ensure body is not null
            if (files.length > 0) postData.attachment = files;
            
            // Check if there's *any* data to post
            if (!postData.body && files.length === 0) {
                 return api.sendMessage("⚠️ Post message cannot be empty with no attachments.", threadID, messageID);
            }

            // Create the post
            api.createPost(postData)
                .then((url) => {
                    api.sendMessage(
                        `✅ Post created successfully!\n🔗 ${url || "No URL returned."}`,
                        threadID,
                        messageID
                    );
                })
                .catch((error) => {
                    // Handle API errors (e.g., if a partial post was created but threw an error)
                    const errorUrl = error?.data?.story_create?.story?.url;
                    if (errorUrl) {
                        return api.sendMessage(
                            `✅ Post created successfully!\n🔗 ${errorUrl}\n⚠️ (Note: Post created with server warnings)`,
                            threadID,
                            messageID
                        );
                    }

                    let errorMessage = "❌ An unknown error occurred.";
                    if (error?.errors?.length > 0) {
                        errorMessage = error.errors.map((e) => e.message).join("\n");
                    } else if (error.message) {
                        errorMessage = error.message;
                    }

                    api.sendMessage(`❌ Error creating post:\n${errorMessage}`, threadID, messageID);
                });

        } catch (error) {
            console.error("❌ Error processing post:", error);
            api.sendMessage("❌ An error occurred while creating the post (e.g., failed to download image).", threadID, messageID);
        } finally {
            // CRITICAL FIX: Delete ALL temporary files tracked in tempFilePaths
            tempFilePaths.forEach(filePath => {
                if (fs.existsSync(filePath)) {
                    fs.unlink(filePath, (err) => {
                        if (err) console.error("❌ Error deleting file:", filePath, err);
                    });
                }
            });
        }
    }
};
