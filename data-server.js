/**
 * VIDEOLECTURES - LEARNING ANALYTICS | LANDSCAPE
 * Data Server
 * Used for construction of the landscaping of the videolectures data.
 * Contains the videolectures database and other functions for constru-
 * ction of the landscape graph.
 */

var express    = require('express');
var bodyParser = require('body-parser');
var favicon    = require('serve-favicon');
var path       = require('path');
var Promise    = require('promise');

// logger dependancies
var FileStreamRotator = require('file-stream-rotator');
var morgan            = require('morgan');
var fs                = require('fs');

var app = express();

// logger
var logDirectory = path.join(__dirname, 'log', 'data-request');
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

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5055');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type');
    next();
});

/**
 * The qminer module for the videolecture dataset.
 */
var qm             = require('../../qminer');
var pointsCreation = require('./server_utility/pointsCreation.js');

var base = new qm.Base({
    mode:   'openReadOnly',
    dbPath: './data/database/lectures/'
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
    if (data.categories) {
        if(!data.categories.names) throw "categories.name must be specified";
        for (var CatN = 0; CatN < data.categories.names.length; CatN++) {
            var categoryQuery = {
                $name: "lectures",
                $query: {
                    $from: "Categories",
                    title: data.categories.names[CatN]
                }
            };
            if (query.$join) {
                query.$join.push(categoryQuery);
            } else {
                query.$join = [categoryQuery];
            }
        }
    }
    // search for lectures with authors
    if (data.authors) {
        if(!data.authors.names) throw "authors.name must be specified";
        for (var AuthorN = 0; AuthorN < data.authors.names.length; AuthorN++) {
            var authorsQuery = {
                $name: "hasPresented",
                $query: {
                    $from: "Authors",
                    name: data.authors.names[AuthorN]
                }
            };
            // if $join already exists
            if (query.$join) {
                query.$join.push(authorsQuery);
            } else {
                query.$join = [authorsQuery];
            }
        }
    }
    // search for lectures with organization
    if (data.organizations) {
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
        if(data.organizations.names) {
            organizationQuery.$query.$join.$query.name =
                data.organizations.names;
        }
        if(data.organizations.cities) {
            organizationQuery.$query.$join.$query.city =
                data.organizations.cities;
        }
        if(data.organizations.countries) {
            organizationQuery.$query.$join.$query.country =
                data.organizations.countries;
        }
        // if $join already exists
        if (query.$join) {
            query.$join.push(organizationQuery);
        } else {
            query.$join = [organizationQuery];
        }
    }
    // search for lectures by it's attributes
    if (data.lectures) {
        if (!query.$join) query.$from = "Lectures";

        if (data.lectures.type) {
            query.type = data.lectures.type;
        }
        if (data.lectures.language) {
            query.language = data.lectures.language;
        }
        if (data.lectures.duration) {
            var lectureDurationQuery = {};
            if (data.lectures.duration.min) {
                lectureDurationQuery.$gt = parseInt(data.lectures.duration.min);
            }
            if (data.lectures.duration.max) {
                lectureDurationQuery.$lt = parseInt(data.lectures.duration.max);
            }
            query.duration = lectureDurationQuery;
        }
        if(data.lectures.views) {
            var lectureViewsQuery = {};
            if (data.lectures.views.min) {
                lectureViewsQuery.$gt = parseInt(data.lectures.views.min);
            }
            if (data.lectures.views.max) {
                lectureViewsQuery.$lt = parseInt(data.lectures.views.max);
            }
            query.views = lectureViewsQuery;
        }
    }
    var result = base.search(query);
    return result;
}

// The feature space used for point generation
var ftrLectures = new qm.FeatureSpace(base, [
    { type: "text", source: "Lectures", field: "title",       tokenizer: { type: "unicode", stopwords: "en" } },
    { type: "text", source: "Lectures", field: "description", tokenizer: { type: "unicode", stopwords: "en" } },
    { type: "text", source: "Lectures", field: "slug",        tokenizer: { type: "unicode", stopwords: "en" } },
    { type: "text", source: { store: "Lectures", join: "categories" }, field: "title", mode: "tokenized" },
    { type: "text", source: { store: "Lectures", join: "parent" },     field: "title", tokenizer: { type: "unicode", stopwords: "en" } }
]);

// The feature space used for point generation
var ftrCategories = new qm.FeatureSpace(base, [
    { type: "text", source: { store: "Lectures", join: "categories" }, field: "title", mode: "tokenized" }
]);

// ---------------------------------------
// Query Function
// ---------------------------------------

/**
 * Get the JSON containing the landscape points info.
 */
app.post('/api/getLandscapePoints', function (req, res) {
    var sentData = req.body;
    var search = queryDatabase(sentData.data);
    // if search query is empty
    if (search.length === 0) {
        res.send({ error: "No data found!" });
        return;
    }

    // reset and update the feature space
    ftrLectures.clear(); ftrLectures.updateRecords(search);
    ftrCategories.clear(); ftrCategories.updateRecords(search);
    // extract the features and generate the points
    var featMat = ftrLectures.extractSparseMatrix(search);
    // set the parameters and make the async functions roll out
    var params = { iter: 2, convexN: 3, clusterN: 200, docTresh: 200 };

    // if there is only one point
    if (search.length == 1) {
        var mat    = new qm.la.Matrix([[0.5, 0.5]]);
        var points = pointsCreation.fillPointsArray(mat, search, ftrCategories);
        res.send({ "searchwords": sentData.data, "points": points });
        return;
    }
    // TODO: Make the Promises work

    // ---------------------------------------------
    // Part of the promise
    // ---------------------------------------------

    // // makes the promises for the functions
    //
    // // the common variables
    // let denseMat;
    // function calculatingKMeans(mat, params) {
    //     return new Promise(function (resolve, reject) {
    //         console.log("Calculating KMeans");
    //         let singVal = Math.min(mat.cols, params.clusterN);
    //         let kmeans = new qm.analytics.KMeans({
    //             iter:         params.iter,
    //             k:            singVal,
    //             distanceType: "Cos"
    //         });
    //         kmeans.fitAsync(mat, function (err) {
    //             if (err) reject(err);
    //             else resolve(kmeans);
    //         });
    //     });
    // }
    //
    // function calculateSVD(mat, params) {
    //     return new Promise(function (resolve, reject) {
    //         console.log("Calculating SVD");
    //         // small queries
    //         if (mat.cols <= params.docTresh) {
    //             denseMat = mat.full();
    //             let singVal = Math.min(denseMat.rows, denseMat.cols);
    //             console.log("Inside SVD promise")
    //             qm.la.svdAsync(denseMat, singVal, { iter: params.iter }, function (err, svd) {
    //                 console.log("Calculated SVD")
    //                 if (err) reject(err);
    //                 else resolve(svd);
    //             });
    //         }
    //         // large queries
    //         else {
    //             calculatingKMeans(mat, params).then(function (kmeans) {
    //                 denseMat = kmeans.getModel().C;
    //                 // return the promise
    //                 console.log("Inside SVD promise")
    //                 qm.la.svdAsync(denseMat, params.clusterN, { iter: params.iter }, function (err, svd) {
    //                     console.log("Calculated SVD")
    //                     if (err) reject(err);
    //                     else resolve(svd);
    //                 });
    //             });
    //         }
    //     });
    // }
    //
    // function calculateMDS(svd) {
    //     return new Promise(function (resolve, reject) {
    //         console.log("Calculating MDS");
    //         let singVal    = svd.s,
    //             numSingVal = singVal.length;
    //         let singValSum = singVal.sum();
    //         for (let singN = 0; singN < denseMat.cols; singN++) {
    //             // the sum of the first singN singular values
    //             let partSum = singVal.subVec(qm.la.rangeVec(0, singN)).sum();
    //             // the percentage of the info must be greater than 80%
    //             if (partSum / singValSum > 0.8) {
    //                 numSingVal = singN;
    //                 break;
    //             }
    //         }
    //         V = svd.V.getColSubmatrix(qm.la.rangeVec(0, numSingVal - 1)).transpose();
    //         let mdsParams = { maxStep: 3000, maxSecs: 2, minDiff: 1e-4, distType: 'Euclid' };
    //         let mds = new qm.analytics.MDS(mdsParams);
    //         // calculate the coordinates of the lectures
    //         console.log("Inside MDS promise")
    //         mds.fitTransformAsync(V, function (err, mdsMat) {
    //             console.log("Calculated MDS")
    //             if (err) reject(err);
    //             else resolve(mdsMat);
    //         });
    //     });
    // }
    //
    // function calculateAndSendPoints(mds) {
    //     console.log("Calculating Points");
    //     let pntStorage = new qm.la.Matrix({ rows: featMat.cols, cols: 2 });
    //     // get the original matrix and normalize it
    //     let normMat = featMat; normMat.normalizeCols();
    //     // for each lecture get the distance to the clusters
    //     let distMat = denseMat.multiplyT(normMat);
    //     let conNum  = distMat.cols < params.convexN ? distMat.cols : params.convexN;
    //     // get coordinates for each lecture
    //     for (let ColN = 0; ColN < normMat.cols; ColN++) {
    //         let colVec  = distMat.getCol(ColN);
    //         let sortVec = colVec.sortPerm(false);
    //         let distVec = sortVec.vec.subVec(qm.la.rangeVec(0, conNum - 1));
    //         let idxVec  = sortVec.perm;
    //         // create the article point coordinates
    //         let pnt = new qm.la.Vector([0, 0]);
    //         let totalDist = distVec.sum();
    //         for (let ClustN = 0; ClustN < conNum; ClustN++) {
    //             let cluster = mds.getRow(idxVec.at(ClustN));
    //             pnt = pnt.plus(cluster.multiply(distVec.at(ClustN) / totalDist));
    //         }
    //         pntStorage.setRow(ColN, pnt);
    //     }
    //
    //     let points = pointsCreation.fillPointsArray(pntStorage, search);
    //     console.log("Sending points");
    //     res.send({ "searchwords": sentData.data, "points": points });
    // }





    // ---------------------------------------------
    // Part of the promise
    // ---------------------------------------------

    // // calculate and send the points
    // calculateSVD(featMat, params).then(calculateMDS)
    //                              .then(calculateAndSendPoints)
    //                              .catch(function (reason) {
    //         console.log(reason);
    //         res.send({ error: "An error occur when calculating the points." });
    //     }
    // );
    // // calculateAndSendPoints(featMat, params);

    /**
     * Calculates and sends the points to the client.
     * The function sequence:
     * SVD -> runMDS -> Coordinates
     */
    SendPoints(featMat, params);

    /**
     * Calculates the svd of the feature matrix using the async function.
     * @param {module:la.Matrix} matrix - The feature matrix.
     * @param {object} params - The parameters for calculation.
     */
    function SendPoints(matrix, params) {
        var denseMat;
        var singVal;
        // small matrices
        if (matrix.cols <= params.docTresh) {
            denseMat = matrix.full();
            singVal = Math.min(denseMat.rows, denseMat.cols);
            qm.la.svdAsync(denseMat, singVal, { iter: params.iter }, runMDS);
        }
        // large matrices
        else {
            singVal = Math.min(matrix.cols, params.clusterN);
            var kmeans = new qm.analytics.KMeans({
                iter:         params.iter,
                k:            singVal,
                distanceType: "Cos"
            });
            kmeans.fitAsync(matrix, function (err) {
                if (err) {
                    console.log(err);
                    res.send({ error: "Error on the server side!" });
                    return;
                }
                denseMat = kmeans.getModel().C;
                qm.la.svdAsync(denseMat, params.clusterN, { iter: params.iter }, runMDS);
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
                res.send({ error: "Error on the server side!" });
                return;
            }

            var singVal    = SVD.s,
                numSingVal = singVal.length;
            var singValSum = singVal.sum();
            for (var partN = 0; partN < denseMat.cols; partN++) {
                // the sum of the first N singular values
                var partSum = singVal.subVec(qm.la.rangeVec(0, partN)).sum();
                // if the info is greater than 80%
                if (partSum / singValSum > 0.8) {
                    numSingVal = partN;
                    break;
                }
            }
            V = SVD.V.getColSubmatrix(qm.la.rangeVec(0, numSingVal - 1)).transpose();
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
                res.send({ error: "Error on the server side!" });
                return;
            }
            var pntStorage = new qm.la.Matrix({ rows: matrix.cols, cols: 2 });
            // get the original matrix and normalize it
            var normMat = matrix; normMat.normalizeCols();
            // for each lecture get the distance to the clusters
            var distMat   = denseMat.multiplyT(normMat);
            var convexNum = distMat.cols < params.convexN ? distMat.cols : params.convexN;
            // get coordinates for each lecture
            for (var ColN = 0; ColN < matrix.cols; ColN++) {
                var colVec  = distMat.getCol(ColN);
                var sortVec = colVec.sortPerm(false);
                var distVec = sortVec.vec.subVec(qm.la.rangeVec(0, convexNum - 1));
                var idxVec  = sortVec.perm;

                // create the article point coordinates
                var pnt = new qm.la.Vector([0, 0]);
                var totalDist = distVec.sum();
                for (var ClusterN = 0; ClusterN < convexNum; ClusterN++) {
                    var cluster = coordinateMatrix.getRow(idxVec.at(ClusterN));
                    pnt = pnt.plus(cluster.multiply(distVec.at(ClusterN) / totalDist));
                }
                pntStorage.setRow(ColN, pnt);
            }

            var points = pointsCreation.fillPointsArray(pntStorage, search, ftrCategories);
            res.send({ "searchwords": sentData.data, "points": points });
        }
    }

});


var initialQuery = {
    categories: {
        names: ["Big Data"]
    }
};
/**
 * Calculates the initial landscape points.
 * @return {Array.<Object>} The objects used for the landscape visualization.
 */
function initialData() {
    var query = queryDatabase(initialQuery);
    // reset and update the feature space
    ftrLectures.clear();   ftrLectures.updateRecords(query);
    ftrCategories.clear(); ftrCategories.updateRecords(query);
    // extract the features and generate the points
    var featureMatrix = ftrLectures.extractSparseMatrix(query);

    // set the parameters and make the async functions roll out
    var params = { iter: 2, convexN: 3, clusterN: 200, docTresh: 200 };
    var points = pointsCreation.getPoints(query, featureMatrix, params, ftrCategories);
    return points;
}
var initialPoints = initialData();

// ---------------------------------------
// Get and Post
// ---------------------------------------

/**
 * Returns the initial points used for the visualization.
 */
app.get('/api/getInitLandscapePoints', function (req, res) {
    res.send({
        searchwords: initialQuery,
        points: initialPoints
    });
});

// ----------------------------------------------
// Autocomplete GET
// ----------------------------------------------
// TODO: add additional autocompletes EVENT
function createAutocompleteList() {
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

    // get all cities
    var citiesFile = qm.fs.openRead('./data/autocomplete/cities.aut');
    var cities = [];
    while (!citiesFile.eof) {
        cities.push({
            "type": "city",
            "name": citiesFile.readLine()
        });
    }

    // get all countries
    var countriesFile = qm.fs.openRead('./data/autocomplete/countries.aut');
    var countries = [];
    while (!countriesFile.eof) {
        countries.push({
            "type": "country",
            "name": countriesFile.readLine()
        });
    }
    return {
        authors:       authors,
        categories:    categories,
        organizations: organizations,
        languages:     languages,
        cities:        cities,
        countries:     countries
    };
}
var autocompleteList = createAutocompleteList();

/**
 * Sends the data for the input autocompletion.
 */
app.get('/api/getAutocomplete', function (req, res) {
    // send the data to client
    res.send(autocompleteList);
});


/**
 * Initialize the data server.
 */
var PORT = 6052;
app.listen(PORT, function () {
    console.log('Videolectures Explorer | Data server on port ' + PORT);
});
