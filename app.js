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

// Create LUIS recognizer 
var model = 'https://api.projectoxford.ai/luis/v1/application?id=0bc7c9f8-d37d-4298-a246-93e2e8a7b2ce&subscription-key=ea27b6d8709c4597b389de3cf26895f9';
var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/', dialog);

// Add intent handlers
dialog.matches('change name', builder.DialogAction.send('name changed'));
dialog.matches('opzouten', builder.DialogAction.send('Zout zelf op!!'));
dialog.onDefault(builder.DialogAction.send("I'm sorry I didn't understand. I can only understant so much'));