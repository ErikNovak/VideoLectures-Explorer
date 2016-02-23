/**
 * Contains the js scripts for the index.html page. 
 * 
 */
var wait = new waitAnimation({ containerName: "#wait-content" });
var search = function (callFunction) {
    
    // the arrays containing the keywords of different type
    var author = [],
        organization = [],
        categories = [];
    
    // get and sort the input values of the basic search window
    var basic = $('#basic_search').tagsinput('items');
    for (var basicN = 0; basicN < basic.length; basicN++) {
        var tag = basic[basicN];
        if (tag.type == 'author') { author.push(tag.name) }
        else if (tag.type == 'category') { categories.push(tag.name) }
        else if (tag.type == 'organization') { organization.push(tag.name) }
        else {
            throw "Not supported tag type: " + tag.type;
        }
    }
    // add the input values of the corresponding advanced search
    author = author.concat($.map($('#author_search').tagsinput('items'), 
        function (el) { return el.name; }));
    categories = categories.concat($.map($('#category_search').tagsinput('items'), 
        function (el) { return el.name; }));
    organization = organization.concat($.map($('#organization_search').tagsinput('items'), 
        function (el) { return el.name; }));
    var language = $('#language_search').text().replace(/[\s]+/g, '').toLowerCase();
    
    var views_min = $("#views_min_search").val();
    var views_max = $("#views_max_search").val();
    // fill the search query
    var search = [];
    if (author.length != 0) {
        search.push({ type: "author", data: author });
    }
    if (categories.length != 0) {
        search.push({ type: "category", data: categories });
    }
    if (organization.length != 0) {
        search.push({ type: "organization", data: organization });
    }
    if (language != 'any') {
        search.push({ type: "language", data: language });
    }
    if (views_min != '') {
        search.push({ type: "views_min", data: views_min });
    }
    if (views_max != '') {
        search.push({ type: "views_max", data: views_max });
    }
    // call the search function
    if (search.length == 0) { return; }
    else {
        $('#landscape-content').hide();
        callFunction(search);
    }

}

/**
 * Types of search.
 */

var SLandscape = function (value) {
    // run the wait animation
    wait.displayAnimation();
    
    $.ajax({
        type: 'POST',
        url: '/vl/landscape-points',
        data: { data: value },
        success: function (pack) {
            if (pack.error != null) {
                $(".modal-body").html("<p>" + pack.error + "</p>")
                $("#error_trigger").trigger("click");
                wait.stopAnimation();
            } else {
                // shows the points on the screen
                points = pack;
                var graph = new landscapeGraph({ containerName: "#landscape-content" });
                graph.setData(pack); graph.displayLandscapeGraph();
                // shows/hides the landmarks
                landmarkShow();
                // stops the wait icon
                wait.stopAnimation();
            }
        }
    })
}

/**
 * Set the function for when the width of the screen is < 990px, 
 * remove the "About" section.
 */ 

