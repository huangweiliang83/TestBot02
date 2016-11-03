//=========================================================
// HTTP Server Setup for Console
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
// Global Variables
//=========================================================

var builder = require('botbuilder');
var restify = require('restify');
var fs = require('fs');
var xml2js = require('xml2js');

//=========================================================
// Bot Setup
//=========================================================

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
// Parse XML Locally
//=========================================================
/*
var parser = new xml2js.Parser();

fs.readFile(__dirname + '/carpark.xml', function(err, data) {
    parser.parseString(data, function (err, result) {
        //console.dir(result);
        const util = require('util')
        console.log(util.inspect(result, false, null))
        console.log('Done');
    });
});
*/

//=========================================================
// Parse XML from Server
//=========================================================
var eyes = require('eyes');
var https = require('https');
var parser = new xml2js.Parser({explicitArray : false, ignoreAttrs : true});
//var concat = require('concat-stream');
var util = require('util');

https.get('https://services2.hdb.gov.sg/webapp/BN22GetAmenitiesByRangeCoord/BN22SGetAmenitiesByRangeCoord?systemId=FI10&programID=MobileHDB&lngtd=103.848438&latd=1.332401&identifier=CPK&bounds=500', function(res) {
    var response_data = '';
    res.setEncoding('utf8');
    res.on('data', function(chunk) {
        response_data += chunk;
    });

/*
    res.pipe(concat(function(chunk) {
        var str = chunk.toString();
      parser.parseString(str, function(err, result) {
          eyes.inspect(result);
        console.log('Finished parsing:', err, result);
      });
    }));*/
    
    res.on('end', function() {
        parser.parseString(response_data, function(err, result) {
            if (err) {
                console.log('Got error: ' + err.message);
            } else {
                eyes.inspect(result);

                //converting into JSON into string
                console.log('Converting to JSON string.');
                console.dir(JSON.stringify(result));

                //converting into JSON object
                console.log('Converting to JSON object.');
                var jsonobject = JSON.parse(JSON.stringify(result));
                console.log(util.inspect(jsonobject, false, null));

              // console.log(jsonobject.GetAmenities.Carparking.length);

                for (var i = 0; i < jsonobject.GetAmenities.Carparking.length; ++i) {
                    console.log("Latitude : "+jsonobject.GetAmenities.Carparking[i].Latitude);
                    console.log("Longitude : "+jsonobject.GetAmenities.Carparking[i].Longitude);
                    console.log("CoordX : "+jsonobject.GetAmenities.Carparking[i].CoordX);
                    console.log("CoordY : "+jsonobject.GetAmenities.Carparking[i].CoordY);
                    console.log("CarParkingNo : "+jsonobject.GetAmenities.Carparking[i].CarParkingNo);
                    console.log("CpkAvail : "+jsonobject.GetAmenities.Carparking[i].CpkAvail);
                    console.log("Address : "+jsonobject.GetAmenities.Carparking[i].Address);
                    console.log("----------------------------------------");
                }
    


                console.log('Done.');

// Initialization
var cv = new SVY21();

// Computing SVY21 from Lat/Lon
var lat = 1.2949192688485278;
var lon = 103.77367436885834;
var result = cv.computeSVY21(lat, lon);
console.log(result);

// Computing Lat/Lon from SVY21
var resultLatLon = cv.computeLatLon(result.N, result.E);
console.log(resultLatLon);


 
            }
        });
    });
        res.on('error', function(err) {
        console.log('Got error: ' + err.message);
    });
});





//=========================================================
// Bot Dialogs
//=========================================================

bot.dialog('/', intents);

intents.matches(/^hello|hi/i, function (session) {
        session.send("Hi there!");
    })
    .onDefault(function (session) {
        session.send("I didn't understand. Say hello to me!");
    });

/*
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
]);*/