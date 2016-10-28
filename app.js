//=========================================================
// HTTP Server Setup
//=========================================================
/*
// Load the http module to create an http server.
var http = require('http');

// Configure our HTTP server to respond with Hello World to all requests.
var server = http.createServer(function (request, response) {
  response.writeHead(200, {"Content-Type": "text/plain"});
});

// Listen on port 8000, IP defaults to 127.0.0.1
server.listen(8000);

// Put a friendly message on the terminal
console.log("Server running at http://127.0.0.1:8000/");
*/

//=========================================================
// Bot Setup
//=========================================================

var builder = require('botbuilder');
var restify = require('restify');
//var buildercore = require('botbuilder/core/');
//Test

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
    //appId: '5f6ea84a-490e-441b-b482-74e89a3f6764',
    //appPassword: 'AYHdryugwA3RrAkoCj5a9Mt'
});

var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

// Chat with bot using console connector class
//var connector = new builder.ConsoleConnector().listen();
var intents = new builder.IntentDialog();


//=========================================================
// Bot Dialogs
//=========================================================

bot.dialog('/', intents);

intents.matches(/^hello/i, function (session) {
        session.send("Hi there!");
    })
    .onDefault(function (session) {
        session.send("I didn't understand. Say hello to me!");
    });


intents.onDefault([
    function (session, args, next) {
        if (!session.userData.name) {
            session.beginDialog('/profile');
        } else {
            next();
        }
    },
    function (session, results) {
        session.send('Hello %s!', session.userData.name);
    }
]);

bot.dialog('/profile', [
    function (session) {
        builder.Prompts.text(session, 'Hi! What is your name?');
    },
    function (session, results) {
        session.userData.name = results.response;
        session.endDialog();
    }
]);