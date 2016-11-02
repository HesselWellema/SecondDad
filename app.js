var restify = require('restify');
var builder = require('botbuilder');
var wunderground = require('wunderground-node');


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

//weather

var client = new wunderground('a4efadc225f00b52', 'Rotterdam');

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MY_APP_ID,
    appPassword: process.env.MY_APP_SECRET
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//Intents via Luis

var recognizer = new builder.LuisRecognizer('https://api.projectoxford.ai/luis/v1/application?id=0bc7c9f8-d37d-4298-a246-93e2e8a7b2ce&subscription-key=ea27b6d8709c4597b389de3cf26895f9');
// try encoding query (add &A
var intents = new builder.IntentDialog({ recognizers: [recognizer] });
//var dialog = new builder.IntentDialog({ recognizers: [recognizer] });

//=========================================================
// Bots Dialogs
//=========================================================


bot.dialog('/', intents);

intents.matches('Echo', [
    function (session) {
        builder.Prompts.text(session, "What would you like me to say?");
    },
    function (session, results) {
        session.send("Ok... %s", results.response);
        client.forecast('forecast', '', function(err, data){
        if(err) throw err;
          session.send(data);
        });
        session.endDialog(); 
    }
]);

intents.onDefault(
    [ 
    function (session) {
        session.beginDialog('/ensureProfile', session.userData.profile);
    },
    function (session,results,next) {
        session.userData.profile = results.response;
        session.send('Hi %s! %s jaar is al heel erg oud!', session.userData.profile.naam, session.userData.profile.leeftijd);
        next();
        },
    function (session){
        builder.Prompts.confirm(session, "Zal ik proberen te raden wat je bedoelt?");
        },
    function (session,results) {
        if (results.response) {
            session.send('Ok %(naam)s! dan gaan we dat doen!', session.userData.profile)
            session.endDialog();      
            }
        else {
            session.send('Jammer %(naam)s! ik had er wel zin in', session.userData.profile)
            session.endDialog();
            }
        }
        
    ]);        

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
                builder.Prompts.number(session, ["En hoe oud ben je?", "Wat is je leeftijd?", "Hoe oud ben je al?"],{maxRetries: 3, retryPrompt: "Dat is geen leeftijd"});
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