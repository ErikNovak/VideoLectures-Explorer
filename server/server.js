/**
 * Server for the training analytics. 
 * Used for construction of the landscaping of the videolectures data.
 * Contains the videolectures database and other functions for constru-
 * ction of the landscape graph.
 */

var http        = require('http'),
    express     = require('express'),
    bodyParser  = require('body-parser'),
    favicon     = require('serve-favicon'),
    fs          = require('fs'),
    path        = require('path');

var app    = express();
var server = http.Server(app);

// static folder
app.use('/public', express.static(__dirname + '/public'));

// data parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(favicon(path.join(__dirname, 'public', 'pics', 'favicon.ico')));

// send the main page
app.get('/vl', function (req, res) {
    var options = {
        root: __dirname + '/public/html/'
    };
    res.sendFile('index.html', options);
});
var PORT = 5055;
server.listen(PORT, function () {
    console.log('Videolectures Dashboard | Landscape on port ' + PORT);
});


/**
 * The qminer database of the videolecture dataset.
 * It allows to calculate the landspace points.
 */

var qm = require('qminer');
var formatJ = require('./server_utility/formatJ.js');

var base = new qm.Base({
    mode: 'openReadOnly',
    dbPath: './data/database/lectures/'
});

var ftr = new qm.FeatureSpace(base, [
    { type: "text", source: "Lectures", field: "title", tokenizer: { type: "unicode", stopwords: "en" } },
    { type: "text", source: "Lectures", field: "description", tokenizer: { type: "unicode", stopwords: "en" } },
    { type: "text", source: "Lectures", field: "categories", tokenizer: { type: "unicode", stopwords: "en" } },
    { type: "text", source: "Lectures", field: "keywords", tokenizer: { type: "unicode", stopwords: "en" } }
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
                // author
                query.author = searchData.data;
            } else if (searchData.type == "organization") {
                // organization
                query.organization = searchData.data;
            } else if (searchData.type == "category") {
                // categories
                query.categories = searchData.data;
            } else if (searchData.type == "language") {
                // language
                query.language = searchData.data;
            } else if (searchData.type == "views_min") {
                // minimum number of views
                query.views = [{ $gt: parseInt(searchData.data) }];
            } else if (searchData.type == "views_max") {
                // maximum number of views
                if (query['views']) { query['views'] = query['views'].concat([{ $lt: parseInt(searchData.data) }]); } 
                else { query.views = { $lt: parseInt(searchData.data) }; }
            }
            else {
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
app.post('/vl/landscape-points', function (request, result) {
    var sentData = request.body;
    var search = queryData(sentData.data);

    // if search query is empty
    if (search.length == 0) {
        result.send({ error: "No data found!" });
        return;
    }
    // reset and update the feature space
    ftr.clear(); ftr.updateRecords(search);
    // extract the features and generate the points
    var featureMat = ftr.extractSparseMatrix(search);
    // set the parameters and make the async functions roll out
    var params = { iter: 2, convexN: 3, clusterN: 200, docTresh: 200 };
    
    /**
     * Calculates and sends the points to the client.
     * The function sequence:
     * SVD -> MDS -> Coordinates
     */ 
    SendPoints(featureMat, params);
    
    /**
     * Calculates the svd of the feature matrix using the async function.
     * @param {module:la.Matrix} mat - The feature matrix.
     * @param {object} params - The parameters for calculation.
     */
    function SendPoints(mat, params) {
        var fullMat;
        if (mat.cols <= params.docTresh) {
            fullMat = mat.full(); var clust = Math.min(fullMat.rows, fullMat.cols);
            qm.la.svdAsync(fullMat, clust, { iter: params.iter }, callMDS);

        } else {
            var clust = Math.min(mat.cols, params.clusterN);
            var kmeans = new qm.analytics.KMeans({ iter: params.iter, k: clust, distanceType: "Cos" });
            kmeans.fitAsync(mat, function (err) { 
                fullMat = kmeans.getModel().C;
                qm.la.svdAsync(fullMat, params.clusterN, { iter: params.iter }, callMDS);
            });
            
        }
        
        /**
         * Callback function for svdAsync. It constructs a new matrix and calls 
         * MDS.fitTransform.
         * @param {error} err - The error if something goes wrong.
         * @param {Object} svd - The SVD decomposition gained with svdAsync.
         */ 
        function callMDS(err, SVD) {
            if (err) { console.log(err); return; }
            var singularValues = SVD.s, k = 1;
            var singularSum = singularValues.sum();
            for (var partN = 0; partN < fullMat.cols; partN++) {
                // the sum of the first N singular values
                var partialSum = singularValues.subVec(qm.la.rangeVec(0, partN)).sum();
                if (partialSum / singularSum > 0.8) {
                    k = partN; break;
                }
            }
            V = SVD.V.getColSubmatrix(qm.la.rangeVec(0, k - 1)).transpose();
            var MDSParam = { maxStep: 3000, maxSecs: 2, minDiff: 1e-3, distType: 'Cos' };
            var MDS = new qm.analytics.MDS(MDSParam);
            // calculate the coordinates of the lectures
            MDS.fitTransformAsync(V, Coordinates);
        }
        /**
         * Callback for the MDS.fitTransform function. It creates the coordinates for the
         * lectures and sends them to createSendPoints.
         * @param {error} err - The error if something goes wrong.
         * @param {module:la.Matrix} coordinateMatrix - The coordinate matrix gained from 
         * MDS.fitTransformAsync.
         */ 
        function Coordinates(err, coordinateMatrix) {
            if (err) { console.log(err); return; }
            var points = new qm.la.Matrix({ rows: mat.cols, cols: 2 });
            var normalizedMat = mat; normalizedMat.normalizeCols();
            // for each lecture get the distance to the clusters
            var distanceMat = fullMat.multiplyT(normalizedMat);
            var newConvexN = distanceMat.cols < params.newConvexN ? distanceMat.cols : params.convexN;
            // get coordinates for each lecture
            for (var ColN = 0; ColN < mat.cols; ColN++) {
                //console.log("Loop number: " + ColN);
                var columnVec = distanceMat.getCol(ColN);
                var sortedVec = columnVec.sortPerm(false);
                var distanceVec = sortedVec.vec.subVec(qm.la.rangeVec(0, newConvexN - 1));
                var indexVec = sortedVec.perm;

                // create the article point coordinates
                var x = new qm.la.Vector([0, 0]);
                var totalW = distanceVec.sum();
                for (var CltN = 0; CltN < newConvexN; CltN++) {
                    var clt = coordinateMatrix.getRow(indexVec.at(CltN));
                    x = x.plus(clt.multiply(distanceVec.at(CltN) / totalW));
                }
                points.setRow(ColN, x);
                
            }
            // create the propper point format and send it to client
            // the functions that puts the points into a unit square
            var xCoord = formatJ.linearF(points.getCol(0));
            var yCoord = formatJ.linearF(points.getCol(1));
            // generate an array of coordinates
            var pointsArr = [];
            for (var pointN = 0; pointN < points.rows; pointN++) {
                pointsArr.push({
                    x: xCoord(points.at(pointN, 0)), 
                    y: yCoord(points.at(pointN, 1)), 
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
            result.send({ "searchwords": sentData.data, "points": pointsArr });
        }       
    }
})