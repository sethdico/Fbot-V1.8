const cron = require('node-cron');
const path = require('path');
const fs = require('fs');

// Helper to load config safely
function loadConfig() {
    try {
        const configPath = path.resolve(__dirname, '../config.json');
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
        return { ownerID: "" };
    }
}

module.exports = {
    name: "autoPost",
    execute: async (api, event) => {
        console.log("Auto-post event triggered.");
    },
    onStart: async (api) => {
        const config = loadConfig();
        const ownerID = config.ownerID; // FIX: Now dynamic

        const fetchCatFact = async () => {
            try {
                const response = await fetch("https://kaiz-apis.gleeze.com/api/catfact");
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const data = await response.json();
                return data.fact;
            } catch (error) {
                console.error("Error fetching cat fact:", error);
                return null;
            }
        };

        const createPost = async () => {
            const catFact = await fetchCatFact();

            if (catFact) {
                api.createPost({ body: catFact })
                    .then((url) => {
                        const msg = url ? `✅ Auto-post created!\n🔗 ${url}` : "✅ Auto-post created (No URL).";
                        console.log(msg);
                        if (ownerID) api.sendMessage(msg, ownerID);
                    })
                    .catch((error) => {
                        console.error("❌ Error creating post:", error);
                    });
            }
        };

        const autopostSchedules = [
            { cronTime: '0 6 * * *' }, 
            { cronTime: '0 12 * * *' }, 
            { cronTime: '0 18 * * *' }, 
            { cronTime: '0 0 * * *' }, 
        ];

        for (const schedule of autopostSchedules) {
            cron.schedule(schedule.cronTime, () => {
                console.log(`🕒 Scheduled auto-post triggered.`);
                createPost();
            }, { timezone: "Asia/Manila" });
        }

        console.log("✅ Auto-post scheduler started.");
    },
};
