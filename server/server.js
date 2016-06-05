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
    fs          = require('fs'),
    path        = require('path');

var app = express();
var router = express.Router();

// static folder
app.use('/public', express.static(__dirname + '/public'));

// data parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(favicon(path.join(__dirname, 'data', 'favicon', 'favicon.ico')));

// router

// send the main page
app.get('/', function (req, res) {
    var options = {
        root: __dirname + '/public/html/'
    };
    res.sendFile('index.html', options);
});

var PORT = 5055;
app.listen(PORT, function () {
    console.log('Videolectures Dashboard | Landscape on port ' + PORT);
});


/**
 * The qminer database of the videolecture dataset.
 * It allows to calculate the landspace points.
 */

var qm = require('qminer');
var helper = require('./server_utility/helper.js');

var base = new qm.Base({
    mode: 'openReadOnly',
    dbPath: './data/database/lectures/'
});

var ftr = new qm.FeatureSpace(base, [
    { type: "text", source: "Lectures", field: "title",       tokenizer: { type: "unicode", stopwords: "en" } },
    { type: "text", source: "Lectures", field: "description", tokenizer: { type: "unicode", stopwords: "en" } },
    { type: "text", source: "Lectures", field: "categories",  tokenizer: { type: "unicode", stopwords: "en" } },
    { type: "text", source: "Lectures", field: "keywords",    tokenizer: { type: "unicode", stopwords: "en" } }
]);

/**
 * Queries the data.
 * @param {Array.<Object>} data - The query information.
 * @returns {module:qm.RecordSet} The query record set.
 */
var queryData = function (data) {
    var query = { $from: "Lectures" };
    for (var dataN = 0; dataN < data.length; dataN++) {
        var searchData = data[dataN];
        if (searchData.data.length != 0) {
            if (searchData.type == "author") {
                query.author = searchData.data;
            } else if (searchData.type == "organization") {
                query.organization = searchData.data;
            } else if (searchData.type == "category") {
                query.categories = searchData.data;
            } else if (searchData.type == "language") {
                query.language = searchData.data;
            } else if (searchData.type == "views-min") {
                query.views = [{ $gt: parseInt(searchData.data) }];
            } else if (searchData.type == "views-max") {
                if (query['views']) { query['views'] = query['views'].concat([{ $lt: parseInt(searchData.data) }]); } 
                else { query.views = { $lt: parseInt(searchData.data) }; }
            } else {
                throw "Error: Not recognizable data type " + search_data.type;
            }
        }
    }
    var result = base.search(query);
    return result;
}

/**
 * Responses to the html request. 
 */

/**
 * Sends the data for the input autocompletion.
 */ 
