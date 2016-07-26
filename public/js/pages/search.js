/**
 * Makes an AJAX call to get the landscape points.
 * @param  {string} callPath - The path from which it requsts the data.
 * @param  {string} callType - Call type.
 * @param  {Object} value    - The structure for querying data.
 * @return {Object} The lecture data.
 */
function landscapeAJAXCall(callPath, callType, value) {
    // run the wait animation
    $("#wait-container").css("height", $("#landscape-body-container").height());
    wait.displayAnimation();

    $.ajax({
        type: callType,
        url: 'http://localhost:6052/' + callPath,
        data: { data: value },
        success: function (res) {
            // if there is no query
            if (res.error != null) {
                $("#error-trigger").trigger("click");
            } else {
                searchInfo(res);
                landscape.setData(res);
                landmarkClass.toggleLandmarks();
            }
            // stop the wait animation
            wait.stopAnimation();
        }
    });
}

/**
 * Queries the category.
 * @param  {string} category - The category to be queried for.
 */
function queryCategory(category) {
    // remove all tags
    $("#basic-search-input").tagsinput("removeAll");
    $("#author-search-input").tagsinput("removeAll");
    $("#category-search-input").tagsinput("removeAll");
    $("#organization-search-input").tagsinput("removeAll");
    $("#city-search-input").tagsinput("removeAll");
    $("#country-search-input").tagsinput("removeAll");
    $("#views-min-search").val("");
    $("#views-max-search").val("");

    // add the tag to the main basic input
    $("#basic-search-input").tagsinput("add", { name: category, type: "category" });
    search();
}

//-------------------------------------
// Search query functions
//-------------------------------------

/**
 * Queries the data from the inputs.
 */
function search() {
    // the arrays containing the keywords of different type
    var author       = [],
        organization = [],
        categories   = [];

    // get and sort the input values of the basic search window
    var basic = $('#basic-search-input').tagsinput('items');

    for (var tagN = 0; tagN < basic.length; tagN++) {
        var tag = basic[tagN];
        if (tag.type == 'author') {
            author.push(tag.name);
        } else if (tag.type == 'category') {
            categories.push(tag.name);
        } else if (tag.type == 'organization') {
            organization.push(tag.name);
        } else {
            throw "Not supported tag type: " + tag.type;
        }
    }
    // add the input values of the corresponding advanced search
    author       = author.concat($.map($('#author-search-input').tagsinput('items'), function (tag) { return tag.name; }));
    categories   = categories.concat($.map($('#category-search-input').tagsinput('items'), function (tag) { return tag.name; }));
    organization = organization.concat($.map($('#organization-search-input').tagsinput('items'), function (tag) { return tag.name; }));

    var city = $('#city-search-input').tagsinput('items').map(function (tag) {
        return tag.name;
    });

    var country = $('#country-search-input').tagsinput('items').map(function (tag) {
        return formats.countries.fullToAbbr[tag.name.replace(/[\s,\-]+/g, '_')];
    });

    var language = $('#selected-language').text().replace(/[\s]+/g, '');

    var minViews = $("#views-min-search-input").val();
    var maxViews = $("#views-max-search-input").val();

    var data = {};
    // authors
    if (author.length != 0) {
        data["authors"] = {};
        data["authors"]["names"] = author;
    }
    // categories
    if (categories.length != 0) {
        data["categories"] = {};
        data["categories"]["names"] = categories;
    }
    // organization
    if (organization.length != 0) {
        data["organizations"] = {};
        data["organizations"]["names"] = organization;
    }
    // city
    if (city.length != 0) {
        if (!data["organizations"]) {
            data["organizations"] = {};
        }
        data["organizations"]["cities"] = city;
    }
    // country
    if (country.length != 0) {
        if (!data["organizations"]) {
            data["organizations"] = {};
        }
        data["organizations"]["countries"] = country;
    }
    // language
    if (language != 'All') {
        data["lectures"] = {};
        data["lectures"]["language"] = formats.languages.fullToAbbr[language];
    }
    // min views
    if (minViews != '') {
        if (!data["lectures"]) data["lectures"] = {};
        data["lectures"]["views"] = {};
        data["lectures"]["views"]["min"] = minViews;
    }
    // max views
    if (maxViews != '') {
        if (!data["lectures"]) {
            data["lectures"] = {};
        }
        if (!data["lectures"]["views"]) {
            data["lectures"]["views"] = {};
        }
        data["lectures"]["views"]["max"] = maxViews;
    }
    // call the search function
    if ($.isEmptyObject(data)) { return; }
    else {
        landscapeAJAXCall('landscape-points', 'POST', data);
    }
}
