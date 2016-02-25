/**
 * Contains the MDS class. 
 * 
 */

var qm = require('qminer');
qm.verbosity(1);

/**
 * Multidimensional Scaling: coordinate construction class.
 * @class
 * @classdesc It calculates the coordinates of the articles by using KMeans, LSI and MDS.
 * @param {object} [_options] - The options used for the coordinates construction:
 * <br>_options.iter          - Number of iterations in the algorithms.
 * <br>_options.clusterN      - Number of clusters to be computed with KMeans.
 * <br>_options.convexN       - Number of clusters used for the calculation of the article points.
 * <br>_options.docTresh      - Document treshold, when to use largescale pipeline.
 */ 
exports.MDS = function (_options) {
    // the parameters for the algorithms
    var iter, convexN, clusterN, docTresh;
    // KMeans and KMeans coordinates container
    var KCentr = new qm.la.Matrix(), 
        KCoord = new qm.la.Matrix();
    
    if (_options != null && _options instanceof qm.fs.FIn) {
        // parameter: input object
        var FInParams = _options.readJson();
        iter = FInParams.iter;
        clusterN = FInParams.clusterN;
        convexN = FInParams.convexN;
        docTresh = FInParams.docTresh;
        KCentr = new qm.la.Matrix(); KCentr.load(_options);
        KCoord = new qm.la.Matrix(); KCoord.load(_options);
    } else if (_options == null || typeof _options == 'object') {
        // parameter: json object
        iter = _options.iter == null ? 100 : _options.iter;
        convexN = _options.convexN == null ? 3 : _options.convexN;
        clusterN = _options.clusterN == null ? 200 : _options.clusterN;
        docTresh = _options.docTresh == null ? 200 : _options.docTresh;
    }
    
    // save the options
    var options = { iter: iter, clusterN: clusterN, convexN: convexN, docTresh: docTresh };
    
    
    /**
     * Gets the current options.
     * @returns {object} The current options. 
     */
    this.getOptions = function () {
        return options;
    }
    
    /**
     * Set the options.
     * @param {object} _options - The new options.
     */
    this.setOptions = function (_options) {
        if (_options == null) {
            throw "Coordinates.setOptions: expecting a json object containing the options!";
        }
        // the parameters for the algorithms
        iter = _options.iter == null ? options.iter : _options.iter;
        convexN = _options.convexN == null ? options.convexN : _options.convexN;
        clusterN = _options.clusterN == null ? options.clusterN : _options.clusterN;
        docTresh = _options.docTresh == null ? options.docTresh : _options.docTresh;
        
        // save the options
        options = { iter: iter, clusterN: clusterN, convexN: convexN, docTresh: docTresh };
    }
    
    /**
     * Gets the centroids and their 2d coordinates.
     * @returns {object} The JSON object, where JSON.centroids is the matrix of centroids 
     * and JSON.coord is the matrix of coordinates.
     */ 
    this.getCentroids = function () {
        return { centroids: KCentr, coord: KCoord };
    }
    
    this.save = function (fout) {
        if (!KCoord) { throw new Error("MDS.save: clusters not created yet!") }
        fout.writeJson({
            iter: iter, 
            clusterN: clusterN, 
            convexN: convexN, 
            docTresh: docTresh
        });
        KCentr.save(fout);
        KCoord.save(fout);
        return fout;
    }
    /**
     * Constructs the matrices and coordinates of the clusters (KCentr and KCoord).
     * @param {(module:la.Matrix | module:la.SparseMatrix)} mat - The feature matrix.
     */ 
    this.constructClusters = function (mat) {
        var V;
        if (mat.cols < docTresh) {
            // if the matrix has small amount of documents
            console.time("SVD");
            KCentr = mat.full(); var clust = Math.min(KCentr.rows, KCentr.cols);
            var svd = qm.la.svd(KCentr, clust, { iter: iter });
            var sing = svd.s, k = 1; // k: the number of singular vectors, so the criteria is > 0.8
            // sum of all singular values
            var singSum = sing.sum();
            for (var N = 0; N < KCentr.cols; N++) {
                // the sum of the first N singular values
                var subSum = sing.subVec(qm.la.rangeVec(0, N)).sum();
                // criteria
                if (subSum / singSum > 0.8) {
                    k = N; break;
                }
            }
            // get the singular matrix of the rank k - 1
            V = svd.V.getColSubmatrix(qm.la.rangeVec(0, k - 1)).transpose();
            console.timeEnd("SVD")
        } else {
            // if the matrix has alot of documents
            console.time("KMeans");
            var clust = Math.min(mat.cols, clusterN);
            var kmeans = new qm.analytics.KMeans({ iter: iter, k: clust });
            kmeans.fit(mat);
            // save the centroids and create it's copy (normalized)
            KCentr = kmeans.getModel().C;
            console.timeEnd("KMeans")
            // second step: create a Latent Semantic Indexing on the centroids
            console.time("SVD");
            var svd = qm.la.svd(KCentr, clusterN, { iter: iter });
            var sing = svd.s, k = 1; // k: the number of singular vectors, so the criteria is > 0.8
            // sum of all singular values
            var singSum = sing.sum();
            for (var N = 1; N < clusterN; N++) {
                // the sum of the first N singular values
                var subSum = sing.subVec(qm.la.rangeVec(0, N)).sum();
                // criteria
                if (subSum / singSum > 0.8) {
                    k = N; break;
                }
            }
            // get the singular matrix of the rank k - 1
            V = svd.V.getColSubmatrix(qm.la.rangeVec(1, k - 1)).transpose();
            console.timeEnd("SVD");
        }
        // third step: use Multidimensional Scaling to get the coordinates of the clusters
        console.time("MDS");
        var MDS = new qm.analytics.MDS({ maxStep: 3000, maxSecs: 2, minDiff: 1e-3, distType: 'Cos' });
        KCoord = MDS.fitTransform(V);
        console.timeEnd("MDS");
        
        // bonus: normalize the columns of KCentr
        KCentr.normalizeCols();
    }
    
    /**
     * Creates the coordinate matrix.
     * @param {(module:la.Matrix | module.la.SparseMatrix)} mat - The given features matrix of articles.
     * @returns {module:la.Matrix} A dense matrix where the i-th row is the 2d coordinates of the i-th article. 
     */ 
    this.getArticlesCoord = function (mat) {
        // create an empty coordinates matrix
        var points = new qm.la.Matrix({ rows: mat.cols, cols: 2 });
        
        // normalize the columns of mat
        var normMat = mat; normMat.normalizeCols();
        // for each article get the distance to the clusters
        var distMat = KCentr.multiplyT(normMat);
        //var distMat = qm.la.pdist2(KCentr, normMat);
       
        var newConvexN = distMat.cols < convexN ? distMat.cols : convexN;
        
        for (var ColN = 0; ColN < distMat.cols; ColN++) {
            var column = distMat.getCol(ColN);
            var sortedCol = column.sortPerm(false);
            var distVec = sortedCol.vec.subVec(qm.la.rangeVec(0, newConvexN - 1));
            var vecIdx = sortedCol.perm.subVec(qm.la.rangeVec(0, newConvexN - 1));
            
            // create the article point coordinates
            var x = new qm.la.Vector([0, 0]);
            var totalW = distVec.sum(); 
            //for (var Num = 0; Num < newConvexN; Num++) {
            //    totalW += Math.sqrt(distVec.at(Num));
            //}
            for (var CltN = 0; CltN < newConvexN; CltN++) {
                var clt = KCoord.getRow(vecIdx.at(CltN));
                x = x.plus(clt.multiply(distVec.at(CltN) / totalW));
            }
            points.setRow(ColN, x);
        }
        //points.print();
        console.log("Number of points: " + points.rows);
        return points;
    }
}