app.get('/autocomplete', function (req, res) {
    // get all categories
    var categoriesFile = qm.fs.openRead('./data/autocomplete/categories.txt');
    var categories = [];
    while (!categoriesFile.eof) {
        categories.push({
            "type": "category",
            "name": categoriesFile.readLine()
        });
    }
    
    // get all authors
    var authorsFile = qm.fs.openRead('./data/autocomplete/authors.txt');
    var authors = [];
    while (!authorsFile.eof) {
        authors.push({
            "type": "author",
            "name": authorsFile.readLine()
        });
    }
    
    // get all organizations
    var organizationsFile = qm.fs.openRead('./data/autocomplete/organizations.txt');
    var organizations = [];
    while (!organizationsFile.eof) {
        organizations.push({
            "type": "organization",
            "name": organizationsFile.readLine()
        });
    }
    
    // get all languages
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
app.post('/landscape-points', function (request, result) {
    var sentData = request.body;
    var search = queryData(sentData.data);
    
    // if search query is empty
    if (search.length == 0) {
        result.send({ error: "No data found!" });
        return;
    }
    // if there is only one point
    if (search.length == 1) {
        var points = [];
        points.push({
            x: 0.5, 
            y: 0.5, 
            title:        search[0].title,
            author:       search[0].author,
            organization: search[0].organization,
            language:     search[0].language,
            categories:   search[0].categories != null ? search[0].categories.toString() : null,
            published:    search[0].published,
            duration:     search[0].duration,
            views:        search[0].views,
            description:  search[0].description
        });
        result.send({ "searchwords": sentData.data, "points": points });
        return;
    }

    // reset and update the feature space
    ftr.clear(); ftr.updateRecords(search);
    // extract the features and generate the points
    var featureMatrix = ftr.extractSparseMatrix(search);
    // set the parameters and make the async functions roll out
    var params = { iter: 2, convexN: 3, clusterN: 200, docTresh: 200 };
    
    /**
     * Calculates and sends the points to the client.
     * The function sequence:
     * SVD -> runMDS -> Coordinates
     */                                          
    SendPoints(featureMatrix, params);
    
    /**
     * Calculates the svd of the feature matrix using the async function.
     * @param {module:la.Matrix} matrix - The feature matrix.
     * @param {object} params - The parameters for calculation.
     */
    function SendPoints(matrix, params) {
        var denseMatrix;
        // small matrices
        if (matrix.cols <= params.docTresh) {
            denseMatrix = matrix.full();
            var numOfSingVal = Math.min(denseMatrix.rows, denseMatrix.cols);
            qm.la.svdAsync(denseMatrix, numOfSingVal, { iter: params.iter }, runMDS);
        } 
        // large matrices
        else {
            var numOfSingVal = Math.min(matrix.cols, params.clusterN);
            var kmeans = new qm.analytics.KMeans({
                iter: params.iter, 
                k: numOfSingVal, 
                distanceType: "Cos"
            });
            kmeans.fitAsync(matrix, function (err) {
                if (err) {
                    console.log(err);
                    result.send({ error: "Error on the server side!" });
                    return;
                }
                denseMatrix = kmeans.getModel().C;
                qm.la.svdAsync(denseMatrix, params.clusterN, { iter: params.iter }, runMDS);
            });
            
        }
        
        /**
         * Callback function for svdAsync. It constructs a new matrix and calls 
         * MDS.fitTransform.
         * @param {error} err - The error if something goes wrong.
         * @param {Object} svd - The SVD decomposition gained with svdAsync.
         */ 
        function runMDS(err, SVD) {
            if (err) {
                console.log(err);
                result.send({ error: "Error on the server side!" });
                return;
            }

            var singularValues = SVD.s, 
                numberOfSingVal = 0;
            var singValSum = singularValues.sum();
            for (var partN = 0; partN < denseMatrix.cols; partN++) {
                // the sum of the first N singular values
                var partSum = singularValues.subVec(qm.la.rangeVec(0, partN)).sum();
                // if the info is greater than 80%
                if (partSum / singValSum > 0.8) {
                    numberOfSingVal = partN;
                    break;
                }
            }
            V = SVD.V.getColSubmatrix(qm.la.rangeVec(0, numberOfSingVal - 1)).transpose();
            var mdsParams = { maxStep: 3000, maxSecs: 2, minDiff: 1e-3, distType: 'Cos' };
            var MDS = new qm.analytics.MDS(mdsParams);
            // calculate the coordinates of the lectures
            MDS.fitTransformAsync(V, createCoordinates);
        }

        /**
         * Callback for the MDS.fitTransform function. It creates the coordinates for the
         * lectures and sends them to createSendPoints.
         * @param {error} err - The error if something goes wrong.
         * @param {module:la.Matrix} coordinateMatrix - The coordinate matrix gained from 
         * MDS.fitTransformAsync.
         */ 
        function createCoordinates(err, coordinateMatrix) {
            if (err) {
                console.log(err);
                result.send({ error: "Error on the server side!" });
                return;
            }
            var pointStorage = new qm.la.Matrix({ rows: matrix.cols, cols: 2 });
            // get the original matrix and normalize it
            var normalizedMatrix = matrix; normalizedMatrix.normalizeCols();
            // for each lecture get the distance to the clusters
            var distMatrix = denseMatrix.multiplyT(normalizedMatrix);
            var convexNumber = distMatrix.cols < params.convexN ? distMatrix.cols : params.convexN;
            // get coordinates for each lecture
            for (var ColN = 0; ColN < matrix.cols; ColN++) {
                var columnVector = distMatrix.getCol(ColN);
                var sortedVector = columnVector.sortPerm(false);
                var distVector   = sortedVector.vec.subVec(qm.la.rangeVec(0, convexNumber - 1));
                var indexVector  = sortedVector.perm;

                // create the article point coordinates
                var pt = new qm.la.Vector([0, 0]);
                var totalDistance = distVector.sum();
                for (var ClusterN = 0; ClusterN < convexNumber; ClusterN++) {
                    var cluster = coordinateMatrix.getRow(indexVector.at(ClusterN));
                    pt = pt.plus(cluster.multiply(distVector.at(ClusterN) / totalDistance));
                }
                pointStorage.setRow(ColN, pt);
            }

            // create the propper point format and send it to client
            // the functions that puts the points into a unit square
            var xCoord = helper.createLinearFunction(pointStorage.getCol(0));
            var yCoord = helper.createLinearFunction(pointStorage.getCol(1));
            // generate an array of coordinates
            var points = [];
            for (var pointN = 0; pointN < pointStorage.rows; pointN++) {
                points.push({
                    x:            xCoord(pointStorage.at(pointN, 0)), 
                    y:            yCoord(pointStorage.at(pointN, 1)), 
                    title:        search[pointN].title,
                    author:       search[pointN].author,
                    organization: search[pointN].organization,
                    language:     search[pointN].language,
                    categories:   search[pointN].categories != null ? search[pointN].categories.toString() : null,
                    published:    search[pointN].published,
                    duration:     search[pointN].duration,
                    views:        search[pointN].views,
                    description:  search[pointN].description
                });
            }
            result.send({ "searchwords": sentData.data, "points": points });
        }       
    }
});

function initialData() {
    var query = queryData([{ type: "category", data: ["Artificial Intelligence"] }]);
    // reset and update the feature space
    ftr.clear(); ftr.updateRecords(query);
    // extract the features and generate the points
    var featureMatrix = ftr.extractSparseMatrix(query);
    // set the parameters and make the async functions roll out
    var params = { iter: 2, convexN: 3, clusterN: 200, docTresh: 200 };
    var points = helper.getPoints(query, featureMatrix, params);
    return points;
}

var initialPoints = initialData();
app.get('/initial-landscape-points', function (request, response) {
    response.send({
        searchwords: [
            {
                type: "category", 
                data: ["Artificial Intelligence"]
            }
        ], 
        points: initialPoints
    });
})



/******************************************
 * Error/missing pages handler
 */

app.get('/404', function (req, res, next) { 
    next();
})

app.get('/403', function (req, res, next) {
    var err = new Error('not allowed!');
    err.status = 403;
    next(err);
})

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