//try catch aanpassen huidige weer
//horoscoop?
// koppeling met Watson

//Some functions

function capitalize(s) {
    return s && s[0].toUpperCase() + s.slice(1);
    }

//bot building

var restify = require('restify');
var builder = require('botbuilder');
var http = require('http'); 
var wundergroundKey = 'a4efadc225f00b52';

//localisatie

var keuzes = ["Wat wil je nu doen?","Wat zal ik nu voor je doen?","Hoe kan ik je verder helpen?"];


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
        session.endDialog(keuzes);
    }
]); //Echo

intents.matches('Weer', 
    function (session,args) {
        try {
            var city = builder.EntityRecognizer.findEntity(args.entities, 'Stad');
            var stad = capitalize(city.entity);
            console.log(stad);
            session.beginDialog('/weerBepalen', stad);
            }
        catch (e) {
            builder.Prompts.text(session, "Die stad ken ik nog niet. Probeer een stad in de buurt.");
            }        
    }); //weer


intents.matches('weerVoorspellen', 
    function (session,args) {
        try {
            var city = builder.EntityRecognizer.findEntity(args.entities, 'Stad');
            var stad = capitalize(city.entity);
            console.log(stad);
            session.beginDialog('/weerVoorspellen', stad);
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
        session.endDialog(keuzes);
    }
]); //Echo


intents.matches('Cancel', [
    function (session, next) {
        builder.Prompts.confirm(session, "Weet je zeker dat je je hele chathistorie wilt verwijderen?");   
    },

    function(session, results) {
        if (results.response) {
             session.userData = {}
             session.conversationData = {};
             session.userData.firstRun = true;
             session.send("Uw hele historie is verwijderd");
             session.endDialog(keuzes);

        }
    }
])  

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
                                try {
                                    var conditions = data.current_observation;
                                    var msg = new builder.Message(session)
                                    .textFormat(builder.TextFormat.xml)
                                    .attachments([
                                    new builder.HeroCard(session)
                                    .title(stad)
                                    .text(capitalize(conditions.weather) + " in " + stad + " op dit moment en een gevoelstemperatuur van " + conditions.feelslike_c + " graden Celsius. De luchtvochtigheid is " + conditions.relative_humidity + " en de wind komt uit " + conditions.wind_dir + " met " + conditions.wind_kph + " km/u")
                                    .images([builder.CardImage.create(session, conditions.icon_url)])
                                    .tap(builder.CardAction.openUrl(session, conditions.forecast_url))
                                     ]);
                                    session.send(msg);
                                    session.send(keuzes);
                                     } //einde try
                                catch(e) {
                                    session.send("ik probeerde het weer in %s te bepalen maar dat ging niet goed. Probeer een andere plaats (in de buurt)",stad);
                                    session.send(keuzes);
                                    console.log(body)
                                    }    
                            }); //eind response.on(end)
                    }) // einde http.get 
             // einde try 

        session.endDialog();    
     },
   ]); //einde weer bepalen

   
   bot.dialog('/weerVoorspellen', [
    function (session, stad, next) {
                                                                               //try is erg belangrijk hier
            var city = stad.toUpperCase();                                 
            var url = '/api/' + wundergroundKey + '/forecast/lang:NL/q/Netherlands/city.json'
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
                                try {                                                        
                                    var voorspelling = data.forecast.txt_forecast.forecastday;
                                    session.send (capitalize(voorspelling[1].title) + ". " + voorspelling[1].fcttext_metric);
                                    session.send (capitalize(voorspelling[2].title) + ". " + voorspelling[2].fcttext_metric);
                                    session.send(keuzes);
                                    } // einde try

                                  catch(e) {
                                    session.send("ik probeerde het weer te voorspellen in %s maar dat ging niet goed. Probeer een andere plaats (in de buurt)",stad);
                                    session.send(keuzes);
                                    
                                }  // einde catch  

                            }); //eind response.on(end)
                    }) // einde http.get 
        

        session.endDialog();    
     },
   ]); //einde weer bepalen