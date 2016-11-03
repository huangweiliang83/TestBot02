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
// Convert SVY21 to Lat/Long
//=========================================================

var SVY21 = (function(){
    // Ref: http://www.linz.govt.nz/geodetic/conversion-coordinates/projection-conversions/transverse-mercator-preliminary-computations/index.aspx
    
    // WGS84 Datum
    this.a = 6378137;
    this.f = 1 / 298.257223563;

    // SVY21 Projection
    // Fundamental point: Base 7 at Pierce Resevoir.
    // Latitude: 1 22 02.9154 N, longitude: 103 49 31.9752 E (of Greenwich).

    // Known Issue: Setting (oLat, oLon) to the exact coordinates specified above
		// results in computation being slightly off. The values below give the most 
    // accurate represenation of test data.
    this.oLat = 1.366666;     // origin's lat in degrees
    this.oLon = 103.833333;   // origin's lon in degrees
    this.oN = 38744.572;      // false Northing
	this.oE = 28001.642;      // false Easting
    this.k = 1;               // scale factor

    this.init = function(){
  
        this.b = this.a * (1 - this.f);
        this.e2 = (2 * this.f) - (this.f * this.f);
        this.e4 = this.e2 * this.e2;
        this.e6 = this.e4 * this.e2;
        this.A0 = 1 - (this.e2 / 4) - (3 * this.e4 / 64) - (5 * this.e6 / 256);
        this.A2 = (3. / 8.) * (this.e2 + (this.e4 / 4) + (15 * this.e6 / 128));
        this.A4 = (15. / 256.) * (this.e4 + (3 * this.e6 / 4));
        this.A6 = 35 * this.e6 / 3072;
		};
		this.init();

    this.computeSVY21 = function(lat, lon){
        //Returns a pair (N, E) representing Northings and Eastings in SVY21.

        var latR = lat * Math.PI / 180;
        var sinLat = Math.sin(latR);
        var sin2Lat = sinLat * sinLat;
        var cosLat = Math.cos(latR);
        var cos2Lat = cosLat * cosLat;
        var cos3Lat = cos2Lat * cosLat;
        var cos4Lat = cos3Lat * cosLat;
        var cos5Lat = cos4Lat * cosLat;
        var cos6Lat = cos5Lat * cosLat;
        var cos7Lat = cos6Lat * cosLat;

        var rho = this.calcRho(sin2Lat);
        var v = this.calcV(sin2Lat);
        var psi = v / rho;
        var t = Math.tan(latR);
        var w = (lon - this.oLon) * Math.PI / 180;

        var M = this.calcM(lat);
        var Mo = this.calcM(this.oLat);

        var w2 = w * w;
        var w4 = w2 * w2;
        var w6 = w4 * w2;
        var w8 = w6 * w2;

        var psi2 = psi * psi;
        var psi3 = psi2 * psi;
        var psi4 = psi3 * psi;

        var t2 = t * t;
        var t4 = t2 * t2;
        var t6 = t4 * t2;

        //	Compute Northing
        var nTerm1 = w2 / 2 * v * sinLat * cosLat;
        var nTerm2 = w4 / 24 * v * sinLat * cos3Lat * (4 * psi2 + psi - t2);
        var nTerm3 = w6 / 720 * v * sinLat * cos5Lat * ((8 * psi4) * (11 - 24 * t2) - (28 * psi3) * (1 - 6 * t2) + psi2 * (1 - 32 * t2) - psi * 2 * t2 + t4);
        var nTerm4 = w8 / 40320 * v * sinLat * cos7Lat * (1385 - 3111 * t2 + 543 * t4 - t6);
        var N = this.oN + this.k * (M - Mo + nTerm1 + nTerm2 + nTerm3 + nTerm4);

        //	Compute Easting
        var eTerm1 = w2 / 6 * cos2Lat * (psi - t2);
        var eTerm2 = w4 / 120 * cos4Lat * ((4 * psi3) * (1 - 6 * t2) + psi2 * (1 + 8 * t2) - psi * 2 * t2 + t4);
        var eTerm3 = w6 / 5040 * cos6Lat * (61 - 479 * t2 + 179 * t4 - t6);
        var E = this.oE + this.k * v * w * cosLat * (1 + eTerm1 + eTerm2 + eTerm3);

        return {N:N, E:E};
		};

		
		
		this.calcM = function(lat, lon){
        var latR = lat * Math.PI / 180;
        return this.a * ((this.A0 * latR) - (this.A2 * Math.sin(2 * latR)) + (this.A4 * Math.sin(4 * latR)) - (this.A6 * Math.sin(6 * latR)));
		};
				
    this.calcRho = function(sin2Lat){
        var num = this.a * (1 - this.e2);
        var denom = Math.pow(1 - this.e2 * sin2Lat, 3. / 2.);
        return num / denom;
		};

    this.calcV = function(sin2Lat){
        var poly = 1 - this.e2 * sin2Lat;
        return this.a / Math.sqrt(poly);
		};
		
		
		
    this.computeLatLon = function(N, E){
        //	Returns a pair (lat, lon) representing Latitude and Longitude.
        

        var Nprime = N - this.oN;
        var Mo = this.calcM(this.oLat);
        var Mprime = Mo + (Nprime / this.k);
        var n = (this.a - this.b) / (this.a + this.b);
        var n2 = n * n;
        var n3 = n2 * n;
        var n4 = n2 * n2;
        var G = this.a * (1 - n) * (1 - n2) * (1 + (9 * n2 / 4) + (225 * n4 / 64)) * (Math.PI / 180);
        var sigma = (Mprime * Math.PI) / (180. * G);
        
        var latPrimeT1 = ((3 * n / 2) - (27 * n3 / 32)) * Math.sin(2 * sigma);
        var latPrimeT2 = ((21 * n2 / 16) - (55 * n4 / 32)) * Math.sin(4 * sigma);
        var latPrimeT3 = (151 * n3 / 96) * Math.sin(6 * sigma);
        var latPrimeT4 = (1097 * n4 / 512) * Math.sin(8 * sigma);
        var latPrime = sigma + latPrimeT1 + latPrimeT2 + latPrimeT3 + latPrimeT4;

        var sinLatPrime = Math.sin(latPrime);
        var sin2LatPrime = sinLatPrime * sinLatPrime;

        var rhoPrime = this.calcRho(sin2LatPrime);
        var vPrime = this.calcV(sin2LatPrime);
        var psiPrime = vPrime / rhoPrime;
        var psiPrime2 = psiPrime * psiPrime;
        var psiPrime3 = psiPrime2 * psiPrime;
        var psiPrime4 = psiPrime3 * psiPrime;
        var tPrime = Math.tan(latPrime);
        var tPrime2 = tPrime * tPrime;
        var tPrime4 = tPrime2 * tPrime2;
        var tPrime6 = tPrime4 * tPrime2;
        var Eprime = E - this.oE;
        var x = Eprime / (this.k * vPrime);
        var x2 = x * x;
        var x3 = x2 * x;
        var x5 = x3 * x2;
        var x7 = x5 * x2;

        // Compute Latitude
        var latFactor = tPrime / (this.k * rhoPrime);
        var latTerm1 = latFactor * ((Eprime * x) / 2);
        var latTerm2 = latFactor * ((Eprime * x3) / 24) * ((-4 * psiPrime2) + (9 * psiPrime) * (1 - tPrime2) + (12 * tPrime2));
        var latTerm3 = latFactor * ((Eprime * x5) / 720) * ((8 * psiPrime4) * (11 - 24 * tPrime2) - (12 * psiPrime3) * (21 - 71 * tPrime2) + (15 * psiPrime2) * (15 - 98 * tPrime2 + 15 * tPrime4) + (180 * psiPrime) * (5 * tPrime2 - 3 * tPrime4) + 360 * tPrime4);
        var latTerm4 = latFactor * ((Eprime * x7) / 40320) * (1385 - 3633 * tPrime2 + 4095 * tPrime4 + 1575 * tPrime6);
        var lat = latPrime - latTerm1 + latTerm2 - latTerm3 + latTerm4;

        // Compute Longitude
        var secLatPrime = 1. / Math.cos(lat);
        var lonTerm1 = x * secLatPrime;
        var lonTerm2 = ((x3 * secLatPrime) / 6) * (psiPrime + 2 * tPrime2);
        var lonTerm3 = ((x5 * secLatPrime) / 120) * ((-4 * psiPrime3) * (1 - 6 * tPrime2) + psiPrime2 * (9 - 68 * tPrime2) + 72 * psiPrime * tPrime2 + 24 * tPrime4);
        var lonTerm4 = ((x7 * secLatPrime) / 5040) * (61 + 662 * tPrime2 + 1320 * tPrime4 + 720 * tPrime6);
        var lon = (this.oLon * Math.PI / 180) + lonTerm1 - lonTerm2 + lonTerm3 - lonTerm4;

        var convertlat = (lat / (Math.PI / 180));
        var convertlon = (lon / (Math.PI / 180));
        return [convertlat, convertlon];
		
    };

});

