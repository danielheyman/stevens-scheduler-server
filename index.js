global.request = require("request");
global.cheerio = require('cheerio');
request = request.defaults({
    jar: true
});
global.mongoose = require('mongoose');
if (process.env.APP_CONFIG) {
    var config = JSON.parse(process.env.APP_CONFIG);
    var mongoPassword = 'Daniel1011';
    mongoose.connect("mongodb://" + config.mongo.user + ":" + mongoPassword + "@" + config.mongo.hostString);
} else {
    mongoose.connect('mongodb://localhost/stevens-scheduler');
}
global.db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log('connected to db');
});
global.Course = require('./Course');
var mining = require('./mining');
var express = require('express');
var app = express();

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get('/terms', function(req, res) {  
    req.pipe(request('https://web.stevens.edu/scheduler/core/core.php?cmd=terms')).pipe(res);
});

app.get('/:term', function(req, res) {  
    req.pipe(request('https://web.stevens.edu/scheduler/core/core.php?cmd=getxml&term=' + req.params.term)).pipe(res);
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
