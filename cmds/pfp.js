module.exports = {
    name: "profilepicture",
    aliases: ["pfp", "pic", "av"],
    usePrefix: false,
    description: "Get a user's profile picture.",
    usage: "avatar @mention | avatar",
    
    execute: async ({ api, event, args }) => {
        let targetID = event.senderID;
        
        if (event.mentions && Object.keys(event.mentions).length > 0) {
            targetID = Object.keys(event.mentions)[0];
        } else if (args[0]) {
            targetID = args[0];
        }

        // Facebook Graph URL for high-res image
        const url = `https://graph.facebook.com/${targetID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

        api.sendMessage({
            body: `🖼️ **Avatar**`,
            attachment: await require('axios').get(url, { responseType: 'stream' }).then(res => res.data)
        }, event.threadID);
    }
};
