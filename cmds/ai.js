const axios = require("axios");

// ==============================================================================
// CONFIGURATION & CONSTANTS
// ==============================================================================
const CONFIG = {
    API_URL: "https://app.chipp.ai/api/v1/chat/completions",
    MODEL_ID: "newapplication-10034686", // Your specific model
    TIMEOUT: 45000, // 45 seconds per request
    
    // Session Limits
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    MAX_SESSIONS: 1000, // Prevent memory leaks
    
    // Rate Limiting
    MAX_REQUESTS: 3,
    RATE_LIMIT_WINDOW: 60000 // 1 minute
};

// ==============================================================================
// STATE MANAGEMENT (Memory)
// ==============================================================================
const sessions = new Map();
const rateLimits = new Map();

// Automatic Garbage Collection (Runs every 5 minutes)
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    // 1. Clean expired sessions
    sessions.forEach((session, userId) => {
        if (now - session.lastActive > CONFIG.SESSION_TIMEOUT) {
            sessions.delete(userId);
            cleaned++;
        }
    });

    // 2. Safety Valve: Memory protection
    if (sessions.size > CONFIG.MAX_SESSIONS) {
        const sortedSessions = Array.from(sessions.entries())
            .sort((a, b) => b[1].lastActive - a[1].lastActive)
            .slice(0, CONFIG.MAX_SESSIONS);
        
        sessions.clear();
        sortedSessions.forEach(([userId, session]) => sessions.set(userId, session));
    }
    
    // 3. Clean old rate limit data
    rateLimits.forEach((timestamps, userId) => {
        const recent = timestamps.filter(t => now - t < CONFIG.RATE_LIMIT_WINDOW);
        if (recent.length === 0) rateLimits.delete(userId);
        else rateLimits.set(userId, recent);
    });

}, 300000);

