module.exports = {
    name: "8ball",
    usePrefix: false,
    usage: "8ball <question>",
    description: "Ask the magic 8ball a question.",
    
    execute: ({ api, event, args }) => {
        if (args.length === 0) return api.sendMessage("🎱 You need to ask a question!", event.threadID);
        
        const answers = [
            "It is certain.", "It is decidedly so.", "Without a doubt.",
            "Yes definitely.", "You may rely on it.", "As I see it, yes.",
            "Most likely.", "Outlook good.", "Yes.", "Signs point to yes.",
            "Reply hazy, try again.", "Ask again later.", "Better not tell you now.",
            "Cannot predict now.", "Concentrate and ask again.",
            "Don't count on it.", "My reply is no.", "My sources say no.",
            "Outlook not so good.", "Very doubtful."
        ];
        
        const random = answers[Math.floor(Math.random() * answers.length)];
        api.sendMessage(`🎱 ${random}`, event.threadID, event.messageID);
    }
};
