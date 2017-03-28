global.request = require("request");
global.cheerio = require('cheerio');
request = request.defaults({jar: true});
global.mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/stevens-scheduler');
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
