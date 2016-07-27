/**
 * Contains the functions used for searching and smooth
 * animation transitions.
 */

/**
 * Toggle the visibility of the advance options.
 */
function toggleAdvancedOptions() {
    $("#advanced-options").slideToggle("slow");

    var toggleButton = $("#toggle-advanced-search-button");

    if (toggleButton.attr("data-open") == "close") {
        toggleButton.attr("data-open", "open");
        $("#open-close-arrow").removeClass("glyphicon-chevron-right")
                              .addClass("glyphicon-chevron-down");
    } else {
        toggleButton.attr("data-open", "close");
        $("#open-close-arrow").removeClass("glyphicon-chevron-down")
                              .addClass("glyphicon-chevron-right");
    }
}

//-------------------------------------
// Helper functions
//-------------------------------------

// Processes the found data and sends the information to div .search-info
/**
 * Fills the info container with the query information.
 * @param  {Object} obj - Query information.
 */
function searchInfo(obj) {
    // remove the previous info
    $(".info").empty();
    // add the searchwords
    var searchwords = obj.searchwords;
    if(searchwords.authors) {
        var authors = searchwords.authors.names;
        $(".presenter-info").append(authors.join(', '));
    }
    if(searchwords.categories) {
        var categories = searchwords.categories.names;
        $(".categories-info").append(categories.join(', '));
    }
    if(searchwords.organizations) {
        var organizations = searchwords.organizations;
        if (organizations.names) {
            var organizationsNames = organizations.names;
            $(".organization-info").append(organizationsNames.join(', '));
        }
        if (organizations.cities) {
            var organizationsCities = organizations.cities;
            $(".city-info").append(organizationsCities);
        }
        if (organizations.countries) {
            var organizationsCountries = organizations.countries;
            $(".country-info").append(formats.countries.abbrToFull[organizationsCountries]);
        }
    }
    if(searchwords.lectures) {
        var lectures = searchwords.lectures;
        if (lectures.language) {
            var lectureLanguage = lectures.language;
            $(".language-info").append(formats.languages.abbrToFull[lectureLanguage]);
        }
        if (lectures.views) {
            var lectureViews = lectures.views;
            if (lectureViews.min) { $(".views-info").append("min: " + lectureViews.min); }
            if (lectureViews.max) {
                var max = $(".views-info").is(":empty") ? "max: " : ", max: ";
                $(".views-info").append(max + lectureViews.max);
             }
        }
    }

    // add the additional information
    var points = obj.points;
    // categories with frequencies
    var cat   = {},
        views = 0;
    for (var lectureN = 0; lectureN < points.length; lectureN++) {
        var lecture = points[lectureN];
        // add the number of views
        views += lecture.views;
        // get the categories
        if (lecture.categories) {
            var categories = lecture.categories;
            for (catN = 0; catN < categories.length; catN++) {
                if (cat[categories[catN]]) {
                    cat[categories[catN]] += 1;
                } else {
                    cat[categories[catN]] = 1;
                }
            }
        }
    }
    $(".num-of-views-info").append(views);
    $(".num-of-lectures-info").append(points.length);
    $(".categories-frequency-info").append(utility.stringifyCategories(cat));
}

//-------------------------------------
// On document ready functions
//-------------------------------------

/**
 * Initialized at the construction point of the window.
 * It constructs the autocomplete list for the search
 * options, where the selected keyword becomes a tag.
 * Using:
 * Typeahead:            http://twitter.github.io/typeahead.js/
 * Bootstrap Tags Input: http://bootstrap-tagsinput.github.io/bootstrap-tagsinput/examples/
 */
$(window).on("load", function () {
    fillAutocomplete();
    landscapeAJAXCall('initial-landscape-points', 'GET');

    // initialize scrollbars
    $("#query-info-container").mCustomScrollbar({
        theme: "minimal-dark",
        axis:  "y"
    });

    // initialize scrollbars
    $("#lecture-info-container").mCustomScrollbar({
        theme: "minimal-dark",
        axis:  "y"
    });

});
