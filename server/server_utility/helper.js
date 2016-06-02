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
 var getMinMax = function (vec) {
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
exports.createLinearFunction = function (vec) {
    var m = getMinMax(vec);
    if (m.min == m.max) {
        return function (t) { return 0.5; }
    } else {
        return function (t) {
            return 1 / (m.max - m.min) * t - m.min / (m.max - m.min);
        };
    }
}