/**
 * VIDEOLECTURES - LEARNING ANALYTICS | LANDSCAPE
 * Server for the training analytics.
 * Used for construction of the landscaping of the videolectures data.
 * Contains the videolectures database and other functions for constru-
 * ction of the landscape graph.
 */

var express     = require('express'),
    bodyParser  = require('body-parser'),
    favicon     = require('serve-favicon'),
    path        = require('path'),
    request     = require('request');

// logger dependancies
var FileStreamRotator = require('file-stream-rotator'),
    morgan            = require('morgan'),
    fs                = require('fs');

var app = express();

// logger
var logDirectory = path.join(__dirname, 'log', 'page-request');
if(!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}
// create a rotating write stream
var accessLogStream = FileStreamRotator.getStream({
    date_format: 'YYYY-MM-DD',
    filename:    path.join(logDirectory, 'access-%DATE%.log'),
    frequency:   'daily',
    verbose:     false
});

var morganFormat = ':remote-addr - :remote-user [:date[iso]] ":method :url ' +
                   'HTTP/:http-version" :response-time[3]ms :status :res[content-length]';
app.use(morgan(morganFormat, { stream: accessLogStream }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(favicon(path.join(__dirname, 'data', 'favicon', 'favicon.ico')));

app.use('/public', express.static(__dirname + '/public'));

// send the main page
app.get('/', function (req, res) {
    var options = {
        root: __dirname + '/public/html/'
    };
    res.sendFile('index.html', options);
});


var DATAPORT = process.env.npm_package_config_dataport;
app.get('/api/getAutocomplete', function (req, res) {
    request('http://'+ DATAPORT +'/api/getAutocomplete', function (err, response, body) {
        res.send(body);
    });
});

app.get('/api/getInitLandscapePoints', function(req, res) {
    request('http://'+ DATAPORT +'/api/getInitLandscapePoints', function (err, response, body) {
        res.send(body);
    });
});

app.post('/api/getLandscapePoints', function (req, res) {
    var data = req.body;
    request({
        uri: 'http://'+ DATAPORT +'/api/getLandscapePoints',
        method: 'POST',
        form: data
    }, function (err, response, body) {
        res.send(body);
    });
});

/******************************************
 * Error/missing pages handler
 */

app.get('/404', function (req, res, next) {
    next();
});

app.get('/403', function (req, res, next) {
    var err = new Error('not allowed!');
    err.status = 403;
    next(err);
});

app.use(function (req, res, next) {
    res.status(404);

    // respond with html page
    if (req.accepts('html')) {
        var options = {
            root: __dirname + '/public/html/'
        };
        res.sendFile('404.html', options);
        return;
    }

    // default to plain-text
    res.type('txt').send('Not found');
});

var PORT = process.env.npm_package_config_webport;
app.listen(PORT, function () {
    console.log('Videolectures Dashboard | Landscape on port ' + PORT);
});
