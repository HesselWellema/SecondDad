var restify = require('restify');
var builder = require('botbuilder');
var http = require('http'); 
var wundergroundKey = 'a4efadc225f00b52';


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
        console.log(results.response);
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
//weather
    function (session){
        try {                                                                       //try is erg belangrijk hier
            var city = session.userData.profile.stad.toUpperCase();                                 
            var url = '/api/' + wundergroundKey + '/conditions/lang:NL/q/Netherlands/city.json'
            url = url.replace('city', city);                                    //log "/.../ST/City.json" to the console for debugging 
            console.log(url);

            http.get({
                    host: 'api.wunderground.com',
                    path: url
                    },  function (response) {
                            var body = '';
                            response.on('data', function (d) {
                                body += d; })
                            response.on('end', function () {
                                var data = JSON.parse(body);
                                var conditions = data.current_observation.weather;
                                var temperature = data.current_observation.temp_c;
                                //console.log("Het is nu " + conditions + " in " + session.userData.profile.stad);
                                console.log("Het is nu " + conditions + " in " + session.userData.profile.stad + ". En de temperatuur is " + temperature + "De gevoelstemperatuur is " + feelslike_c);
                                session.send("Het is nu " + conditions + " in " + session.userData.profile.stad + ". En de temperatuur is " + temperature + "De gevoelstemperatuur is " + feelslike_c);
                            }); //eind response.on(end)
                    }) // einde http.get 
            } // einde try 

        catch (e) {
            console.log("Whoops, that didn't match! Try again."); }
    }, //End of WeatherUnderground API function     

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
            
            if (!session.dialogData.profile.stad) {
                builder.Prompts.text(session, "En waar woon je?");
            }
            else {
                next();
            }
    },

    function (session,results,next) {
            if (results.response) {
                session.dialogData.profile.stad = results.response;
            };
            
            if (!session.dialogData.profile.leeftijd) {
                builder.Prompts.number(session, ["En hoe oud ben je?", "Wat is je leeftijd?", "Hoe oud ben je al?"],{maxRetries: 3, retryPrompt: "Dat is geen leeftijd"});
            }
            else {
                next();
            }
    },
                      

function (session, results) {
        if (results.response) {
                session.dialogData.profile.leeftijd = results.response;
            };
        session.endDialogWithResult({ response: session.dialogData.profile });
    }
    ]);

 var weerBepalen = function (stad){
        try {                                                                       //try is erg belangrijk hier
            var city = stad.toUpperCase();                                 
            var url = '/api/' + wundergroundKey + '/conditions/lang:NL/q/Netherlands/city.json'
            url = url.replace('city', city);                                    //log "/.../ST/City.json" to the console for debugging 
            console.log(url);

            http.get({
                    host: 'api.wunderground.com',
                    path: url
                    },  function (response) {
                            var body = '';
                            response.on('data', function (d) {
                                body += d; })
                            response.on('end', function () {
                                var data = JSON.parse(body);
                                var conditions = data.current_observation.weather;
                                console.log("'" + conditions + "' in " + city + " right now");
                            }); //eind response.on(end)
                    }) // einde http.get 
            } // einde try 

        catch (e) {
            console.log("Whoops, that didn't match! Try again."); }
    } //End of WeatherUnderground API function 
