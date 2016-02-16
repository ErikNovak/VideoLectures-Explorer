/**
 * Server for the training analytics. 
 * Used for construction of the landscaping of the videolectures data.
 * Contains the videolectures database and other functions for constru-
 * ction of the landscape graph.
 */

var http = require('http'),
    express = require('express'),
    bodyParser = require('body-parser'),
    fs = require('fs'),
    path = require('path');

var app = express();
var server = http.Server(app);

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

var htmlPath = __dirname + '/public/html/';
app.get('/', function (req, res) {
    res.sendFile(path.join(htmlPath, 'index.html'));
});

server.listen('5055', function () {
    console.log('Videolectures on port 5055');
});


/**
 * The qminer database of the videolecture dataset.
 * It allows to calculate the landspace points.
 */

var qm = require('qminer');
var algorithms = require('./server_utility/algorithms.js');
var formatJ = require('./server_utility/formatJ.js');

var base = new qm.Base({
    mode: 'openReadOnly',
    dbPath: './data/database/videos/'
});

var ftr = new qm.FeatureSpace(base, [
    { type: "text", source: "Lectures", field: "title", tokenizer: { type: "unicode", stopwords: "en" } },
    { type: "text", source: "Lectures", field: "description", tokenizer: { type: "unicode", stopwords: "en" } },
    { type: "text", source: "Lectures", field: "categories", tokenizer: { type: "unicode", stopwords: "en" } },
    { type: "text", source: "Lectures", field: "keywords", tokenizer: { type: "unicode", stopwords: "en" } },
    //{ type: "categorical", source: "Lectures", field: "language", values: ["en", "sl"] }
]);

/**
 * Queries the data.
 * 
 */
var query = function (data) {
    var quer = { $from: "Lectures" };
    for (var dataN = 0; dataN < data.length; dataN++) {
        var search_data = data[dataN];
        if (search_data.data.length != 0) {
            if (search_data.type == "author") {
                quer.author = search_data.data;
            } else if (search_data.type == "organization") {
                quer.organization = search_data.data;
            } else if (search_data.type == "category") {
                quer.categories = search_data.data;
            } else if (search_data.type == "language") {
                quer.language = search_data.data;
            } else {
                throw "Error: Not recognizable data type " + search_data.type;
            }
        }
    }
    var result = base.search(quer);
    return result;
}

/**
 * Responces to the html request.  
 */

/**
 * Sends the data of the list for autocompletion used in the 
 * search bars.
 */ 
app.get('/vl/autocomplete', function (req, res) {
    // get the categories
    var categoriesFile = qm.fs.openRead('./data/autocomplete/categories.txt');
    var categories = [];
    while (!categoriesFile.eof) {
        categories.push({
            "type": "category",
            "name": categoriesFile.readLine()
        });
    }
    
    // get the authors
    var authorsFile = qm.fs.openRead('./data/autocomplete/authors.txt');
    var authors = [];
    while (!authorsFile.eof) {
        authors.push({
            "type": "author",
            "name": authorsFile.readLine()
        });
    }
    
    // get organizations
    var organizationsFile = qm.fs.openRead('./data/autocomplete/organizations.txt');
    var organizations = [];
    while (!organizationsFile.eof) {
        organizations.push({
            "type": "organization",
            "name": organizationsFile.readLine()
        });
    }
    
    // get languages
    var languagesFile = qm.fs.openRead('./data/autocomplete/languages.txt');
    var languages = [];
    while (!languagesFile.eof) {
        languages.push({
            "type": "language",
            "name": languagesFile.readLine()
        });
    }
    
    // send the data to client
    res.send({
        authors: authors,
        categories: categories, 
        organizations: organizations,
        languages: languages
    });
});

/**
 * Get the JSON containing the landscape points info. 
 */
app.post('/vl/landscape-points', function (req, res) {
    var sent_data = req.body;
    var search = query(sent_data.data);
    console.log("Number of lecture: " + search.length);
    // if search query is empty
    if (search.length == 0) {
        res.send({ error: "No data found!" });
        return;
    }
    debugger
    // reset and update the feature space
    console.time("Feature Space");
    ftr.clear(); ftr.updateRecords(search);
    console.timeEnd("Feature Space");
    // extract the features and generate the points
    console.time("Extraction");
    var featureMat = ftr.extractMatrix(search);
    console.timeEnd("Extraction");
    console.time("MDS Construction");
    var MDS = new algorithms.MDS({ iter: 1, convexN: 3, clusterN: 200, docTresh: 200 });
    console.timeEnd("MDS Construction");
    console.time("MDS clusters");
    MDS.constructClusters(featureMat);
    console.timeEnd("MDS clusters");
    console.time("Coordinates");
    var coordinates = MDS.getArticlesCoord(featureMat);
    console.timeEnd("Coordinates");
    
    // the functions that puts the points into a unit square
    var xCoord = formatJ.linearF(coordinates.getCol(0));
    var yCoord = formatJ.linearF(coordinates.getCol(1));
    
    // generate an array of coordinates
    var points = [];
    for (var pointN = 0; pointN < coordinates.rows; pointN++) {
        points.push({
            x: xCoord(coordinates.at(pointN, 0)), 
            y: yCoord(coordinates.at(pointN, 1)), 
            title: search[pointN].title,
            author: search[pointN].author,
            organization: search[pointN].organization,
            language: search[pointN].language,
            categories: search[pointN].categories != null ? search[pointN].categories.toString() : null,
            published: search[pointN].published,
            duration: search[pointN].duration,
            views: search[pointN].views,
            description: search[pointN].description
        });
    }
    res.send({ "points": points });
})