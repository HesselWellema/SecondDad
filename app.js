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
var intents = new builder.IntentDialog();

//=========================================================
// Bots Dialogs
//=========================================================

//root dialog

bot.dialog('/', intents)

.matches('^weather', builder.DialogAction.beginDialog('/weather', session.userData.profile))

.onDefault( [ 
    function (session) {
        session.beginDialog('/ensureProfile', session.userData.profile);
    },
    function (session,results) {
        session.userData.profile = results.response;
        session.send('Hi %(naam)s! %(leeftijd)s jaar is al heel erg oud!', session.userData.profile);
        }
]);       

// weather

bot.dialog ('/weather'),[

    function(session,argus,next) {
        if (!session.dialogData.profile.naam) {
            builder.Prompts.text(session, "En waar woon je?");
        }
        else {
            next();
        };
    },
    function (session,results) {
            if (results.response) {
                session.dialogData.profile.woonplaats = results.response;
            };
    },

    function(session) {
        session.send('Je woont in %(woonplaats)s!', session.dialogData.profile);

    }

    ]   

//Profiel bepalen

bot.dialog('/ensureProfile', [
    function (session, args, next) {
        session.dialogData.profile = args || {};
        if (!session.dialogData.profile.naam) {
            builder.Prompts.text(session, "Hoe heet je?");
        }
        else {
            next();
        };
    },     

    function (session,results,next) {
            if (results.response) {
                session.dialogData.profile.naam = results.response;
            };
            
            if (!session.dialogData.profile.leeftijd) {
                builder.prompts.number(session, ["En hoe oud ben je?", "Wat is je leeftijd?", "Hoe oud ben je al?"],{maxRetries: 3, retryPrompt: "Dat is geen leeftijd"});
            }
            else {
                next();
            }
    },                  

function (session, results) {
        session.dialogData.profile.leeftijd = results.response;
        session.endDialogWithResult({ response: session.dialogData.profile });
    }
    ]);