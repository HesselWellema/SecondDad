// Add your requirements

var restify = require('restify'); 
var builder = require('botbuilder'); 

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.PORT || 3000, function() 
{
   console.log('%s listening to %s', server.name, server.url); 
});

//where to start?
server.get('/', restify.serveStatic({
 directory: __dirname,
 default: '/index.html'
}));

// Create chat bot
var connector = new builder.ChatConnector
({ appId: process.env.MY_APP_ID, appPassword: process.env.MY_APP_SECRET}); 
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());



// Create bot dialogs based on intenst


var intents = new builder.IntentDialog();
bot.dialog('/', intents);

intents.matches(/^change name/i, [
    function (session) {
        session.beginDialog('/profile');
    },
    function (session, results) {
        session.send('Ok... Changed your name to %s', session.userData.name);
    }
]);

intents.onDefault([
    function (session, args, next) {
        if (!session.userData.name) {
            session.beginDialog('/profile');
        } else {
            next();
        }
    },
    function (session, results) {
        session.send('Hello %s!', session.userData.name);
    }
]);

bot.dialog('/ensureProfile', [
    function (session, args, next) {
        session.dialogData.profile = args || {};
        if (!session.dialogData.profile.name) {
            builder.Prompts.text(session, "What's your name?");
        } else {
            next();
        }
    },
    function (session, results, next) {
        if (results.response) {
            session.dialogData.profile.name = results.response;
        }
        if (!session.dialogData.profile.city) {
            builder.Prompts.text(session, "Where do you live??");
        } else {
            next();
        }
    },
    function (session, results) {
        if (results.response) {
            session.dialogData.profile.city = results.response;
        }
        session.endDialogWithResult({ response: session.dialogData.profile });
    }
]);

