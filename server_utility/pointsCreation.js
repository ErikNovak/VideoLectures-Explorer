/**
 * Contains the functions for formating the points gained
 * by Multidimensional Scaling.
 */
var qm = require('qminer');

/**
  * Gets the minimum and maximum values of the vector.
  * @param {module:la.Vector} vec - The vector from which we
  * compute the minimum and maximum values.
  * @returns {object} The json objexct, where json.min is the
  * minimal value and json.max is the maximal value of vec.
  */
function getMinMax (vec) {
    var sorted = vec.sort();
    var min = sorted.at(0);
    var max = sorted.at(sorted.length - 1);
    return { min: min, max: max };
}

/**
 * Gets the linear function, that maps the minimal value of the
 * vector to 0 and the maximum value of the vector to 1.
 * @param {module:la.Vector} vec - The vector.
 * @returns {function} The function, that takes the value t and
 * returns the value between 0 and 1, based on the minimal and
 * maximal value of the vector.
 */
function createLinearFunction (vec) {
    var m = getMinMax(vec);
    if (m.min == m.max) {
        return function (t) { return 0.5; };
    } else {
        return function (t) {
            return 1 / (m.max - m.min) * t - m.min / (m.max - m.min);
        };
    }
}
exports.createLinearFunction = createLinearFunction;

/**
 * Creates an array of points enriched with the lectures data.
 * @param  {module:la.Matrix} pointsMatrix - The points coordinates from MDS.
 * @param  {module:qm.RecordSet} query     - The query data.
 * @return {Array.<object>} The object data used for the landscape.
 */
function fillPointsArray(pointsMatrix, query, ftr) {
    var storage = [];
    // create the propper point format and send it to client
    // the functions that puts the points into a unit square
    var xCoord = createLinearFunction(pointsMatrix.getCol(0));
    var yCoord = createLinearFunction(pointsMatrix.getCol(1));
    // generate an array of coordinates
    for (var pointN = 0; pointN < pointsMatrix.rows; pointN++) {
        var uniqueCategories = null;
        if (query[pointN].categories) {
            var categories = [].concat.apply([], query[pointN].categories.map(function (rec) {
                return rec.path.toArray();
            }));
            uniqueCategories = [];
            for (var CatN = 0; CatN < categories.length; CatN++) {
                categories[CatN] = categories[CatN].replace(/_/g, " ");
                if (uniqueCategories.indexOf(categories[CatN]) === -1 && categories[CatN] != 'Top') {
                    uniqueCategories.push(categories[CatN]);
                }
            }
        }
        var presenters = null;
        if (query[pointN].presenters.length !== 0) {
            presenters = query[pointN].presenters.map(function (rec) {
                return rec.name;
            });
        }
        var organization = null;
        if (query[pointN].presenters.length !== 0) {
            var workPlaces = [].concat.apply([], query[pointN].presenters.map(function (rec) {
                return rec.worksAt.map(function (rec2) {
                    return rec2.name;
                });
            }));
            for (var WorkN = 0; WorkN < workPlaces.length; WorkN++) {
                if (workPlaces[WorkN]) {
                    organization = workPlaces[WorkN];
                    break;
                }
            }
        }
        var featCategories = [];
        for(var FeatN = 0; FeatN < ftr.dim; FeatN++) {
            featCategories.push(ftr.getFeature(FeatN));
        }
        var landmarkTags = [];
        var landTfIdf = ftr.extractVector(query[pointN]);
        for(var LandN = 1; LandN < ftr.dim; LandN++) {
            if (landTfIdf[LandN] !== 0 && featCategories[LandN] !== 'Top') {
                landmarkTags.push([featCategories[LandN], landTfIdf[LandN]]);
            }
        }
        storage.push({
            x: xCoord(pointsMatrix.at(pointN, 0)),
            y: yCoord(pointsMatrix.at(pointN, 1)),
            title:        query[pointN].title,
            slug:         query[pointN].slug,
            type:         query[pointN].type,
            author:       presenters,
            organization: organization,
            language:     query[pointN].language,
            categories:   query[pointN].categories !== null ? uniqueCategories : null,
            published:    query[pointN].recorded,
            duration:     query[pointN].duration,
            public:       query[pointN].public,
            enabled:       query[pointN].enabled,
            views:        query[pointN].views,
            description:  query[pointN].description,
            landmarkTags: landmarkTags
        });
    }
    return storage;
}
exports.fillPointsArray = fillPointsArray;

/**
 * Calculates the svd of the feature matrix using the async function.
 * @param {module:la.Matrix} matrix - The feature matrix.
 * @param {object} params - The parameters for calculation.
 */
exports.getPoints = function (query, matrix, params, ftr) {
    var denseMat,
        SVD;
    // small matrices
    if (matrix.cols <= params.docTresh) {
        denseMat = matrix.full();
        var singVal = Math.min(denseMat.rows, denseMat.cols);
        SVD = qm.la.svd(denseMat, singVal, { iter: params.iter });
    }
    // large matrices
    else {
        var singVal = Math.min(matrix.cols, params.clusterN);
        var kmeans = new qm.analytics.KMeans({
            iter:         params.iter,
            k:            singVal,
            distanceType: 'Cos'
        });
        kmeans.fit(matrix);
        denseMat = kmeans.getModel().C;
        SVD = qm.la.svd(denseMat, params.clusterN, { iter: params.iter });
    }
    // calculating for mds
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
    var coordMat = MDS.fitTransform(V);

    // calculating the points
    var pntStorage = new qm.la.Matrix({ rows: matrix.cols, cols: 2 });
    // get the original matrix and normalize it
    var normMat = matrix; normMat.normalizeCols();
    // for each lecture get the distance to the clusters
    var distMatrix = denseMat.multiplyT(normMat);
    var convexNum  = distMatrix.cols < params.convexN ? distMatrix.cols : params.convexN;
    // get coordinates for each lecture
    for (var ColN = 0; ColN < matrix.cols; ColN++) {
        var colVec     = distMatrix.getCol(ColN);
        var sortVec    = colVec.sortPerm(false);
        var distVector = sortVec.vec.subVec(qm.la.rangeVec(0, convexNum - 1));
        var idxVector  = sortVec.perm;

        // create the article point coordinates
        var pnt = new qm.la.Vector([0, 0]);
        var totalDistance = distVector.sum();
        for (var ClusterN = 0; ClusterN < convexNum; ClusterN++) {
            var cluster = coordMat.getRow(idxVector.at(ClusterN));
            pnt = pnt.plus(cluster.multiply(distVector.at(ClusterN) / totalDistance));
        }
        pntStorage.setRow(ColN, pnt);
    }
    return fillPointsArray(pntStorage, query, ftr);
};
