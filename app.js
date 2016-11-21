//koppeling horoscope
// proactive gedrag onderzoeken


//Some functions

function capitalize(s) {
    return s && s[0].toUpperCase() + s.slice(1);
    }

//global vars

//modules

var restify = require('restify');
var builder = require('botbuilder');
var http = require('http'); 
var Twitter = require('twitter');
var env = require('dotenv').config();

//process envelops
var wundergroundKey = process.env.WUNDERGROUND_KEY;
var luisKey = process.env.LUIS_KEY;


//localisatie

var keuzes = ["Ok. Wat wil je nu doen?","OK. Wat zal ik nu voor je doen?","Prima. Hoe kan ik je verder helpen?"];


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


// Watson Setup
var PersonalityInsightsV3 = require('watson-developer-cloud/personality-insights/v3');

var personality_insights = new PersonalityInsightsV3({
  username: process.env.WATSON_USERNAME,
  password: process.env.WATSON_PASSWORD,
  version_date: '2016-10-19'
});

//create twitter client

var twitterClient = new Twitter({
 consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN_KEY,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
  });

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MY_APP_ID,
    appPassword: process.env.MY_APP_SECRET
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//Intents via Luis

//var recognizer = new builder.LuisRecognizer('https://api.projectoxford.ai/luis/v1/application?id=bab2367b-2314-4ab0-9e29-4ca5f78722c5&subscription-key=ea27b6d8709c4597b389de3cf26895f9');

var url = 'https://api.projectoxford.ai/luis/v1/application?id=bab2367b-2314-4ab0-9e29-4ca5f78722c5&subscription-key=' + luisKey;
var recognizer = new builder.LuisRecognizer(url);


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
            session.send("Die stad ken ik nog niet. Probeer een stad in de buurt.");
            }        
    }); //weer

intents.matches('Help', [
    function (session) {
        session.send ("Ik kan nog niet zoveel. 'Menu' toont een menu met mijn mogelijkheden");
    },
    function (session, results) {
        session.endDialog(keuzes);
    }
]); //help


intents.matches('Tweets', 
    function (session,args) {
            var name = builder.EntityRecognizer.findEntity(args.entities, 'TwitterNaam');
            var twitterNaam = name.entity;
            console.log("gevonden:" + twitterNaam);
            if (twitterNaam) {
                session.beginDialog('/twitter', twitterNaam);
            }
            
            else {
            session.send("Van die naam kan ik geen tweets vinden. Check ajb de spelling (gebruik geen @ voor de naam).");
            }
        
    }); //Tweets

intents.matches('Analyse', 
    function (session,args) {
            var name = builder.EntityRecognizer.findEntity(args.entities, 'TwitterNaam');
            var twitterNaam = name.entity;
            if (twitterNaam) {
                console.log("opstarten analyse voor: " + twitterNaam);
                session.beginDialog('/Analyse', twitterNaam);
            }
            
            else {
            session.send("Van die naam kan ik geen tweets vinden. Check ajb de spelling (gebruik geen @ voor de naam).");
            }
        
    }); //Analyse

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
]);  

intents.matches('Menu', [
    function (session) {
        session.beginDialog('/menu');
    },
    function (session, results) {
        session.endDialog(keuzes);
    }
]); //menu


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


//Menu tonen


bot.dialog('/menu', [
    function (session) {
        builder.Prompts.choice(session, "Maak een keuze:", 'Wat is het weer in ...|Weersvoorspelling in ...|Twitterfeeds tonen van ...|Persoonlijkheidtest|Menu verlaten');
    },

    function (session, results) {

        switch (results.response.index) {

            case 0:
                session.beginDialog('/askCity', true);
                break;
            case 1:
                session.beginDialog('/askCity', false);
                break;
            case 2:
                session.beginDialog('/askTwitterName', false);
                break;
            case 3:
                session.beginDialog('/askTwitterName', true);
                break;    
            default:
                session.endDialog();
                break;
        }
    },
    function (session) {
        // Reload menu
        session.replaceDialog('/menu');
    }
]).reloadAction('showMenu', null, { matches: /^(menu|back)/i });



