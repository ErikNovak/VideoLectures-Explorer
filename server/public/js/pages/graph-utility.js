/**
 * Contains the functions used for graph element 
 * manipulation.
 */

/**
 * Sets the visibility of the landmark tags. If two are covering
 * each other, the younger one is hidden.    
 * @param {object} _tags - The landmark tags. 
 */ 
var tagsVisibility = function (_tags) {
    // create additional cluster border control
    var additionalBorder = 10;
    // saves the visible clusters
    var visibleClusters = [];
    // get the DOMs and go through them
    var DOMs = _tags;
    for (var ClusN = 0; ClusN < DOMs.length; ClusN++) {
        var currentClust = DOMs[ClusN];
        var currentBox = currentClust.getBBox();
        for (var i = 0; i < visibleClusters.length; i++) {
            var visibleBox = visibleClusters[i].getBBox();
            // if the bounding boxes cover each other
            if (Math.abs(currentBox.x - visibleBox.x) - additionalBorder <= Math.max(currentBox.width, visibleBox.width) && 
                        Math.abs(currentBox.y - visibleBox.y) - additionalBorder <= Math.max(currentBox.height, visibleBox.height)) {
                $(currentClust).attr("class", $(currentClust).attr("class") + " hidden");
                break;
            }
        }
        // otherwise the cluster is visible
        visibleClusters.push(currentClust);
    }
}


/**
 * Shows/hides the landmarks on the landscape.
 */ 
var toggleLandmarks = function () {
    var tick = $("#landmarks-check").is(':checked');
    var landmark = d3.selectAll(".landmark");
    if (!tick) {
        landmark.classed('hidden', true);
    } else {
        landmark.classed('hidden', false);
        tagsVisibility(landmark[0]);
    }
}

/**
 * Adds the functionality of the landscape tickbox 
 */ 
$("#landmarks-check").on('click', toggleLandmarks);