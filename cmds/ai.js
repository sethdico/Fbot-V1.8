const axios = require("axios");

// === SESSION MANAGEMENT ===
// Stores user conversation sessions with automatic cleanup
const sessions = new Map();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const MAX_SESSIONS = 1000; // Prevent memory leaks

// Clean expired sessions every 5 minutes
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    sessions.forEach((session, userId) => {
        if (now - session.lastActive > SESSION_TIMEOUT) {
            sessions.delete(userId);
            cleaned++;
        }
    });
    
    // Safety valve: if too many sessions, keep only most recent ones
    if (sessions.size > MAX_SESSIONS) {
        const sortedSessions = Array.from(sessions.entries())
            .sort((a, b) => b[1].lastActive - a[1].lastActive)
            .slice(0, MAX_SESSIONS);
        
        sessions.clear();
        sortedSessions.forEach(([userId, session]) => sessions.set(userId, session));
    }
}, 300000);

// === RATE LIMITING ===
const rateLimits = new Map();
const MAX_REQUESTS = 3; // requests per window
const RATE_LIMIT_WINDOW = 60000; // 1 minute

/**
 * Checks if user has exceeded rate limits
 * @param {string} userId - Facebook user ID
 * @returns {boolean} true if rate limited
 */
const isRateLimited = (userId) => {
    const now = Date.now();
    const userKey = `ai_${userId}`;
    const requests = rateLimits.get(userKey) || [];
    
    // Filter out old requests
    const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
    
    if (recentRequests.length >= MAX_REQUESTS) {
        return true;
    }
    
    // Update rate limit tracking
    recentRequests.push(now);
    rateLimits.set(userKey, recentRequests);
    
    return false;
};

// === MAIN COMMAND DEFINITION ===
module.exports = {
    name: "ai",
    aliases: ["chip", "amdus", "pai"],
    usePrefix: false,
    description: "Advanced AI Assistant with image recognition, web search, and file generation",
    usage: "ai <question or command>",
    cooldown: 5,
    
    /**
     * Main command execution function
     * @param {Object} context - Command context
     * @param {Object} context.api - Facebook API wrapper
     * @param {Object} context.event - Message event
     * @param {Array} context.args - Command arguments
     * @param {Object} context.config - Bot configuration
     */
    execute: async ({ api, event, args, config }) => {
        const { threadID, messageID, senderID, attachments, messageReply } = event;
        const userPrompt = args.join(" ").trim();
        let imageUrl = "";
        
        // === STEP 1: INPUT VALIDATION ===
        // Detect image from attachments or reply
        if (attachments?.[0]?.type === "photo") {
            imageUrl = attachments[0].url;
        } else if (messageReply?.attachments?.[0]?.type === "photo") {
            imageUrl = messageReply.attachments[0].url;
        }
        
        // Rate limiting check
        if (isRateLimited(senderID)) {
            const resetTime = Math.ceil((RATE_LIMIT_WINDOW - (Date.now() - rateLimits.get(`ai_${senderID}`)[0])) / 1000);
            await api.sendMessage(
                `⏳ You're sending requests too quickly. Please wait ${resetTime} seconds before trying again.`,
                threadID,
                messageID
            );
            await api.setMessageReaction("⏳", messageID, () => {}, true);
            return;
        }
        
        // Help message if no input
        if (!userPrompt && !imageUrl) {
            return api.sendMessage(
                "👋 Hi! I'm your AI Assistant by Seth Asher Salinguhay.\n\n" +
                "✨ **What I can do:**\n" +
                "• Answer questions and have conversations\n" +
                "• Analyze images you send or reply to\n" +
                "• Generate images or edit\n" +
                "• Search the web\n" +
                "• Create documents and spreadsheets\n\n" +
                "💡 **Try:** `/ai What's the weather like today?`\n" +
                "🖼️ **Or send me a photo** to analyze!",
                threadID,
                messageID
            );
        }
        
        // Validate API key
        if (!config.chippApiKey || config.chippApiKey === "your_api_key_here") {
            return api.sendMessage(
                "❌ AI service is not configured properly. Please contact the bot owner.",
                threadID,
                messageID
            );
        }
        
        // === STEP 2: PROCESSING SETUP ===
        try {
            // Initial reaction to show we're working
            await api.setMessageReaction("🧠", messageID, () => {}, true);
            
            // Create or retrieve user session
            const userSession = getSession(senderID);
            
            // Send typing indicator
            if (typeof api.sendTypingIndicator === 'function') {
                await api.sendTypingIndicator(true, threadID);
            }
            
            // === STEP 3: API REQUEST ===
            const response = await getAIResponse({
                prompt: userPrompt || "Analyze this image",
                imageUrl,
                sessionId: userSession.chatSessionId,
                apiKey: config.chippApiKey
            });
            
            // Update session
            updateUserSession(senderID, response.chatSessionId);
            
            // === STEP 4: RESPONSE PROCESSING ===
            if (hasAttachment(response.content)) {
                await sendWithAttachment(api, threadID, response.content);
            } else {
                await sendTextResponse(api, threadID, messageID, response.content);
            }
            
            // Success reaction
            await api.setMessageReaction("✅", messageID, () => {}, true);
            
        } catch (error) {
            console.error(`[AI Command Error] User: ${senderID}, Error:`, error.message || error);
            
            // Handle specific errors with user-friendly messages
            let errorMessage = "❌ I encountered an error while processing your request.";
            
            if (error.message?.includes("401") || error.message?.includes("invalid api key")) {
                errorMessage = "❌ The AI service is not properly configured. Please contact the bot owner.";
            } else if (error.message?.includes("429") || error.message?.includes("rate limit")) {
                errorMessage = "⏳ The AI service is busy. Please try again in a minute.";
            } else if (error.message?.includes("timeout") || error.code === "ECONNABORTED") {
                errorMessage = "⏳ The AI service is taking too long to respond. Please try again later.";
            } else if (error.message?.includes("Error retrieving userID")) {
                errorMessage = "❌ I lost connection to the AI service. Please try again in a few minutes.";
            }
            
            await api.sendMessage(errorMessage, threadID, messageID);
            await api.setMessageReaction("❌", messageID, () => {}, true);
            
            // Clean up session on error
            sessions.delete(senderID);
        } finally {
            // Always turn off typing indicator
            if (typeof api.sendTypingIndicator === 'function') {
                await api.sendTypingIndicator(false, threadID);
            }
        }
    }
};