bot.dialog('/askCity', [

    function (session, huidigWeer) {
        session.dialogData.huidigWeer = huidigWeer;
        console.log("huidig weer? " + session.dialogData.huidigWeer);
        builder.Prompts.text(session, "Voor welke stad wil je dat?");
    },
    function (session,results) {
        if (session.dialogData.huidigWeer) {session.beginDialog('/weerBepalen', results.response);}
        else {session.beginDialog('/weerVoorspellen', results.response);}
    },
]),


bot.dialog('/askTwitterName', [

    function (session, Analyse) {
        session.dialogData.Analyse = Analyse;
        builder.Prompts.text(session, "Voor welke Twitternaam wil je dat?");
    },
    function (session,results) {
        if (session.dialogData.Analyse) {session.beginDialog('/Analyse', results.response);}
        else {session.beginDialog('/twitter', results.response);}
    },
]),


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
                                    session.endDialog(keuzes);  
                                     } //einde try
                                catch(e) {
                                    session.send("ik probeerde het weer in %s te bepalen maar dat ging niet goed. Probeer een andere plaats (in de buurt)",stad);
                                    console.log(body)
                                    session.endDialog(keuzes);  
                                    }    
                            }); //eind response.on(end)
                    }) // einde http.get 
  
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
                                    session.send (capitalize(voorspelling[1].title) + ". " + voorspelling[1].fcttext_metric + "\n\n" + capitalize(voorspelling[2].title) + ". " + voorspelling[2].fcttext_metric);
                                    session.endDialog(keuzes);   

                                    
                                    } // einde try

                                  catch(e) {
                                    session.send("ik probeerde het weer te voorspellen in %s maar dat ging niet goed. Probeer een andere plaats (in de buurt)",stad);
                                    session.endDialog(keuzes);   
                                }  // einde catch  

                            }); //eind response.on(end)
                    }) // einde http.get 
     },
   ]); //einde weer bepalen



//twitter
bot.dialog('/twitter', [
    function (session, twitterName) {
        var params = {screen_name: twitterName, count: 3};
        console.log("voor wie: " + twitterName);

        twitterClient.get('statuses/user_timeline', params, function(error, tweets, response) {
            if (!error) {
                for (var i = 0; i <3; i++) { 
                    try {
                        session.send ("nr " + (i+1) + " van de laatste 3 tweets: "  + tweets[i].text)
                    }
                    catch(e) {
                        break;
                    }
                }
            }

        else {
            console.log(error);
            session.endDialog ("Het is me niet gelukt om de tweets op te halen van " + twitterName)
        } // anders geven we de controle terug aan de root.
       
       session.endDialog(keuzes);  
    })
}]) //einde twitter