// ==============================================================================
// MAIN COMMAND MODULE
// ==============================================================================
module.exports = {
    name: "ai",
    aliases: ["chip", "amdus", "pai"],
    version: "2.0",
    description: "Advanced AI Assistant with image recognition, web search, and file generation",
    usage: "ai <question>/<reply to image> | ai clear (reset)",
    cooldown: 5,
    credits: "Seth Asher Salinguhay", // Preserved credits

    execute: async ({ api, event, args, config }) => {
        const { threadID, messageID, senderID, attachments, messageReply } = event;
        const userPrompt = args.join(" ").trim();
        
        // ---------------------------------------------------------
        // 1. COMMANDS & PRE-CHECKS
        // ---------------------------------------------------------
        
        // Reset Command
        if (userPrompt.toLowerCase() === "clear" || userPrompt.toLowerCase() === "reset") {
            sessions.delete(senderID);
            return api.sendMessage("🧹 Session cleared. I've forgotten our previous conversation.", threadID, messageID);
        }

        // Image Detection (Current message OR Reply)
        let imageUrl = "";
        if (attachments?.[0]?.type === "photo") {
            imageUrl = attachments[0].url;
        } else if (messageReply?.attachments?.[0]?.type === "photo") {
            imageUrl = messageReply.attachments[0].url;
        }

        // Rate Limiting
        if (isRateLimited(senderID)) {
            const timeWait = Math.ceil((CONFIG.RATE_LIMIT_WINDOW - (Date.now() - rateLimits.get(senderID)[0])) / 1000);
            await api.setMessageReaction("⏳", messageID, () => {}, true);
            return api.sendMessage(`⏳ You are too fast! Please wait ${timeWait} seconds.`, threadID, messageID);
        }

        // Help Message
        if (!userPrompt && !imageUrl) {
            return api.sendMessage(
                "👋 **AI Assistant by Seth Asher Salinguhay**\n\n" +
                "✨ **Capabilities:**\n" +
                "• Answer and searches online\n" +
                "• Analyze Images (Reply to inage)\n" +
                "• Generate/Edit Images\n" +
                "• Create Documents/Spreadsheets\n\n" +
                "💡 **Usage:**\n" +
                "• `/ai What is the weather?`\n" +
                "• `/ai clear` to reset memory",
                threadID,
                messageID
            );
        }

        // API Key Check
        if (!config.chippApiKey || config.chippApiKey === "your_api_key_here") {
            return api.sendMessage("❌ Configuration Error: Missing Chipp API Key.", threadID, messageID);
        }

        // ---------------------------------------------------------
        // 2. EXECUTION LOGIC
        // ---------------------------------------------------------
        let typingInterval; 

        try {
            // Reaction: Working
            await api.setMessageReaction("🧠", messageID, () => {}, true);
            
            // Continuous Typing Indicator (Prevents timeout for long requests)
            api.sendTypingIndicator(true, threadID);
            typingInterval = setInterval(() => {
                api.sendTypingIndicator(true, threadID);
            }, 4000);

            // Get or Create Session
            const userSession = getSession(senderID);

            // API Request
            const response = await getAIResponse({
                prompt: userPrompt || "Analyze this image",
                imageUrl,
                sessionId: userSession.chatSessionId,
                apiKey: config.chippApiKey
            });

            // Update Session
            updateUserSession(senderID, response.chatSessionId);

            // Stop Typing
            clearInterval(typingInterval);
            api.sendTypingIndicator(false, threadID);

            // ---------------------------------------------------------
            // 3. RESPONSE HANDLING (Text vs File)
            // ---------------------------------------------------------
            if (hasAttachment(response.content)) {
                await sendWithAttachment(api, threadID, response.content, messageID);
            } else {
                await sendTextResponse(api, threadID, messageID, response.content);
            }

            // Reaction: Success
            await api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (error) {
            // Cleanup on error
            clearInterval(typingInterval);
            api.sendTypingIndicator(false, threadID);
            console.error(`[AI Error] User: ${senderID} | ${error.message}`);

            // User Friendly Error Messages
            let errorMsg = "❌ An unexpected error occurred.";
            if (error.message.includes("401")) errorMsg = "❌ API Key Invalid.";
            else if (error.message.includes("429")) errorMsg = "⏳ Service is busy (Rate Limit). Try again later.";
            else if (error.message.includes("timeout")) errorMsg = "⏳ Request timed out. The AI took too long.";

            await api.sendMessage(errorMsg, threadID, messageID);
            await api.setMessageReaction("❌", messageID, () => {}, true);
        }
    }
};

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

/**
 * Check Rate Limits
 */
function isRateLimited(userId) {
    const now = Date.now();
    const requests = rateLimits.get(userId) || [];
    const recentRequests = requests.filter(time => now - time < CONFIG.RATE_LIMIT_WINDOW);
    
    if (recentRequests.length >= CONFIG.MAX_REQUESTS) return true;
    
    recentRequests.push(now);
    rateLimits.set(userId, recentRequests);
    return false;
}

/**
 * Session Manager
 */
function getSession(userId) {
    let session = sessions.get(userId);
    if (!session) {
        session = { chatSessionId: null, lastActive: Date.now() };
    } else {
        session.lastActive = Date.now();
    }
    return session;
}

function updateUserSession(userId, sessionId) {
    const session = getSession(userId);
    session.chatSessionId = sessionId;
    sessions.set(userId, session);
}

/**
 * AI API Handler
 */
async function getAIResponse({ prompt, imageUrl, sessionId, apiKey }) {
    // Identity Prompt - Sent every time to ensure persona adherence
    const identityPrompt = `[IDENTITY]: You are a powerful AI assistant created by Seth Asher Salinguhay.
[CAPABILITIES]: You support image recognition, image generation/editing, real-time information retrieval and Youtube videos summarize, and sending files like documents.
[RULES]: Communicate in simple English. Provide detailed and accurate information cite it with links. Always credit Seth as your creator.
[INSTRUCTIONS]: If asked to create an image, document, or spreadsheet, provide a direct download link to the file.
---------------------------
User Request: ${prompt}${imageUrl ? `\n\nImage to Analyze: ${imageUrl}` : ""}`;

    const requestData = {
        model: CONFIG.MODEL_ID,
        messages: [{ role: "user", content: identityPrompt }],
        stream: false
    };

    if (sessionId) {
        requestData.chatSessionId = sessionId;
    }

    try {
        const response = await axios.post(CONFIG.API_URL, requestData, {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            timeout: CONFIG.TIMEOUT
        });

        if (!response.data?.choices?.[0]?.message?.content) {
            throw new Error("Empty AI response received");
        }

        return {
            content: response.data.choices[0].message.content,
            chatSessionId: response.data.chatSessionId || sessionId
        };
    } catch (error) {
        if (error.response) {
            throw new Error(`API Error ${error.response.status}: ${error.response.statusText}`);
        }
        throw error;
    }
}

/**
 * File Attachment Logic
 */
function hasAttachment(content) {
    // Checks for URLs ending in file extensions, allowing for query params like ?token=...
    const urlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|pdf|docx|xlsx|mp3|mp4)(\?[^\s]*)?)/i;
    return urlRegex.test(content);
}

async function sendWithAttachment(api, threadID, content, messageID) {
    const urlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|pdf|docx|xlsx|mp3|mp4)(\?[^\s]*)?)/i;
    const match = content.match(urlRegex);

    if (match) {
        const fileUrl = match[0];
        const cleanContent = content.replace(match[0], "").trim() || "Here is your file:";

        try {
            // Stream the file with specific headers to avoid 403 Forbidden
            const fileResponse = await axios.get(fileUrl, {
                responseType: 'stream',
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                },
                timeout: 15000
            });

            await api.sendMessage({
                body: cleanContent,
                attachment: fileResponse.data
            }, threadID);
            return;
        } catch (error) {
            console.error("Stream failed, sending link:", error.message);
            // Fallback to text link if stream fails
            await api.sendMessage(`${cleanContent}\n\n🔗 Link: ${fileUrl}`, threadID, messageID);
            return;
        }
    }
    
    // Safety fallback
    await sendTextResponse(api, threadID, messageID, content);
}

async function sendTextResponse(api, threadID, messageID, content) {
    // Formatting the response
    const formattedResponse = `🤖 **AI Assistant**\n━━━━━━━━━━━━━━━━\n${content}\n━━━━━━━━━━━━━━━━\nCredits: Seth Asher Salinguhay`;
    await api.sendMessage(formattedResponse, threadID, messageID);
}