// === HELPER FUNCTIONS ===

/**
 * Get or create a user session
 * @param {string} userId - Facebook user ID
 * @returns {Object} Session object
 */
function getSession(userId) {
    const now = Date.now();
    let session = sessions.get(userId);
    
    if (!session) {
        // Create new session
        session = {
            chatSessionId: null,
            lastActive: now
        };
    } else {
        // Update last active time
        session.lastActive = now;
    }
    
    return session;
}

/**
 * Update user session with new session ID
 * @param {string} userId - Facebook user ID
 * @param {string} sessionId - New session ID from API
 */
function updateUserSession(userId, sessionId) {
    const session = getSession(userId);
    session.chatSessionId = sessionId;
    sessions.set(userId, session);
}

/**
 * Get AI response from API
 * @param {Object} params - Request parameters
 * @returns {Object} AI response
 */
async function getAIResponse({ prompt, imageUrl, sessionId, apiKey }) {
    const identityPrompt = `[IDENTITY]: You are a powerful AI assistant created by Seth Asher Salinguhay.
[CAPABILITIES]: You support image recognition, image generation/editing, real-time information retrieval, and sending files like documents.
[RULES]: Communicate in simple English. Provide detailed and accurate information. Always credit Seth as your creator.
[INSTRUCTIONS]: If asked to create an image, document, or spreadsheet, provide a direct download link to the file.
---------------------------
User Request: ${prompt}${imageUrl ? `\n\nImage to Analyze: ${imageUrl}` : ""}`;
    
    const requestData = {
        model: "newapplication-10034686",
        messages: [{ role: "user", content: identityPrompt }],
        stream: false
    };
    
    if (sessionId) {
        requestData.chatSessionId = sessionId;
    }
    
    try {
        const response = await axios.post(
            "https://app.chipp.ai/api/v1/chat/completions",
            requestData,
            {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                timeout: 45000 // 45 second timeout
            }
        );
        
        if (!response.data?.choices?.[0]?.message?.content) {
            throw new Error("Empty AI response received");
        }
        
        return {
            content: response.data.choices[0].message.content,
            chatSessionId: response.data.chatSessionId || sessionId
        };
    } catch (error) {
        // Enhanced error handling
        if (error.response) {
            // Server responded with error status
            const errorData = error.response.data;
            throw new Error(`AI API Error ${error.response.status}: ${errorData.message || error.message}`);
        } else if (error.request) {
            // Request was made but no response received
            throw new Error("No response from AI service. The service might be down.");
        } else {
            // Error in request configuration
            throw new Error(`Request setup error: ${error.message}`);
        }
    }
}

/**
 * Check if response contains a file attachment URL
 * @param {string} content - AI response content
 * @returns {boolean} true if contains attachment
 */
function hasAttachment(content) {
    const urlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|pdf|docx|xlsx|mp3|mp4))/i;
    return urlRegex.test(content);
}

/**
 * Send response with attachment
 * @param {Object} api - Facebook API
 * @param {string} threadID - Thread ID
 * @param {string} content - Message content
 */
async function sendWithAttachment(api, threadID, content) {
    const urlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|pdf|docx|xlsx|mp3|mp4))/i;
    const match = content.match(urlRegex);
    
    if (match) {
        const fileUrl = match[0].replace(/[()\[\]"']/g, "").trim();
        const cleanContent = content.replace(match[0], "").replace(/\s+/g, " ").trim() || "Here's your file:";
        
        try {
            // Stream file directly without saving to disk
            const fileResponse = await axios.get(fileUrl, { 
                responseType: 'stream',
                timeout: 15000
            });
            
            await api.sendMessage({
                body: cleanContent,
                attachment: fileResponse.data
            }, threadID);
            
            return;
        } catch (streamError) {
            console.error("Attachment streaming error:", streamError.message);
        }
    }
    
    // Fallback to text if attachment fails
    await api.sendMessage(content, threadID);
}

/**
 * Send text response with formatting
 * @param {Object} api - Facebook API
 * @param {string} threadID - Thread ID
 * @param {string} messageID - Original message ID
 * @param {string} content - Response content
 */
async function sendTextResponse(api, threadID, messageID, content) {
    // Format the response nicely
    const formattedResponse = `🤖 **AI Assistant**
━━━━━━━━━━━━━━━━
${content}
━━━━━━━━━━━━━━━━
💡 *Tip: You can send images for analysis or ask me to create files!*`;
    
    await api.sendMessage(formattedResponse, threadID, messageID);
}
