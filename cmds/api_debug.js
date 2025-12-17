module.exports = {
    name: "api_debug",
    admin: true,
    execute: ({ api, event }) => {
        console.log("🛠️ AVAILABLE API FUNCTIONS:", Object.keys(api).sort());
        api.sendMessage("✅ Check your console logs for the function list.", event.threadID);
    }
};
