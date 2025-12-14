// ================================================
// FILE: custom.js
// ================================================
const cron = require('node-cron');

const scheduleTasks = (ownerID, api, config = { autoRestart: true, autoGreet: false }) => {
    console.log("✅ Scheduler initialized with Human Jitter.");

    // Helper: Random delay between min and max minutes
    const randomJitter = (minMinutes, maxMinutes) => {
        return (Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes) * 60 * 1000;
    };

    // 📌 Auto-Restart with Jitter
    if (config.autoRestart) {
        // Scheduled for: 6AM, 12PM, 6PM, 12AM
        const restartTimes = ['0 6 * * *', '0 12 * * *', '0 18 * * *', '0 0 * * *'];

        restartTimes.forEach(time => {
            cron.schedule(time, () => {
                // DON'T restart immediately. Wait 1 to 15 minutes randomly.
                const jitter = randomJitter(1, 15);
                console.log(`⏰ Cron triggered. Waiting ${jitter / 1000}s to simulate human inconsistency...`);
                
                setTimeout(() => {
                    api.sendMessage("💤 Taking a quick nap (Restarting)...", ownerID, () => {
                        process.exit(1);
                    });
                }, jitter);
            }, { timezone: "Asia/Manila" });
        });

        console.log("✅ Auto-restart scheduler started.");
    } else {
        console.log("❌ Auto-restart is disabled.");
    }

    if (config.autoGreet) {
        console.log("⚠️ Auto-greet kept disabled for safety.");
    }
};

module.exports = scheduleTasks;
