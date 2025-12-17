const axios = require("axios");
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: "wiki",
    aliases: ["wikipedia", "w", "searchwiki", "encyclopedia"],
    usePrefix: false,
    usage: "wiki <article name>",
    version: "2.1",
    description: "Search Wikipedia with smart article detection and rich formatting",
    cooldown: 6,
    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        const query = args.join(" ").trim();
        
        // Help message if no query
        if (!query) {
            return api.sendMessage(
                `📘 **Wikipedia Search System**
━━━━━━━━━━━━━━━━
🔍 **Usage Examples:**
→ wiki Albert Einstein
→ wiki Quantum mechanics
→ wiki Philippines history
→ wiki Machine learning

💡 **Smart Features:**
✅ Auto-corrects typos and misspellings
✅ Finds most relevant article automatically
✅ Shows summary with key facts
✅ Includes link to full article
✅ Handles disambiguation pages
✅ Works with partial article names

⚡ **Tips:**
- Be specific for better results
- Use full names for people/places
- Try adding context words if needed
━━━━━━━━━━━━━━━━
Start by typing: wiki <your topic>`,
                threadID,
                messageID
            );
        }
        
        try {
            api.setMessageReaction("🔍", messageID, () => {}, true);
            const startTime = Date.now();
            
            // Search for articles matching the query
            const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
            const searchResponse = await axios.get(searchUrl, { timeout: 15000 });
            const searchResults = searchResponse.data?.query?.search;
            
            if (!searchResults || searchResults.length === 0) {
                throw new Error("No matching articles found");
            }
            
            // Get the most relevant article (first result)
            const articleTitle = searchResults[0].title;
            console.log(`✅ Found Wikipedia article: "${articleTitle}" for query "${query}"`);
            
            // Get article summary and details
            const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(articleTitle)}`;
            const summaryResponse = await axios.get(summaryUrl, { timeout: 15000 });
            const pageData = summaryResponse.data;
            
            if (pageData.type === "disambiguation") {
                // Handle disambiguation page - suggest alternatives
                const suggestions = searchResults.slice(0, 5).map(r => r.title).join("\n→ ");
                return api.sendMessage(
                    `❓ **Disambiguation Page**
━━━━━━━━━━━━━━━━
"${articleTitle}" has multiple meanings. Try one of these instead:
→ ${suggestions}
━━━━━━━━━━━━━━━━
💡 Type "wiki <specific topic>" for better results.`,
                    threadID,
                    messageID
                );
            }
            
            // Extract and format summary
            let summary = pageData.extract || "No summary available.";
            
            // Smart truncation - keep complete sentences
            if (summary.length > 600) {
                const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 0);
                let truncatedSummary = "";
                let charCount = 0;
                
                for (const sentence of sentences) {
                    if (charCount + sentence.length + 1 > 550) break;
                    truncatedSummary += sentence.trim() + ".";
                    charCount += sentence.length + 1;
                }
                
                if (truncatedSummary.length < summary.length * 0.7) {
                    summary = truncatedSummary + " (Read more on Wikipedia)";
                }
            }
            
            // Get page URL and clean it
            const pageUrl = new URL(pageData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(articleTitle)}`);
            
            // Get main image if available
            let imageUrl = pageData.thumbnail?.source || null;
            let hasImage = false;
            
            // Build the message
            let msg = `📘 **Wikipedia: ${articleTitle}**
━━━━━━━━━━━━━━━━
${summary}
━━━━━━━━━━━━━━━━
🔗 **Full Article:** ${pageUrl.toString()}`;
            
            // Add additional information if available
            if (pageData.description) {
                msg += `\n\n📌 **Description:** ${pageData.description}`;
            }
            
            api.setMessageReaction("✅", messageID, () => {}, true);
            console.log(`✅ Wikipedia query completed in ${Date.now() - startTime}ms`);
            
            // Send image if available and working
            if (imageUrl) {
                try {
                    // Test if image URL is accessible
                    await axios.head(imageUrl, { timeout: 5000 });
                    hasImage = true;
                    
                    // Download image to cache
                    const cacheDir = path.resolve(__dirname, "..", "cache");
                    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
                    
                    const imagePath = path.join(cacheDir, `wiki_${Date.now()}.jpg`);
                    const imageResponse = await axios.get(imageUrl, { 
                        responseType: 'arraybuffer',
                        timeout: 15000
                    });
                    
                    fs.writeFileSync(imagePath, imageResponse.data);
                    
                    // Send message with image
                    return api.sendMessage({
                        body: msg,
                        attachment: fs.createReadStream(imagePath)
                    }, threadID, (err) => {
                        if (err) console.error("Wiki image send error:", err);
                        // Clean up file after sending
                        setTimeout(() => {
                            try { fs.unlinkSync(imagePath); } 
                            catch (e) { console.warn("Cleanup warning:", e.message); }
                        }, 5000);
                    });
                } catch (imageError) {
                    console.warn("Wiki image loading failed:", imageError.message);
                    // Fall back to text-only message
                }
            }
            
            // Send text-only message if no image or image failed
            return api.sendMessage(msg, threadID, messageID);
            
        } catch (error) {
            console.error("❌ Wiki Error:", error.message || error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            
            // Handle specific errors
            if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
                return api.sendMessage("⏳ Wikipedia is taking too long to respond. Please try again in 30 seconds.", threadID, messageID);
            }
            
            if (error.message?.includes("404") || error.message?.includes("not found")) {
                return api.sendMessage(
                    `❌ **No Wikipedia Article Found**
━━━━━━━━━━━━━━━━
We couldn't find an article for "${query}".
━━━━━━━━━━━━━━━━
💡 Try these alternatives:
→ Check spelling and capitalization
→ Use more specific terms
→ Add context (e.g., "Albert Einstein physicist")
→ Try related terms
→ Use quotes for exact phrases: wiki "Quantum mechanics"
━━━━━━━━━━━━━━━━
🔍 Type "wiki" for more search tips`,
                    threadID,
                    messageID
                );
            }
            
            if (error.message?.includes("429") || error.message?.includes("rate limit")) {
                return api.sendMessage("⏳ Too many Wikipedia requests. Please wait 1 minute and try again.", threadID, messageID);
            }
            
            return api.sendMessage(
                `❌ **Wikipedia Search Failed**
━━━━━━━━━━━━━━━━
We tried to search Wikipedia but encountered an error.
━━━━━━━━━━━━━━━━
💡 Please try:
- Different search terms
- More specific article names
- Checking your internet connection
- Trying again in a few minutes
━━━━━━━━━━━━━━━━
🔍 Query: "${query}"`,
                threadID,
                messageID
            );
        }
    }
};
