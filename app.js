var restify = require('restify');
var builder = require('botbuilder');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
server.get('/', restify.serveStatic({
 directory: __dirname,
 default: '/index.html'
}));  

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MY_APP_ID,
    appPassword: process.env.MY_APP_SECRET
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

//root dialog

bot.dialog('/', 
    function (session) {
        session.beginDialog('/ensureProfile');
        session.send('Hi %(naam)s! %(leeftijd)s jaar is al heel erg oud!', session.userData.profile);
        });

//Profiel bepalen

bot.dialog('/ensureProfile', [
    function (session, next) {
        if (!session.userData.naam) {
            builder.Prompts.text(session, "Hoe heet je?");
            session.userData.naam = results.response;
        }
        else {
            next();
        };
    },     

    function (session, next) {
            builder.Prompts.number(session, ["En hoe oud ben je?", "Wat is je leeftijd?", "Hoe oud ben je al?"]);
            session.userData.leeftijd = results.response;
            session.endDialog();
        }
    ]);