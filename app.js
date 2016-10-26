//Add your requirements 
2 var restify = require('restify'); 
3 var builder = require('botbuilder'); 
4 
 
5 var appId = process.env.MY_APP_ID || "Missing your app ID"; 
6 var appSecret = process.env.MY_APP_SECRET || "Missing your app secret"; 
7 
 
server.get('/', restify.serveStatic({
 directory: __dirname,
 default: '/index.html'
}));

var bot = new builder.TextBot();
bot.add('/', function (session) {
    if (!session.userData.name) {
        session.beginDialog('/profile');
    } else {
        session.send('Hello %s!', session.userData.name);
    }
});
bot.add('/profile', [
    function (session) {
        builder.Prompts.text(session, 'Hi! What is your name?');
    },
    function (session, results) {
        session.userData.name = results.response;
        session.endDialog();
    }
]);
