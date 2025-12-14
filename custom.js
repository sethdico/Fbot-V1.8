const cron = require('node-cron');

const scheduleTasks = (ownerID, api, config = { autoRestart: true, autoGreet: false }) => {
    console.log("✅ Auto-restart scheduler initialized.");

    // 📌 Auto-Restart at 6AM, 12PM, 6PM, 12AM
    if (config.autoRestart) {
        const restartTimes = ['0 6 * * *', '0 12 * * *', '0 18 * * *', '0 0 * * *'];

        restartTimes.forEach(time => {
            cron.schedule(time, () => {
                api.sendMessage("🔄 Bot is restarting automatically...", ownerID, () => {
                    console.log(`🔄 Scheduled restart at ${time}`);
                    process.exit(1);
                });
            }, { timezone: "Asia/Manila" });
        });

        console.log("✅ Auto-restart scheduler started.");
    } else {
        console.log("❌ Auto-restart is disabled.");
    }

    // 📌 Auto-Greet Schedule (DISABLED FOR SAFETY)
    if (config.autoGreet) {
        console.log("⚠️ WARNING: Auto-greet is currently disabled in code to prevent Facebook bans.");
        // The original code here looped through your inbox and messaged everyone instantly.
        // This causes immediate account flags. Do not uncomment unless you add delays.
    }
};

module.exports = scheduleTasks;
