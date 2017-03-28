global.request = require("request");
global.cheerio = require('cheerio');
request = request.defaults({jar: true});
global.mongoose = require('mongoose');
var config = JSON.parse(process.env.APP_CONFIG);
var mongoPassword = 'Daniel1011';
mongoose.connect("mongodb://" + config.mongo.user + ":" + mongoPassword + "@" + config.mongo.hostString);
global.db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log('connected to db');
});
global.Course = require('./Course');

//require('./mining')('2017F');

var http = require('http');
var server = http.createServer(function(req, res) {
	res.writeHead(200, { 'Content-Type': 'text/plain' });
	res.end('Hello world!');
});
server.listen(process.env.PORT);
