//functie maken van weer bepalen
//aanroepen via intents
//horoscoop?



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

var recognizer = new builder.LuisRecognizer('https://api.projectoxford.ai/luis/v1/application?id=bab2367b-2314-4ab0-9e29-4ca5f78722c5&subscription-key=ea27b6d8709c4597b389de3cf26895f9');

// try encoding query (add &A
var intents = new builder.IntentDialog({ recognizers: [recognizer] });
//var dialog = new builder.IntentDialog({ recognizers: [recognizer] });

//=========================================================
// Bots Dialogs
//=========================================================


bot.dialog('/', intents);

intents.matches('Echo', [
    function (session) {
        builder.Prompts.text(session, "Wat wil je dat ik zeg?");
    },
    function (session, results) {
        session.send("Ok... %s", results.response);
        session.endDialog(["Wat wil je nu doen?","Wat zal ik nu voor je doen?","Hoe kan ik je verder helpen?"]);
    }
]); //Echo

intents.matches('Weer', 
    function (session,args) {
        try {
            var city = builder.EntityRecognizer.findEntity(args.entities, 'Stad');
            session.beginDialog('/weerBepalen', city.entity);
            }
        catch (e) {
            builder.Prompts.text(session, "Die stad ken ik nog niet. Probeer een stad in de buurt.");
            }        
    }); //weer

intents.matches('Help', [
    function (session) {
        session.send ("Ik kan niet zoveel. Vraag me het weer via 'Weer' of het weer in een bepaalde stad. Met Echo praat ik je na")
    },
    function (session, results) {
        session.endDialog(["Wat wil je nu doen?","Wat zal ik nu voor je doen?","Hoe kan ik je verder helpen?"]);
    }
]); //Echo

intents.onDefault(
    [ 
    function (session) {
        if (!session.userData.profile) {session.beginDialog('/ensureProfile', session.userData.profile);}
    },

    function (session,results) {
        session.userData.profile = results.response;
        console.log(session.userData.profile);
        session.beginDialog('/weerBepalen', session.userData.profile.stad);
        } 

    ])

//Profiel bepalen

bot.dialog('/ensureProfile', [
    function (session, args, next) {
        session.dialogData.profile = args || {};
        if (!session.dialogData.profile.naam) {
            session.send("%s.", session.message.text);
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
                      

function (session,results,next) {
        if (results.response) {
                session.dialogData.profile.leeftijd = results.response;
            };
        next();    
    },

function (session,next){ 
        session.send('Hi %s! Je bent dus %s jaar en woont in %s', session.dialogData.profile.naam, session.dialogData.profile.leeftijd, session.dialogData.profile.stad);   
        session.send("Type Help als je wilt weten wat ik allemaal kan");
        //session.send(["Wat wil je nu doen?","Wat zal ik nu voor je doen?","Hoe kan ik je verder helpen?"]);  
        session.endDialogWithResult({ response: session.dialogData.profile });
        }, 
    ]),

bot.dialog('/weerBepalen', [
    function (session, stad, next) {
                                                                               //try is erg belangrijk hier
            var city = stad.toUpperCase();                                 
            var url = '/api/' + wundergroundKey + '/conditions/lang:NL/q/Netherlands/city.json'
            url = url.replace('city', city);                                    //log "/.../ST/City.json" to the console for debugging 
            console.log(url);
            http.get({
                    host: 'api.wunderground.com',
                    path: url
                    },  function (response,next) {
                            var body = '';
                            response.on('uncaughtException', function (err) {
                                console.log(err);
                            }); 
                            response.on('data', function (d) {
                                body += d; })
                                response.on('end', function () {
                                var data = JSON.parse(body);
                            
                                try {var conditions = data.current_observation.weather.toLowerCase();}
                                catch(e) {
                                    session.send("ik probeerde het weer in %s te bepalen maar dat ging niet goed. Probeer een andere plaats (in de buurt)",stad);
                                    console.log(body)
                                }
                                var gevoelstemperatuur = data.current_observation.feelslike_c;
                                session.send("Het is " + conditions + " in " + stad + " op dit moment en een gevoelstemperatuur van " + gevoelstemperatuur + " graden Celsius");
                                session.send(["Wat wil je nu doen?","Wat zal ik nu voor je doen?","Hoe kan ik je verder helpen?"]);                                
                            }); //eind response.on(end)
                    }) // einde http.get 
             // einde try 

        session.endDialog();    
    },
    ]);
//einde weer bepalen