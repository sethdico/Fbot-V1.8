const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "wiki",
    aliases: ["wikipedia", "whatis", "define"],
    usePrefix: false,
    usage: "wiki <topic>",
    version: "3.0",
    description: "Search Wikipedia for a summary and image.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const query = args.join(" ");

        if (!query) return api.sendMessage("⚠️ Usage: wiki <topic>", threadID, messageID);

        try {
            api.setMessageReaction("🔍", messageID, () => {}, true);

            // 1. Use OpenSearch to find the best matching Title (Fixes typos)
            const searchResponse = await axios.get("https://en.wikipedia.org/w/api.php", {
                params: {
                    action: "opensearch",
                    search: query,
                    limit: 1,
                    format: "json"
                }
            });

            const title = searchResponse.data[1][0];
            const wikiLink = searchResponse.data[3][0];

            if (!title) {
                api.setMessageReaction("❌", messageID, () => {}, true);
                return api.sendMessage("❌ No results found.", threadID, messageID);
            }

            // 2. Use Legacy Query API (Won't block Render IPs)
            const apiUrl = "https://en.wikipedia.org/w/api.php";
            const detailsResponse = await axios.get(apiUrl, {
                params: {
                    action: "query",
                    format: "json",
                    prop: "extracts|pageimages",
                    titles: title,
                    pithumbsize: 600, // Image size
                    exintro: true,    // Only the intro
                    explaintext: true, // No HTML tags
                    redirects: 1
                },
                // Fake a real browser to prevent blocking
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
                }
            });

            const pages = detailsResponse.data.query.pages;
            const pageId = Object.keys(pages)[0];
            const pageData = pages[pageId];

            const summary = pageData.extract || "No description available.";
            const imageUrl = pageData.thumbnail ? pageData.thumbnail.source : null;

            const msgBody = `📚 **${title}**\n━━━━━━━━━━━━━━━━\n${summary}\n━━━━━━━━━━━━━━━━\n🔗 ${wikiLink}`;

            if (imageUrl) {
                // Download Image
                const imagePath = path.join(__dirname, "cache", `wiki_${Date.now()}.jpg`);
                
                // Ensure cache dir exists
                const cacheDir = path.join(__dirname, "cache");
                if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

                const imgStream = await axios({
                    url: imageUrl,
                    method: "GET",
                    responseType: "stream"
                });

                const writer = fs.createWriteStream(imagePath);
                imgStream.data.pipe(writer);

                writer.on("finish", () => {
                    api.setMessageReaction("✅", messageID, () => {}, true);
                    api.sendMessage({ 
                        body: msgBody, 
                        attachment: fs.createReadStream(imagePath) 
                    }, threadID, () => {
                        fs.unlinkSync(imagePath); // Delete after sending
                    });
                });
            } else {
                // Text only
                api.setMessageReaction("✅", messageID, () => {}, true);
                api.sendMessage(msgBody, threadID, messageID);
            }

        } catch (error) {
            console.error("Wiki Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            api.sendMessage("❌ An error occurred while fetching from Wikipedia.", threadID, messageID);
        }
    }
};