//=========================================================
// Calculate Distance
//=========================================================

function calculatedistance(lat1, lon1, lat2, lon2, unit) {
        var radlat1 = Math.PI * lat1/180
        var radlat2 = Math.PI * lat2/180
        var radlon1 = Math.PI * lon1/180
        var radlon2 = Math.PI * lon2/180
        var theta = lon1-lon2
        var radtheta = Math.PI * theta/180
        var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        dist = Math.acos(dist)
        dist = dist * 180/Math.PI
        dist = dist * 60 * 1.1515
        if (unit=="K") { dist = dist * 1.609344 }
        if (unit=="N") { dist = dist * 0.8684 }
        return dist
}




//=========================================================
// Parse XML from Server
//=========================================================
var eyes = require('eyes');
var https = require('https');
var parser = new xml2js.Parser({explicitArray : false, ignoreAttrs : true});
var util = require('util');

var getlatfromuser =  1.332401;
var getlongfromuser = 103.848438;

//https.get('https://services2.hdb.gov.sg/webapp/BN22GetAmenitiesByRangeCoord/BN22SGetAmenitiesByRangeCoord?systemId=FI10&programID=MobileHDB&lngtd=103.848438&latd=1.332401&identifier=CPK&bounds=500', function(res) {
https.get('https://services2.hdb.gov.sg/webapp/BN22GetAmenitiesByRangeCoord/BN22SGetAmenitiesByRangeCoord?systemId=FI10&programID=MobileHDB&lngtd="+getlongfromuser+"&latd="+getlatfromuser+"&identifier=CPK&bounds=500', function(res) 
    {
    var response_data = '';
    res.setEncoding('utf8');
    res.on('data', function(chunk)
    {
        response_data += chunk;
    });
    
    res.on('end', function() 
    {
        parser.parseString(response_data, function(err, result) 
        {
            if (err) 
            {
                console.log('Got error: ' + err.message);
            } else 
            {
                eyes.inspect(result);

                //convert into JSON into string
                console.log('Converting to JSON string.');
                console.dir(JSON.stringify(result));

                //convert into JSON object
                console.log('Converting to JSON object.');
                var jsonobject = JSON.parse(JSON.stringify(result));
                console.log(util.inspect(jsonobject, false, null));

                //traverse JSON object
                var cv = new SVY21();
                for (var i = 0; i < jsonobject.GetAmenities.Carparking.length; ++i) 
                {
                    console.log("Latitude(SVY21) : " + jsonobject.GetAmenities.Carparking[i].Latitude);
                    console.log("Longitude(SVY21) : " + jsonobject.GetAmenities.Carparking[i].Longitude);
                    console.log("CoordX : " + jsonobject.GetAmenities.Carparking[i].CoordX);
                    console.log("CoordY : " + jsonobject.GetAmenities.Carparking[i].CoordY);
                    console.log("CarParkingNo : " + jsonobject.GetAmenities.Carparking[i].CarParkingNo);
                    console.log("CpkAvail : " + jsonobject.GetAmenities.Carparking[i].CpkAvail);
                    console.log("Address : " + jsonobject.GetAmenities.Carparking[i].Address);
                    //convert SVY21 to Lat/Long
                    cv.computeLatLon(jsonobject.GetAmenities.Carparking[i].Latitude, jsonobject.GetAmenities.Carparking[i].Longitude);
                    //console.log(cv.computeLatLon(jsonobject.GetAmenities.Carparking[i].Latitude, jsonobject.GetAmenities.Carparking[i].Longitude));
                    var getlatlong = cv.computeLatLon(jsonobject.GetAmenities.Carparking[i].Latitude, jsonobject.GetAmenities.Carparking[i].Longitude);
                    var showlat = getlatlong[0];
                    var showlong = getlatlong[1];
                    console.log("Latitude : " + showlat);
                    console.log("Longitude : " + showlong);
                    //calculate distance between 2 coordinates
                    var showdistance = calculatedistance(showlat, showlong, '1.332401', '103.848438', 'K');
                    //round to 3 decimal places
                    console.log("Distance(in km) : " + Math.round(showdistance*1000)/1000);


                    console.log("----------------------------------------");
                }
    
                console.log('Done.');



                
                
                // Initialization
                //var cv = new SVY21();

                // Computing SVY21 from Lat/Lon
                //var lat = 1.2949192688485278;
                //var lon = 103.77367436885834;
                //var result = cv.computeSVY21(lat, lon);
                //console.log(result);

                // Computing Lat/Lon from SVY21
                //var resultLatLon = cv.computeLatLon(result.N, result.E);
                //console.log(resultLatLon);


 
            }
        });
    });
        res.on('error', function(err) 
        {
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