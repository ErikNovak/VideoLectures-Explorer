/**
 * Contains the js scripts for the index.html page. 
 * 
 */


function search(callFunction) {
    
    // the arrays containing the keywords of different type
    var author = [],
        organization = [],
        categories = [];
    
    // get and sort the input values of the basic search window
    var basic = $('#basic-search-input').tagsinput('items');
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
    author = author.concat($.map($('#author-search-input').tagsinput('items'), 
        function (el) { return el.name; }));
    categories = categories.concat($.map($('#category-search-input').tagsinput('items'), 
        function (el) { return el.name; }));
    organization = organization.concat($.map($('#organization-search-input').tagsinput('items'), 
        function (el) { return el.name; }));
    var language = $('#language-search-dropdown').text().replace(/[\s]+/g, '');
    
    var minViews = $("#views-min-search-input").val();
    var maxViews = $("#views-max-search-input").val();
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
    if (language != 'all') {
        search.push({ type: "language", data: SFormat.LanguageFullAbbr[language] });
    }
    if (minViews != '') {
        search.push({ type: "views_min", data: minViews });
    }
    if (maxViews != '') {
        search.push({ type: "views_max", data: maxViews });
    }
    // call the search function
    if (search.length == 0) { return; }
    else {
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
        url: '/landscape-points',
        data: { data: value },
        success: function (response) {
            // if there is no query
            if (response.error != null) {
                $("#error_trigger").trigger("click");
            } else {
                // fill the info
                searchInfo(response);
                // shows the points on the screen
                landscape.setData(response);
                // shows/hides the landmarks
                $(".landscape-container").show();
                $(".graph-options").show(); toggleLandmarks();
                // stops the wait icon
            }
            wait.stopAnimation();
        }
    })
}

/**
 * 
 */ 
