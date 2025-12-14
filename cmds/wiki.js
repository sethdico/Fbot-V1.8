const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "wiki",
    aliases: ["wikipedia", "whatis", "define"],
    usePrefix: false, // Can be used as /wiki or just wiki (if system allows)
    usage: "wiki <topic>",
    version: "2.0",
    description: "Search Wikipedia for a summary and image of any topic.",
    cooldown: 5,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const query = args.join(" ");

        if (!query) {
            return api.sendMessage("⚠️ Please provide a topic to search.\nUsage: /wiki <topic>", threadID, messageID);
        }

        try {
            // 1. React to indicate searching
            api.setMessageReaction("🔍", messageID, () => {}, true);

            // STEP 1: Search for the best matching title (Handles typos & casing)
            const searchUrl = "https://en.wikipedia.org/w/api.php";
            const searchResponse = await axios.get(searchUrl, {
                params: {
                    action: "opensearch",
                    search: query,
                    limit: 1,
                    format: "json"
                }
            });

            // The API returns [search_term, [titles], [descriptions], [links]]
            const titles = searchResponse.data[1];
            const links = searchResponse.data[3];

            if (titles.length === 0) {
                api.setMessageReaction("❌", messageID, () => {}, true);
                return api.sendMessage(`❌ No results found for "${query}" on Wikipedia.`, threadID, messageID);
            }

            const bestTitle = titles[0];
            const wikiLink = links[0];

            // STEP 2: Get the details (Intro text + Image) using the specific title
            const detailsResponse = await axios.get("https://en.wikipedia.org/w/api.php", {
                params: {
                    action: "query",
                    prop: "extracts|pageimages",
                    titles: bestTitle,
                    exintro: true,      // Only get the introduction
                    explaintext: true,  // Plain text, no HTML
                    pithumbsize: 500,   // Image width
                    format: "json"
                }
            });

            const pages = detailsResponse.data.query.pages;
            const pageId = Object.keys(pages)[0];
            const pageData = pages[pageId];

            const summary = pageData.extract || "No description available.";
            const imageUrl = pageData.thumbnail ? pageData.thumbnail.source : null;

            // Prepare the text message
            const finalMessage = `📚 **${bestTitle}**\n━━━━━━━━━━━━━━━━\n${summary}\n━━━━━━━━━━━━━━━━\n🔗 Read more: ${wikiLink}`;

            // STEP 3: Send (With Image if available, Text-only if not)
            if (imageUrl) {
                const filePath = path.join(__dirname, "cache", `wiki_${Date.now()}.jpg`);
                
                // Ensure cache folder exists
                const cacheDir = path.join(__dirname, "cache");
                if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

                // Download image
                const imageStream = await axios({
                    url: imageUrl,
                    method: "GET",
                    responseType: "stream"
                });

                const writer = fs.createWriteStream(filePath);
                imageStream.data.pipe(writer);

                writer.on("finish", () => {
                    api.setMessageReaction("✅", messageID, () => {}, true);
                    const msg = {
                        body: finalMessage,
                        attachment: fs.createReadStream(filePath)
                    };
                    api.sendMessage(msg, threadID, () => fs.unlinkSync(filePath)); // Delete file after sending
                });
            } else {
                // No image found, just send text
                api.setMessageReaction("✅", messageID, () => {}, true);
                api.sendMessage(finalMessage, threadID, messageID);
            }

        } catch (error) {
            console.error("❌ Wiki Error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ An error occurred while fetching from Wikipedia.", threadID, messageID);
        }
    }
};