bot.dialog('/Analyse', [
    
    //waterval stap 1 van 3
    function (session, naam) {

        session.dialogData.naam = naam;
        builder.Prompts.choice(session, "Wat wil je weten over " + naam +" ?", "Big 5 Karaktertrekken|Belangrijkste behoeften|Waarden|Stoppen");

    }, //einde stap 1 van 3
    
    //waterval stap 2 van 3
    function (session,results,next) {
        if (results.response) {
            console.log ("keuze: " + results.response.entity);
            var aantal = 200;
            var params = {screen_name: session.dialogData.naam, count: aantal};
            var tekst = "";
            console.log("voor wie: " + session.dialogData.naam);

            //twitter feeds ophalen
            twitterClient.get('statuses/user_timeline', params, function(error, tweets, response) { 
             //als geen problemen gaan we tekst bestand vullen
             if (!error) { 
                for (var i = 0; i < aantal-1; i++) { 
                      try {
                          tekst = tekst + tweets[i].text;
                          }
                      catch(e) {
                          break;
                          }
                    }
               } // einde tekstbestand vullen
            
            else {session.endDialog ("Het is me niet gelukt om de tweets op te halen van " + session.dialogData.naam)} // anders geven we de controle terug aan de root.
        
            console.log ("aantal tweets verwerkt: " + i);
            aantal = i;

            //persoonlijkheid bepalen op basis van twitted feedsbestand        
            personality_insights.profile({ 
                text: tekst,
                consumption_preferences: false
                },
                //call back: bepalen eigenschappen op basis van keuze gebruiker: big 5, needs of waarden)
                function (err, response) {
                 if (err) {
                     console.log('error:', err);
                     session.endDialog("Sorry maar dat ging niet goed. Probeer het nog eens");
                    }
                 else {
                       switch( results.response.index) {
                       case 0:
                                //sorteren op percentage
                                response.personality.sort(function (a, b) {
                                    if (a.percentile < b.percentile) {
                                        return 1;
                                        }
                                    if (a.percentile > b.percentile) {
                                        return -1;
                                        }
                                    // a must be equal to b
                                        return 0;
                                });
                                session.send(
                                "Karaktertrekken van " + session.dialogData.naam + "\n\n" +
                                 response.personality[0].name + ": " + Math.round(response.personality[0].percentile*100) + " %" + "  \n" +
                                 response.personality[1].name + ": " + Math.round(response.personality[1].percentile*100) + " %" + "  \n" + 
                                 response.personality[2].name + ": " + Math.round(response.personality[2].percentile*100) + " %" + "  \n" +
                                 response.personality[3].name + ": " + Math.round(response.personality[3].percentile*100) + " %" + "  \n" + 
                                 response.personality[4].name + ": " + Math.round(response.personality[4].percentile*100) + " %" + "  \n" 
                                );
                                builder.Prompts.confirm(session, "Wil je nog meer weten over " + session.dialogData.naam + "?");
                                break;
                       case 1:
                                console.log (response.needs);
                                //sorteren op percentage
                                response.needs.sort(function (a, b) {
                                    if (a.percentile < b.percentile) {
                                        return 1;
                                        }
                                    if (a.percentile > b.percentile) {
                                        return -1;
                                        }
                                    // a must be equal to b
                                        return 0;
                                });
                                console.log (response.needs);
                                session.send(
                                "5 belangrijkste behoeftes van " + session.dialogData.naam + "\n\n" +
                                response.needs[0].name + ": " + Math.round(response.needs[0].percentile*100) + " %" + "  \n" +
                                response.needs[1].name + ": " + Math.round(response.needs[1].percentile*100) + " %" + "  \n" + 
                                response.needs[2].name + ": " + Math.round(response.needs[2].percentile*100) + " %" + "  \n" +
                                response.needs[3].name + ": " + Math.round(response.needs[3].percentile*100) + " %" + "  \n" + 
                                response.needs[4].name + ": " + Math.round(response.needs[4].percentile*100) + " %" + "\n\n"
                                );
                                builder.Prompts.confirm(session, "Wil je nog meer weten over " + session.dialogData.naam + "?");
                                break;
                       case 2:
                            //sorteren op percentage
                                response.values.sort(function (a, b) {
                                    if (a.percentile < b.percentile) {
                                        return 1;
                                        }
                                    if (a.percentile > b.percentile) {
                                        return -1;
                                        }
                                    // a must be equal to b
                                        return 0;
                                });
                            session.send(
                                "Waarden van " + session.dialogData.naam + "\n\n" +
                                response.values[0].name + ": " + Math.round(response.values[0].percentile*100) + " %" + "  \n" +
                                response.values[1].name + ": " + Math.round(response.values[1].percentile*100) + " %" + "  \n" + 
                                response.values[2].name + ": " + Math.round(response.values[2].percentile*100) + " %" + "  \n" +
                                response.values[3].name + ": " + Math.round(response.values[3].percentile*100) + " %" + "  \n" + 
                                response.values[4].name + ": " + Math.round(response.values[4].percentile*100) + " %" + "  \n" 
                                );
                                builder.Prompts.confirm(session, "Wil je nog meer weten over " + session.dialogData.naam + "?");
                        default:
                            session.endDialog(keuzes);
                       } //einde switch
                       
                      
                      
                    } //einde else
                });   //einde callback
           }) // einde twitter feeds ophalen
        } //einde als de gebruiker heeft gekozen.
        //als de gebruiker geen keuze maakt in begin.
        else {
            session.endDialog(keuzes);
            }
            
    }, //einde stap 2 van 3
    // stap 3 van 3
    function (session,results) {
        if (results.response) {
            session.replaceDialog('/Analyse', session.dialogData.naam);
            }
        else {
            session.endDialog(keuzes);
            } 


    } // einde stap 3 van 3

]) //einde analyse waterval.
