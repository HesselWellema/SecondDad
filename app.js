//Add your requirements 
2 var restify = require('restify'); 
3 var builder = require('botbuilder'); 
4 
 
5 var appId = process.env.MY_APP_ID || "Missing your app ID"; 
6 var appSecret = process.env.MY_APP_SECRET || "Missing your app secret"; 
7 
 
8 // Create bot and add dialogs 
9 var bot = new builder.BotConnectorBot 
10 ({appId: process.env.MY_APP_ID, appSecret: process.env.MY_APP_SECRET}); 
11 bot.add('/', new builder.SimpleDialog( function (session) { 
12 session.send('Hello World'); 
13 })); 
14 
 
15 // Setup Restify Server 
16 var server = restify.createServer(); 
17 server.post('/api/messages', bot.verifyBotFramework(), bot.listen()); 
18 server.listen(process.env.port || 3000, function () { 
19 console.log('%s listening to %s', server.name, server.url); 
20 }); 
21 
 
22 server.get('/', restify.serveStatic({ 
23     directory: __dirname, 
24     default: '/index.html' 
25 })); 
