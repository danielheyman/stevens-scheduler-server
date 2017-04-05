global.request = require("request");
global.cheerio = require('cheerio');
request = request.defaults({
    jar: true
});
global.mongoose = require('mongoose');
if (process.env.APP_CONFIG) {
    var config = JSON.parse(process.env.APP_CONFIG);
    var mongoPassword = 'Daniel1011';
    //mongoose.connect("mongodb://" + config.mongo.user + ":" + mongoPassword + "@" + config.mongo.hostString);
} else {
    //mongoose.connect('mongodb://localhost/stevens-scheduler');
}
global.db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log('connected to db');
});
global.Course = require('./Course');
var mining = require('./mining');
var express = require('express');
var async = require('async');
var app = express();
var routeCache = require('route-cache');
var fs = require('fs');
var parseString = require('xml2js').parseString;


var generateCourseDescriptions = function() {
    fs.readFile('pdf.txt', 'utf8', function(err, data) {
        if (err) {
            return console.log(err);
        }
        var res = {};
        var match = /^([A-Z]+ \d+)+[\n\t ]+(?:[^\n]+[\n\t]+)?\(\d-\d-\d\)[\n\t]+((?:[^\n]+\s)+)/mg;
        while ((m = match.exec(data))) {
            res[m[1]] = m[2].replace(/\n/g, ' ');
        }
        match = /^(E \d+) [\w ]+\n((?:(?!E )[^\n]+\s)+)/gm;
        while ((m = match.exec(data))) {
            res[m[1]] = m[2].replace(/\n/g, ' ');
        }
        fs.writeFile('courseDescriptions.json', JSON.stringify(res), 'utf8', function() {
            console.log('done');
        });
    });
};

//generateCourseDescriptions();

var courseDescriptions = {};
var terms = ['2017F'];

fs.readFile('courseDescriptions.json', 'utf8', function readFileCallback(err, data) {
    if (err) {
        console.log(err);
    } else {
        courseDescriptions = JSON.parse(data);
    }
});

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get('/p/terms', routeCache.cacheSeconds(60 * 10), function(req, res) {
    var findTerms = function() {
        request('https://web.stevens.edu/scheduler/core/core.php?cmd=terms', function(error, response, body) {
            if (error || response.statusCode != 200) {
                return setTimeout(findTerms, 500);
            }
            parseString(body, function (err, result) {
                if(err) {
                    return setTimeout(findTerms, 500);
                }
                result = result.Terms.Term.map(function(t) {
                    return t.$.Code;
                }).reverse();
                
                terms = result;
                
                res.json(result);
            });
        });
    };

    findTerms();
});


app.get('/p/:term', routeCache.cacheSeconds(60 * 10), function(req, res) {
    if(terms.length && terms.indexOf(req.params.term) === -1) return res.send("Term not found!");
    
    var findTerm = function() {
        request('https://web.stevens.edu/scheduler/core/core.php?cmd=getxml&term=' + req.params.term, function(error, response, body) {
            if (error || response.statusCode != 200) {
                return setTimeout(findTerm, 500);
            }
            parseString(body, function (err, result) {
                if(err || !result.hasOwnProperty('Semester')) {
                    return setTimeout(findTerm, 500);
                }
                result = result.Semester.Course.map(function(c) {
                    var parsedName = c.$.Section.match(/\w+ \d+/);
                    return {
                        section: c.$.Section,
                        title: c.$.Title,
                        callNumber: c.$.CallNumber,
                        credits: parseInt(c.$.MinCredit),
                        maxEnrollment: c.$.MaxEnrollment,
                        currentEnrollment: c.$.CurrentEnrollment,
                        status: c.$.Status,
                        instructor: c.$.Instructor1,
                        description: parsedName ? courseDescriptions[parsedName[0]] : null,
                        daysTimeLocation: !c.Meeting ? [] : c.Meeting.map(function(m) {
                            return {
                                day: m.$.Day,
                                startTime: m.$.StartTime,
                                endTime: m.$.EndTime,
                                site: m.$.Site,
                                building: m.$.Building,
                                room: m.$.Room,
                                activity: m.$.activity
                            };
                        })
                    };
                });
                
                res.json(result);
            });
        });
    };

    findTerm();
});


app.get('/terms', routeCache.cacheSeconds(60 * 10), function(req, res) {
    var findTerms = function(cb) {
        request('https://web.stevens.edu/scheduler/core/core.php?cmd=terms', function(error, response, body) {
            if (error || response.statusCode != 200) {
                setTimeout(function() {
                    findTerms(cb);
                }, 500);
                return;
            }
            cb(body);
        });
    };

    findTerms(function(body) {
        res.send(body);
    });
});

app.get('/:term', routeCache.cacheSeconds(60 * 10), function(req, res) {
    var findTerm = function(cb) {
        request('https://web.stevens.edu/scheduler/core/core.php?cmd=getxml&term=' + req.params.term, function(error, response, body) {
            if (error || response.statusCode != 200) {
                setTimeout(function() {
                    findTerm(cb);
                }, 500);
                return;
            }
            cb(body);
        });
    };

    findTerm(function(body) {
        res.send(body);
    });
});

app.get('/', function(req, res) {
    res.send('Hello World!');
});

/*app.get('/mine/:term', function(req, res) {
    var term = req.params.term;
    if(['2017A', '2017B', '2017F'].indexOf(term) > -1) {
        mining(term);
        res.send('Mining');
    }
    else {
        res.send('Invalid');
    }
});

app.get('/terms', function(req, res) {
    Course.collection.distinct("term", function(err, terms){
        if(err) return res.send('Error');
        res.send(terms);
    });
});

app.get('/:term', function(req, res) {
    Course.find({term: req.params.term}).select('-_id section title callNumber credits open currentEnrollment maxEnrollment daysTimeLocation instructor updated_at').exec(function(err, courses) {
        if(err) return res.send('Error');
        res.send(courses.map(function(course) {
            course.title = course.title.replace(" - WebCampus Section.", "");
            return course;
        }));
    });
});*/

var port = 3000;
if (process.env.PORT) port = process.env.PORT;
app.listen(port, function() {
    console.log('Example app listening on port ' + port + '!');
});
