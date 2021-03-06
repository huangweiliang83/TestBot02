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
// Bot Setup
//=========================================================

var builder = require('botbuilder');
var restify = require('restify');

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
bot.endConversationAction('goodbye', 'Goodbye:)', { matches: /^.*bye/i });

// Chat with bot using console connector class
//var connector = new builder.ConsoleConnector().listen();
var intents = new builder.IntentDialog();


//=========================================================
// Parse XML Locally
//=========================================================
/*
var parser = new xml2js.Parser();
var fs = require('fs');

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

var SVY21 = (function()
{
    // WGS84 Datum
    this.a = 6378137;
    this.f = 1 / 298.257223563;

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

        //Compute Northing
        var nTerm1 = w2 / 2 * v * sinLat * cosLat;
        var nTerm2 = w4 / 24 * v * sinLat * cos3Lat * (4 * psi2 + psi - t2);
        var nTerm3 = w6 / 720 * v * sinLat * cos5Lat * ((8 * psi4) * (11 - 24 * t2) - (28 * psi3) * (1 - 6 * t2) + psi2 * (1 - 32 * t2) - psi * 2 * t2 + t4);
        var nTerm4 = w8 / 40320 * v * sinLat * cos7Lat * (1385 - 3111 * t2 + 543 * t4 - t6);
        var N = this.oN + this.k * (M - Mo + nTerm1 + nTerm2 + nTerm3 + nTerm4);

        //Compute Easting
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
        //Returns lat, lot
        

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

        //Compute Latitude
        var latFactor = tPrime / (this.k * rhoPrime);
        var latTerm1 = latFactor * ((Eprime * x) / 2);
        var latTerm2 = latFactor * ((Eprime * x3) / 24) * ((-4 * psiPrime2) + (9 * psiPrime) * (1 - tPrime2) + (12 * tPrime2));
        var latTerm3 = latFactor * ((Eprime * x5) / 720) * ((8 * psiPrime4) * (11 - 24 * tPrime2) - (12 * psiPrime3) * (21 - 71 * tPrime2) + (15 * psiPrime2) * (15 - 98 * tPrime2 + 15 * tPrime4) + (180 * psiPrime) * (5 * tPrime2 - 3 * tPrime4) + 360 * tPrime4);
        var latTerm4 = latFactor * ((Eprime * x7) / 40320) * (1385 - 3633 * tPrime2 + 4095 * tPrime4 + 1575 * tPrime6);
        var lat = latPrime - latTerm1 + latTerm2 - latTerm3 + latTerm4;

        //Compute Longitude
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
// Calculate Distance between 2 Coordinates
//=========================================================

function calculatedistance(lat1, lon1, lat2, lon2, unit)
{
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
// Global
//=========================================================

var eyes = require('eyes');
var https = require('https');
var http = require('http');
var xml2js = require('xml2js');
var parser = new xml2js.Parser({explicitArray : false, ignoreAttrs : true});
var util = require('util');
var request = require('request');

//var nearbycarparksresult = [];

//=========================================================
// Get Nearest Carpark
//=========================================================

function getnearestcarpark(latinput, longinput)
{
    //var getlatfromuser =  1.332401;
    //var getlongfromuser = 103.848438;

    var getlatfromuser =  latinput;
    var getlongfromuser = longinput;
 
    https.get('https://services2.hdb.gov.sg/webapp/BN22GetAmenitiesByRangeCoord/BN22SGetAmenitiesByRangeCoord?systemId=FI10&programID=MobileHDB&lngtd='+getlongfromuser+'&latd='+getlatfromuser+'&identifier=CPK&bounds=500', function(res)
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
                }
                else 
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
                    var nearestdistance = 0;
                    var showdistanceformat;
                    var showdistance;
                    var getlatlong;
                    var showlat;
                    var showlong;
                    var nearestcarpark;
                    var nearestcarparklotavailable;
                    var nearestcarparkno;

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
                        getlatlong = cv.computeLatLon(jsonobject.GetAmenities.Carparking[i].Latitude, jsonobject.GetAmenities.Carparking[i].Longitude);
                        showlat = getlatlong[0];
                        showlong = getlatlong[1];
                        console.log("Latitude : " + showlat);
                        console.log("Longitude : " + showlong);
                        //calculate distance between 2 coordinates
                        showdistance = calculatedistance(showlat, showlong, getlatfromuser, getlongfromuser, 'K');
                        //round to 3 decimal places
                        showdistanceformat = Math.round(showdistance*1000)/1000;
                        console.log("Distance(in km) : " + showdistanceformat);
                        
                        //find nearest car park by finding shortest distance
                        var tempdistance = showdistanceformat;
                        if (i == 0)
                        {
                            nearestdistance = tempdistance;
                            nearestcarpark = jsonobject.GetAmenities.Carparking[i].Address;
                            nearestcarparklotavailable = jsonobject.GetAmenities.Carparking[i].CpkAvail;
                            nearestcarparkno = jsonobject.GetAmenities.Carparking[i].CarParkingNo;
                        }
                        if (nearestdistance > tempdistance)
                        {
                            nearestdistance = tempdistance;
                            nearestcarpark = jsonobject.GetAmenities.Carparking[i].Address;
                            nearestcarparklotavailable = jsonobject.GetAmenities.Carparking[i].CpkAvail;
                            nearestcarparkno = jsonobject.GetAmenities.Carparking[i].CarParkingNo;
                        }
                        
                        console.log("----------------------------------------");


                        // nearbycarparks.push({
						// 		"Latitude": showlat,
						// 		"Longitude" : showlong,
						// 		"CarParkingNo": jsonobject.GetAmenities.Carparking[i].CarParkingNo,
						// 		"Address": jsonobject.GetAmenities.Carparking[i].Address,
						// 		"CpkAvail": jsonobject.GetAmenities.Carparking[i].CpkAvail,
						// 		"distance" : showdistanceformat,
						// 		location: showlat + ',' + showlong
						// 	});
                    }
                    
                    console.log("Nearest Distance : " + nearestdistance);
                    console.log("Nearest Car Park : " + nearestcarpark);
                    console.log("Nearest Car Park No : " + nearestcarparkno);
                    console.log("Nearest Car Park Lot Availability : " + nearestcarparklotavailable);
                    console.log('Done.');
                }
            });
        });

        res.on('error', function(err) 
        {
            console.log('Got error: ' + err.message);
        });
    });
}

//=========================================================
// Get Nearest Carpark Information
//=========================================================

function getcarparkinformation(carparknoinput)
{
    //var getcarparkno = 'TPMD';
    var getcarparkno = carparknoinput;

    https.get('https://services2.hdb.gov.sg/webapp/BC16AWCpkInfoXML/BC16SCpkXml?cpkNo='+getcarparkno+'&sysId=BC16&cpkStatus=A', function(res)
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
                }
                else 
                {
                    eyes.inspect(result);

                    //convert into JSON into string
                    console.log('Converting to JSON string.');
                    console.dir(JSON.stringify(result));

                    //convert into JSON object
                    console.log('Converting to JSON object.');
                    var jsonobject1 = JSON.parse(JSON.stringify(result));
                    console.log(util.inspect(jsonobject1, false, null));

                    //read from JSON object
                    console.log("Carpark Type : ", jsonobject1.CarParkInfo.CarParkType);
                    console.log("Short Term Parking Scheme : ", jsonobject1.CarParkInfo.ShortTermParkingScheme);
                    console.log("Free Parking Scheme : ", jsonobject1.CarParkInfo.FreeParkingScheme);
                    console.log("Parking System : ", jsonobject1.CarParkInfo.ParkingSystem);
                    console.log("Park and Ride Scheme : ", jsonobject1.CarParkInfo.ParkAndRideScheme);
                }
            });
        });

        res.on('error', function(err) 
        {
            console.log('Got error: ' + err.message);
        });
    });
}

//=========================================================
// Get Nearest 2-Hour Weather
//=========================================================
function getnearestweather(latinput, longinput)
{
    // var forecastobj = {
    //     BR: "Mist",
    //     CL: "Cloudy",
    //     CR: "Drizzle",
    //     FA: "Fair(Day)",
    //     FG: "Fog",
    //     FN: "Fair(Night)",
    //     FW: "Fair & Warm",
    //     HG: "Heavy Thundery Showers with Gusty Winds",
    //     HR: "Heavy Rain",
    //     HS: "Heavy Showers",
    //     HT: "Heavy Thundery Showers",
    //     HZ: "Hazy",
    //     LH: "Slightly Hazy",
    //     LR: "Light Rain",
    //     LS: "Light Showers",
    //     OC: "Overcast",
    //     PC: "Partly Cloudy (Day)",
    //     PN: "Partly Cloudy (Night)",
    //     PS: "Passing Showers",
    //     RA: "Moderate Rain",
    //     SH: "Showers",
    //     SK: "Strong Winds,Showers",
    //     SN: "Snow",
    //     SR: "Strong Winds, Rain",
    //     SS: "Snow Showers",
    //     SU: "Sunny",
    //     SW: "Strong Winds",
    //     TL: "Thundery Showers",
    //     WC: "Windy,Cloudy",
    //     WD: "Windy",
    //     WF: "Windy,Fair",
    //     WR: "Windy,Rain",
    //     WS: "Windy, Showers"
    // };

    var forecastobj = {
        BR: "Not Raining",
        CL: "Not Raining",
        CR: "Raining",
        FA: "Not Raining",
        FG: "Not Raining",
        FN: "Not Raining",
        FW: "Not Raining",
        HG: "Raining",
        HR: "Raining",
        HS: "Raining",
        HT: "Raining",
        HZ: "Not Raining",
        LH: "Not Raining",
        LR: "Raining",
        LS: "Raining",
        OC: "Not Raining",
        PC: "Not Raining",
        PN: "Not Raining",
        PS: "Raining",
        RA: "Raining",
        SH: "Raining",
        SK: "Raining",
        SN: "Not Raining",
        SR: "Raining",
        SS: "Not Raining",
        SU: "Not Raining",
        SW: "Not Raining",
        TL: "Raining",
        WC: "Not Raining",
        WD: "Not Raining",
        WF: "Not Raining",
        WR: "Raining",
        WS: "Raining"
    };

    var getlatfromuser =  latinput;
    var getlongfromuser = longinput;
    //var getlatfromuser =  1.332401;
    //var getlongfromuser = 103.848438;

    var parser1 = new xml2js.Parser({explicitArray : true, attrkey : 'Child'});

    http.get('http://api.nea.gov.sg/api/WebAPI/?dataset=2hr_nowcast&keyref=781CF461BB6606ADC767F3B357E848ED3A27067168AB8007', function(res)
    {
        var response_data = '';
        res.setEncoding('utf8');
        res.on('data', function(chunk)
        {
            response_data += chunk;
        });
    
        res.on('end', function() 
        {
            parser1.parseString(response_data, function(err, result) 
            {
                if (err) 
                {
                    console.log('Got error: ' + err.message);
                }
                else 
                {
                    eyes.inspect(result);
                    
                    //convert into JSON object
                    console.log('Converting to JSON object.');
                    var jsonobject2 = JSON.parse(JSON.stringify(result));
                    console.log(util.inspect(jsonobject2, false, null));

                    //read and traverse JSON object
                    var nearestdistance1 = 0;
                    var showdistanceformat1;
                    var showdistance1;
                    
                    var showlat1;
                    var showlong1;
                    var nearestForeCast;
                    var nearestForeCastName;

                    console.log("name 1: " + jsonobject2.channel.title);
                    console.log("name 2: " + jsonobject2.channel.source);
                    console.log("date3 : " +jsonobject2.channel.item[0].forecastIssue[0].Child.date);
                    console.log("length  "+jsonobject2.channel.item[0].weatherForecast[0].area.length)

                    for (var i = 0; i < jsonobject2.channel.item[0].weatherForecast[0].area.length; ++i)
                    {
                        showlat1 = jsonobject2.channel.item[0].weatherForecast[0].area[i].Child.lat;
                        showlong1 = jsonobject2.channel.item[0].weatherForecast[0].area[i].Child.lon;
                        showdistance1 = calculatedistance(showlat1, showlong1, getlatfromuser, getlongfromuser, 'K');
                        //round to 3 decimal places
                        showdistanceformat1 = Math.round(showdistance1*1000)/1000;
                        console.log("Distance(in km) : " + showdistanceformat1);

                        var tempdistance1 = showdistanceformat1;
                        if (i == 0)
                        {
                            nearestdistance1 = tempdistance1;
                            nearestForeCast = jsonobject2.channel.item[0].weatherForecast[0].area[i].Child.forecast;
                            nearestForeCastName = jsonobject2.channel.item[0].weatherForecast[0].area[i].Child.name;
                        }
                        if (nearestdistance1 > tempdistance1)
                        {
                            nearestdistance1 = tempdistance1;
                            nearestForeCast = jsonobject2.channel.item[0].weatherForecast[0].area[i].Child.forecast;
                            nearestForeCastName = jsonobject2.channel.item[0].weatherForecast[0].area[i].Child.name;
                        }
                    }
                    console.log("Distance to Nearest Town : " + nearestdistance1);
                    console.log("Forecast in Nearest Town : " + nearestForeCast);
                    console.log("Nearest Town : " + nearestForeCastName);

                    var forecast = forecastobj[nearestForeCast];
                    console.log("Forecast in Current Location : " + forecast);
                }
            });
        });

        res.on('error', function(err) 
        {
            console.log('Got error: ' + err.message);
        });
    });
}




//=========================================================
// Get Nearest URA Carpark
//=========================================================

function getnearestURACarpark(latinput, longinput)
{
    var getlatfromuser =  latinput;
    var getlongfromuser = longinput;

    var token = "6hf2NfWWja4j12bn3H4z8g62287rha485Fu7ff1F8gVC0R-AbBC-38YT3c856fV3HCZmet2j54+gbCP40u3@Q184ccRQGzcbXefE";
    var options = {
    url: 'https://www.ura.gov.sg/uraDataService/invokeUraDS?service=Car_Park_Availability',
    headers: {
        'AccessKey' : '0d5cce33-3002-451b-8f53-31e8c4c54477',
        'Token' : token
    }
    };

    function callback(error, response, body) 
    {
        var cv1 = new SVY21();
        //var getlatfromuser =  1.332401;
        //var getlongfromuser = 103.848438;
        var nearestdistance2 = 0;
        var nearestURAcarparklot;
        var nearestURAcarparkcoordinates;
        var nearestURAcarparklotavailability;
        
        // var currentdate = new Date();
        // var httpdate = new Date(response.headers['date']);
        // var httpgetday = httpdate.getDate();
        // console.log("HTTP Respond Date : " +httpdate);
        // console.log("HTTP Get Date : " +httpgetday);
        // console.log("Current Date : " +currentdate); 

        if (!error && response.statusCode == 200)
        {
            //Parse data
            var jsonobject3 = JSON.parse(body);
            console.log("parse data from URA");
            console.log(util.inspect(body, false, null));
            
            for (var i = 0; i < jsonobject3.Result.length; ++i)
            {
                    //Find car park lot availability for cars
                    if (jsonobject3.Result[i].lotType == "C")
                    {
                        console.log("URA Carpark No : " + jsonobject3.Result[i].carparkNo);
                        console.log("URA Carpark Lot Type : " + jsonobject3.Result[i].lotType);
                        console.log("URA Carpark Lot Availability : " + jsonobject3.Result[i].lotsAvailable);
                        console.log("URA Carpark Coordinates : " + jsonobject3.Result[i].geometries[0].coordinates);
                        var uracoordinates = jsonobject3.Result[i].geometries[0].coordinates;
                        var uracoordinatesresult = uracoordinates.split(",");
                        console.log("URA Carpark Coordinates Latitude (SVY21) : " + uracoordinatesresult[0]);
                        console.log("URA Carpark Coordinates Longitude (SVY21) : " + uracoordinatesresult[1]);
                        //Convert SVY21 to Lat/Long
                        var getlatlong2 = cv1.computeLatLon(uracoordinatesresult[0], uracoordinatesresult[1]);
                        var showlat2 = getlatlong2[0];
                        var showlong2 = getlatlong2[1];
                        console.log("URA Carpark Latitude : " + showlat2);
                        console.log("URA Carpark Longitude : " + showlong2);
                        //Calculate distance between URA Carpark and user current location
                        var showdistance2 = calculatedistance(showlat2, showlong2, getlatfromuser, getlongfromuser, 'K');
                        //round to 3 decimal places
                        var showdistanceformat2 = Math.round(showdistance2*1000)/1000;
                        console.log("Distance(in km) : " + showdistanceformat2);

                        //Find nearest URA Carpark
                        var tempdistance2 = showdistanceformat2;
                        if (i == 0)
                        {
                            nearestdistance2 = tempdistance2;
                            nearestURAcarparklot= jsonobject3.Result[i].carparkNo;
                            nearestURAcarparklotavailability= jsonobject3.Result[i].lotsAvailable;
                            nearestURAcarparkcoordinates = jsonobject3.Result[i].geometries[0].coordinates;
                        }
                        if (nearestdistance2 > tempdistance2)
                        {
                            nearestdistance2 = tempdistance2;
                            nearestURAcarparklot= jsonobject3.Result[i].carparkNo;
                            nearestURAcarparklotavailability= jsonobject3.Result[i].lotsAvailable;
                            nearestURAcarparkcoordinates = jsonobject3.Result[i].geometries[0].coordinates;
                        }

                    }
            }

            console.log("Nearest URA Carpark (Distance) : " + nearestdistance2);
            console.log("Nearest URA Carpark (Lot No) : " + nearestURAcarparklot);
            console.log("Nearest URA Carpark (Lot Availability) : " + nearestURAcarparklotavailability);
        }
    }

    request(options, callback);

}

//=========================================================
// Get Nearest URA Carpark Information
//=========================================================

function getnearestURACarparkInformation(carparknoinput)
{
    //var geturacarparkfromuser =  "K0087";
    //var getlatfromuser =  1.332401;
    //var getlongfromuser = 103.848438;

    //To get new token everyday
    var token = "6hf2NfWWja4j12bn3H4z8g62287rha485Fu7ff1F8gVC0R-AbBC-38YT3c856fV3HCZmet2j54+gbCP40u3@Q184ccRQGzcbXefE";
    var options = {
    url: 'https://www.ura.gov.sg/uraDataService/invokeUraDS?service=Car_Park_Details',
    headers: {
        'AccessKey' : '0d5cce33-3002-451b-8f53-31e8c4c54477',
        'Token' : token
    }
    };

    function callback(error, response, body) 
    {
        var cv2 = new SVY21();
        var geturacarparkfromuser =  carparknoinput;
        
        if (!error && response.statusCode == 200)
        {
            //Parse data
            var jsonobject4 = JSON.parse(body);
            console.log("parse data from URA carpark");
            //console.log(util.inspect(body, false, null));

             for (var i = 0; i < jsonobject4.Result.length; ++i)
            {
                    //Find car park details for cars
                    if (jsonobject4.Result[i].vehCat == "Car" && jsonobject4.Result[i].weekdayMin == "30 mins")
                    {
                        //Match car park no from nearby URA carpark and get car park address
                        if (jsonobject4.Result[i].ppCode == geturacarparkfromuser)
                        {
                            console.log("URA Carpark Address : " + jsonobject4.Result[i].ppName);
                            var showuracarparkaddress = jsonobject4.Result[i].ppName;   
                        }
                    }
            }
        }
    }
    request(options, callback);
}


//=========================================================
// Get Season Parking Information Based on Postal Code
//=========================================================

function getseasonparkinginformation(postalcodeinput)
{
    //var getpostalcodefromuser = 310100;
    var getpostalcodefromuser = postalcodeinput;
    var getseasonparkingoptionfromuser = 0;
    var seasonparkingtype;
    var seasonparkingbranchoffice;
    var seasonparkinggroup;
    var seasonparkingcarparkwithingroup;
    var seasonparkingrate;
    var seasonparkingresultobj = {};

     https.get('https://services2.hdb.gov.sg/webapp/BN22SvcMap/BN22SCpkgrp?pcode='+getpostalcodefromuser+'&ptype='+getseasonparkingoptionfromuser+'', function(res)
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
                }
                else 
                {
                    eyes.inspect(result);

                    //convert into JSON into string
                    console.log('Converting to JSON string.');
                    console.dir(JSON.stringify(result));

                    //convert into JSON object
                    console.log('Converting to JSON object.');
                    var jsonobject5 = JSON.parse(JSON.stringify(result));
                    console.log(util.inspect(jsonobject5, false, null));

                    //traverse JSON object
                    for (var i = 0; i < jsonobject5.cpkgrpinfo.cpktype.length; ++i) 
                    {
                            console.log("Season Parking Type : " + jsonobject5.cpkgrpinfo.cpktype[i].type);
                            console.log("Season Parking Branch Office : " + jsonobject5.cpkgrpinfo.cpktype[i].bo);
                            console.log("Season Parking Group : " + jsonobject5.cpkgrpinfo.cpktype[i].cpkgrp);
                            console.log("Season Parking Car Park No. Within the Group : " + jsonobject5.cpkgrpinfo.cpktype[i].cpkd.cpk);
                            console.log("Season Parking Rate : " + jsonobject5.cpkgrpinfo.cpktype[i].rate.r);
                            
                            seasonparkingtype = jsonobject5.cpkgrpinfo.cpktype[i].type;
                            seasonparkingbranchoffice = jsonobject5.cpkgrpinfo.cpktype[i].bo;
                            seasonparkinggroup = jsonobject5.cpkgrpinfo.cpktype[i].cpkgrp;
                            seasonparkingcarparkwithingroup = jsonobject5.cpkgrpinfo.cpktype[i].cpkd.cpk;
                            seasonparkingrate = jsonobject5.cpkgrpinfo.cpktype[i].rate.r;

                            //Save result into object
                            seasonparkingresultobj[i] = {
                                SeasonParkingType : seasonparkingtype,
                                SeasonParkingBranchOffice : seasonparkingbranchoffice,
                                SeasonParkingGroup : seasonparkinggroup,
                                SeasonParkingCarParkWithinGroup : seasonparkingcarparkwithingroup,
                                SeasonParkingRate : seasonparkingrate
                                };

                            console.log("----------------------------------------");
                     }
                }
            });
        });

        res.on('error', function(err) 
        {
            console.log('Got error: ' + err.message);
        });
    });
}


getnearestcarpark('1.332401', '103.848438');
getcarparkinformation('TPMD');
getnearestweather('1.332401', '103.848438');
getnearestURACarpark('1.332401', '103.848438');
getnearestURACarparkInformation('K0087');
getseasonparkinginformation('310100');



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