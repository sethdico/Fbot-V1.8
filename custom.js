const cron = require('node-cron');

const scheduleTasks = (ownerID, api, config = { autoRestart: true }) => {
    console.log("✅ Scheduler initialized.");

    const randomJitter = (min, max) => (Math.floor(Math.random() * (max - min + 1)) + min) * 60 * 1000;

    if (config.autoRestart) {
        // Restart at 6AM, 12PM, 6PM, 12AM
        ['0 6 * * *', '0 12 * * *', '0 18 * * *', '0 0 * * *'].forEach(time => {
            cron.schedule(time, () => {
                const delay = randomJitter(1, 10); // Wait 1-10 mins
                console.log(`⏰ Scheduled restart. Waiting ${delay/1000}s...`);
                
                setTimeout(() => {
                    api.sendMessage("🔄 System Refreshing...", ownerID, () => process.exit(1));
                }, delay);
            }, { timezone: "Asia/Manila" });
        });
    }
};

module.exports = scheduleTasks;
