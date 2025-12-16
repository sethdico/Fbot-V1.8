const axios = require("axios");

module.exports = {
    name: "48laws",
    aliases: ["law", "laws"],
    usePrefix: false,
    usage: "48laws [number]",
    description: "Get a specific Law of Power (1-48) or a random one.",
    cooldown: 2,

    execute: async ({ api, event, args }) => {
        const { threadID, messageID } = event;
        
        // 1. Check if user provided a number (e.g., "law 1")
        const lawNumber = args[0] ? parseInt(args[0]) : null;

        // Validation for number
        if (lawNumber && (lawNumber < 1 || lawNumber > 48)) {
            return api.sendMessage("⚠️ There are only 48 laws. Please choose between 1 and 48.", threadID, messageID);
        }

        try {
            // If the user asks for a specific number, we use our local list to GUARANTEE accuracy.
            // (Most free APIs are random-only, so this ensures paging works).
            if (lawNumber) {
                const law = getLawByNumber(lawNumber);
                const msg = `📖 **Law #${lawNumber}**\n━━━━━━━━━━━━━━━━\n**${law.title}**\n\n${law.desc}\n━━━━━━━━━━━━━━━━`;
                return api.sendMessage(msg, threadID, messageID);
            }

            // If no number is provided, fetch a random one from the API
            const res = await axios.get("https://betadash-api-swordslush-production.up.railway.app/api/48laws");
            const apiLaw = res.data.law || res.data.result || res.data; 

            api.sendMessage(`📖 **48 Laws of Power (Random)**\n━━━━━━━━━━━━━━━━\n${apiLaw}`, threadID, messageID);

        } catch (e) {
            // Fallback if API fails
            const randomNum = Math.floor(Math.random() * 48) + 1;
            const law = getLawByNumber(randomNum);
            api.sendMessage(`📖 **Law #${randomNum}**\n━━━━━━━━━━━━━━━━\n**${law.title}**\n\n${law.desc}`, threadID, messageID);
        }
    }
};

// 📚 Local Database to ensure Paging /law 1 works perfectly
function getLawByNumber(num) {
    const laws = {
        1: { title: "Never Outshine the Master", desc: "Always make those above you feel comfortably superior." },
        2: { title: "Never Put Too Much Trust in Friends", desc: "Learn how to use enemies." },
        3: { title: "Conceal Your Intentions", desc: "Keep people off-balance and in the dark by never revealing the purpose behind your actions." },
        4: { title: "Always Say Less than Necessary", desc: "When you are trying to impress people with words, the more you say, the more common you appear." },
        5: { title: "So Much Depends on Reputation", desc: "Guard it with your life." },
        6: { title: "Court Attention at all Cost", desc: "Everything is judged by its appearance; what is unseen counts for nothing." },
        7: { title: "Get Others to Do the Work", desc: "But always take the credit." },
        8: { title: "Make Other People Come to You", desc: "Use bait if necessary." },
        9: { title: "Win Through Your Actions", desc: "Never through argument." },
        10: { title: "Infection: Avoid the Unhappy and Unlucky", desc: "You can die from someone else’s misery." },
        11: { title: "Learn to Keep People Dependent on You", desc: "To maintain your independence you must always be needed and wanted." },
        12: { title: "Use Selective Honesty", desc: "Use generosity to disarm your victim." },
        13: { title: "When Asking for Help, Appeal to Self-Interest", desc: "Never appeal to their mercy or gratitude." },
        14: { title: "Pose as a Friend, Work as a Spy", desc: "Learn to probe and find valuable information." },
        15: { title: "Crush Your Enemy Totally", desc: "More is lost through stopping halfway than through total annihilation." },
        16: { title: "Use Absence to Increase Respect", desc: "Too much circulation makes the price go down." },
        17: { title: "Keep Others in Suspended Terror", desc: "Cultivate an air of unpredictability." },
        18: { title: "Do Not Build Fortresses", desc: "Isolation is dangerous." },
        19: { title: "Know Who You're Dealing With", desc: "Do not offend the wrong person." },
        20: { title: "Do Not Commit to Anyone", desc: "It is the fool who always rushes to take sides." },
        21: { title: "Play a Sucker to Catch a Sucker", desc: "Seem dumber than your mark." },
        22: { title: "Use the Surrender Tactic", desc: "Transform weakness into power." },
        23: { title: "Concentrate Your Forces", desc: "Conserve your forces and energies by keeping them concentrated at their strongest point." },
        24: { title: "Play the Perfect Courtier", desc: "Master the art of indirection." },
        25: { title: "Re-Create Yourself", desc: "Do not accept the roles that society hands you." },
        26: { title: "Keep Your Hands Clean", desc: "Conceal your mistakes." },
        27: { title: "Play on People's Need to Believe", desc: "Create a cult-like following." },
        28: { title: "Enter Action with Boldness", desc: "If you are unsure of a course of action, do not attempt it." },
        29: { title: "Plan All the Way to the End", desc: "The ending is everything." },
        30: { title: "Make Your Accomplishments Seem Effortless", desc: "Conceal the clever tricks that go into them." },
        31: { title: "Control the Options", desc: "Get others to play with the cards you deal." },
        32: { title: "Play to People's Fantasies", desc: "The truth is often avoided because it is ugly and unpleasant." },
        33: { title: "Discover Each Man's Thumbscrew", desc: "Everyone has a weakness." },
        34: { title: "Be Royal in Your Own Fashion", desc: "Act like a king to be treated like one." },
        35: { title: "Master the Art of Timing", desc: "Never seem to be in a hurry." },
        36: { title: "Disdain Things You Cannot Have", desc: "Ignoring them is the best revenge." },
        37: { title: "Create Compelling Spectacles", desc: "Striking imagery and grand symbolic gestures create the aura of power." },
        38: { title: "Think as You Like But Behave Like Others", desc: "If you make a show of going against the times, people will think you want attention." },
        39: { title: "Stir Up Waters to Catch Fish", desc: "Anger and emotion are strategically counterproductive." },
        40: { title: "Despise the Free Lunch", desc: "What is offered for free is dangerous." },
        41: { title: "Avoid Stepping into a Great Man's Shoes", desc: "What happens first always appears better and more original than what comes after." },
        42: { title: "Strike the Shepherd and the Sheep will Scatter", desc: "Trouble can often be traced to a single strong individual." },
        43: { title: "Work on the Hearts and Minds of Others", desc: "Coercion creates a reaction that will eventually work against you." },
        44: { title: "Disarm and Infuriate with the Mirror Effect", desc: "When you mirror your enemies, doing exactly as they do, they cannot figure out your strategy." },
        45: { title: "Preach Need for Change, But Never Reform too much", desc: "Too much innovation is traumatic." },
        46: { title: "Never Appear Too Perfect", desc: "Appearing better than others is always dangerous." },
        47: { title: "Do Not Go Past the Mark You Aimed For", desc: "In victory, know when to stop." },
        48: { title: "Assume Formlessness", desc: "By taking a shape, by having a visible plan, you open yourself to attack." }
    };
    
    return laws[num] || { title: "Unknown", desc: "" };
}
