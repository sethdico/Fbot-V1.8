const cron = require('node-cron');
const axios = require('axios'); // Use axios instead of fetch for older node versions

module.exports = {
    name: "autoPost",
    // This function runs when the bot starts
    onStart: async (api) => {
        console.log("📅 AutoPost Scheduler: STARTED");

        const postFact = async () => {
            try {
                // Get a random cat fact
                const res = await axios.get("https://catfact.ninja/fact");
                const fact = res.data.fact;

                if (fact) {
                    api.createPost({ body: `🐱 **Daily Cat Fact**\n\n${fact}` })
                       .then(url => console.log(`✅ AutoPost Success: ${url}`))
                       .catch(e => console.error("❌ AutoPost Failed:", e));
                }
            } catch (e) {
                console.error("❌ Error fetching fact:", e.message);
            }
        };

        // Schedule: 7AM, 1PM, 7PM (Manila Time)
        const times = ['0 7 * * *', '0 13 * * *', '0 19 * * *'];
        
        times.forEach(time => {
            cron.schedule(time, () => {
                console.log("⏰ Triggering AutoPost...");
                postFact();
            }, { timezone: "Asia/Manila" });
        });
    },
    execute: async () => {} // Not used for message events
};
