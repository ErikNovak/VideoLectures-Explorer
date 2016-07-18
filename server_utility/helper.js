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
        return function (t) { return 0.5; }
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
function fillPointsArray(pointsMatrix, query) {
    var storage = [];

    // create the propper point format and send it to client
    // the functions that puts the points into a unit square
    var xCoord = createLinearFunction(pointsMatrix.getCol(0));
    var yCoord = createLinearFunction(pointsMatrix.getCol(1));
    // generate an array of coordinates
    for (var pointN = 0; pointN < pointsMatrix.rows; pointN++) {
        var categories = [].concat.apply([], query[pointN].categories.map(function (rec) {
            return rec.path.toArray()
        }));
        var presenters = null;
        if (query[pointN].presenters.length != 0) {
            presenters = query[pointN].presenters.map(function (rec) {
                return rec.name
            });
        }
        var organization = null;
        if (query[pointN].presenters.length != 0) {
            var workPlaces = [].concat.apply([], query[pointN].presenters.map(function (rec) {
                return rec.worksAt.map(function (rec2) {
                    return rec2.name;
                })
            }));
            for (var WorkN = 0; WorkN < workPlaces.length; WorkN++) {
                if (workPlaces[WorkN] != null) {
                    organization = workPlaces[WorkN];
                    break;
                }
            }
        }
        storage.push({
            x: xCoord(pointsMatrix.at(pointN, 0)),
            y: yCoord(pointsMatrix.at(pointN, 1)),
            title:        query[pointN].title,
            author:       presenters,
            organization: organization,
            language:     query[pointN].language,
            categories:   query[pointN].categories != null ? categories : null,
            published:    query[pointN].recorded,
            duration:     query[pointN].duration,
            views:        query[pointN].views,
            description:  query[pointN].description
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
exports.getPoints = function (query, matrix, params) {
    var denseMatrix, SVD;
    // small matrices
    if (matrix.cols <= params.docTresh) {
        denseMatrix = matrix.full();
        var numOfSingVal = Math.min(denseMatrix.rows, denseMatrix.cols);
        SVD = qm.la.svd(denseMatrix, numOfSingVal, { iter: params.iter });
    }
    // large matrices
    else {
        var numOfSingVal = Math.min(matrix.cols, params.clusterN);
        var KMeans = new qm.analytics.KMeans({
            iter: params.iter,
            k: numOfSingVal,
            distanceType: "Cos"
        });
        KMeans.fit(matrix);
        denseMatrix = KMeans.getModel().C;
        SVD = qm.la.svd(denseMatrix, params.clusterN, { iter: params.iter });
    }
    // calculating for mds
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
    var coordinateMatrix = MDS.fitTransform(V);

    // calculating the points
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
        var distVector = sortedVector.vec.subVec(qm.la.rangeVec(0, convexNumber - 1));
        var indexVector = sortedVector.perm;

        // create the article point coordinates
        var pt = new qm.la.Vector([0, 0]);
        var totalDistance = distVector.sum();
        for (var ClusterN = 0; ClusterN < convexNumber; ClusterN++) {
            var cluster = coordinateMatrix.getRow(indexVector.at(ClusterN));
            pt = pt.plus(cluster.multiply(distVector.at(ClusterN) / totalDistance));
        }
        pointStorage.setRow(ColN, pt);
    }

    return fillPointsArray(pointStorage, query);
}
