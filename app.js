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

bot.dialog('/', [ 
    function (session) {
        session.beginDialog('/ensureProfile');
    },
    function (session,next) {
        session.send('Hi %(naam)s! %(leeftijd)s jaar is al heel erg oud!', session.userData.profile);
        next();
        },
    function(session) {
        builder.Prompts.confirm(session, "Zal ik raden wat je bedoelt?");
    },
    function(session,result){
        if (result.response) {session.send('ok %(naam)s!'),session.userData.profile;}
        else {session.send('dan niet %(naam)s!'),session.userData.profile;}
    }
]);        

//Profiel bepalen

bot.dialog('/ensureProfile', [
    function (session, args, next) {
        if (!session.userData.profile.naam) {
            builder.Prompts.text(session, "Hoe heet je?");
        }
        else {
            next();
        };
    },     

    function (session,results,next) {
            if (results.response) {
                session.userData.profile.naam = results.response;
            };
            
            if (!session.userData.profile.leeftijd) {
                builder.Prompts.number(session, ["En hoe oud ben je?", "Wat is je leeftijd?", "Hoe oud ben je al?"],{maxRetries: 3, retryPrompt: "Dat is geen leeftijd"});
            }
            else {
                next();
            }
    },                  

function (session, results) {
        session.userData.profile.leeftijd = results.response;
        session.endDialog;
    }
    ]);