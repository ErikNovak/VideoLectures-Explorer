/**
 * VIDEOLECTURES - LEARNING ANALYTICS | LANDSCAPE
 * Data Server
 * Used for construction of the landscaping of the videolectures data.
 * Contains the videolectures database and other functions for constru-
 * ction of the landscape graph.
 */

var express    = require('express'),
    bodyParser = require('body-parser'),
    favicon    = require('serve-favicon'),
    path       = require('path');

// logger dependancies
var FileStreamRotator = require('file-stream-rotator'),
    morgan            = require('morgan'),
    fs                = require('fs');

var app = express();

// logger
var logDirectory = path.join(__dirname, 'log');
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

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

app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5055');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type');
    // Pass to next layer of middleware
    next();
});

/**
 * The qminer module for the videolecture dataset.
 */
var qm = require('qminer');
var helper = require('./server_utility/helper.js');

var base = new qm.Base({
    mode:   'openReadOnly',
    dbPath: './data/database/lecturesTest/'
});

// ---------------------------------------
// Query Function
// ---------------------------------------

/**
 * Queries the database for lectures using the data.
 * @param {Object} data                                  - The data to be queried.
 * @param {Array.<string>} [data.category.name]          - The category names.
 * @param {Array.<string>} [data.author.name]            - The author names.
 * @param {Array.<string>} [data.organization.name]      - The organization names.
 * @param {Array.<string>} [data.organization.cities]    - The organization cities.
 * @param {Array.<string>} [data.organization.countries] - The organization countries.
 * @param {Array.<string>} [data.lecture.type]           - The lecture type.
 * @param {Array.<string>} [data.lecture.language]       - The lecture language.
 * @param {Array.<string>} [data.lecture.duration.min]   - The lecture minimum duration.
 * @param {Array.<string>} [data.lecture.duration.max]   - The lecture maximum duration.
 * @param {Array.<string>} [data.lecture.views.min]      - The lecture minimum views.
 * @param {Array.<string>} [data.lecture.views.max]      - The lecture maximum views.
 * @return {module:qm.RecordSet} The record set containing the queried lectures.
 */
function queryDatabase(data) {
    var query = {};

    // search for lectures with categories
    if (data.category) {
        if(!data.category.names) throw "category.name must be specified";
        var categoryQuery = {
            $name: "lectures",
            $query: {
                $from: "Categories",
                title: data.category.names
            }
        }
        query["$join"] = [categoryQuery];
    }
    // search for lectures with authors
    if (data.authors) {
        if(!data.author.names) throw "authors.name must be specified";
        for (var AuthorN = 0; AuthorN < data.author.name.length; AuthorN++) {
            var authorsQuery = {
                $name: "hasPresented",
                $query: {
                    $from: "Authors",
                    name: data.authors.names[AuthorN]
                }
            };
            // if $join already exists
            if (query["$join"]) {
                query["$join"].push(authorsQuery);
            } else {
                query["$join"] = [authorsQuery];
            }
        }
    }
    // search for lectures with organization
    if (data.organization) {
        var organizationQuery = {
            $name: "hasPresented",
            $query: {
                $join: {
                    $name: "hasWorkers",
                    $query: {
                        $from: "Organizations"
                    }
                }
            }
        };
        if(data.organization.names) {
            organizationQuery["$query"]["join"]["$query"]["name"] =
                data.organization.names;
        }
        if(data.organization.cities) {
            organizationQuery["$query"]["join"]["$query"]["city"] =
                data.organization.cities;
        }
        if(data.organization.countries) {
            organizationQuery["$query"]["join"]["$query"]["country"] =
                data.organization.countries;
        }
        // if $join already exists
        if (query["$join"]) {
            query["$join"].push(organizationQuery);
        } else {
            query["$join"] = [organizationQuery];
        }
    }
    // search for lectures by it's attributes
    if (data.lecture) {
        if (!query["$join"]) query["$from"] = "Lectures";

        if (data.lecture.type) {
            query["type"] = data.lecture.type;
        }
        if (data.lecture.language) {
            query["language"] = data.lecture.language;
        }
        if (data.lecture.duration) {
            var lectureDurationQuery = {};
            if (data.lecture.duration.min) {
                lectureDurationQuery["$gt"] = data.lecture.duration.min;
            }
            if (data.lecture.duration.max) {
                lectureDurationQuery["$lt"] = data.lecture.duration.max;
            }
            query["duration"] = lectureDurationQuery;
        }
        if(data.lecture.views) {
            var lectureViewsQuery = {};
            if (data.lecture.views.min) {
                lectureViewsQuery["$gt"] = data.lecture.views.min;
            }
            if (data.lecture.views.max) {
                lectureViewsQuery["$lt"] = data.lecture.views.max;
            }
            query["views"] = lectureViewsQuery;
        }
    }
    var result = base.search(query);
    return result;
}

// The feature space used for point generation
var ftr = new qm.FeatureSpace(base, [
    { type: "text", source: "Lectures", field: "title",       tokenizer: { type: "unicode", stopwords: "en" } },
    { type: "text", source: "Lectures", field: "description", tokenizer: { type: "unicode", stopwords: "en" } }
]);

// ---------------------------------------
// Query Function
// ---------------------------------------


/**
 * Get the JSON containing the landscape points info.
 */
app.post('/landscape-points', function (request, result) {
    var sentData = request.body;
    var search = queryDatabase(sentData.data);

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

            var points = helper.fillPointsArray(pointStorage, search);
            result.send({ "searchwords": sentData.data, "points": points });
        }
    }
});



function initialData() {
    var query = queryDatabase({
        category: {
            names: ["Artificial Intelligence"]
        }
    });
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

// ---------------------------------------
// Get and Post
// ---------------------------------------

/**
 * Returns the initial points used for the visualization.
 */
app.get('/initial-landscape-points', function (request, response) {
    response.send({
        searchwords: {
            type: "category",
            data: ["Artificial Intelligence"]
        },
        points: initialPoints
    });
})


/**
 * Sends the data for the input autocompletion.
 */
app.get('/autocomplete', function (req, res) {
    // get all categories
    var categoriesFile = qm.fs.openRead('./data/autocomplete/categories.aut');
    var categories = [];
    while (!categoriesFile.eof) {
        categories.push({
            "type": "category",
            "name": categoriesFile.readLine()
        });
    }

    // get all authors
    var authorsFile = qm.fs.openRead('./data/autocomplete/authors.aut');
    var authors = [];
    while (!authorsFile.eof) {
        authors.push({
            "type": "author",
            "name": authorsFile.readLine()
        });
    }

    // get all organizations
    var organizationsFile = qm.fs.openRead('./data/autocomplete/organizations.aut');
    var organizations = [];
    while (!organizationsFile.eof) {
        organizations.push({
            "type": "organization",
            "name": organizationsFile.readLine()
        });
    }

    // get all languages
    var languagesFile = qm.fs.openRead('./data/autocomplete/languages.aut');
    var languages = [];
    while (!languagesFile.eof) {
        languages.push({
            "type": "language",
            "name": languagesFile.readLine()
        });
    }

    // send the data to client
    res.send({
        authors:       authors,
        categories:    categories,
        organizations: organizations,
        languages:     languages
    });
});



/**
 * Initialize the data server.
 */
var PORT = 6052;
app.listen(PORT, function () {
    console.log('Videolectures Explorer | Data server on port ' + PORT);
});
