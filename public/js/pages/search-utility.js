/**
 * Contains the functions used for searching and smooth 
 * animation transitions.
 */


/**
 * Contains the formats for handling search variables. 
 * 
 */ 
var languageFormat = {
    abbrToFull : {
        sl: "slovene",
        en: "english",
        de: "german",
        fr: "french",
        sr: "serbian",
        hr: "croatian",
        uk: "ukrainian",
        es: "spanish",
        it: "italian",
        bs: "bosnian",
        nl: "dutch",
        pl: "polish",
        ru: "russian",
        tr: "turkish"
    },
    fullToAbbr : {
        slovene: "sl",
        english: "en",
        german: "de",
        french: "fr",
        serbian: "sr",
        croatian: "hr",
        ukrainian: "uk",
        spanish: "es",
        italian: "it",
        bosnian: "bs",
        dutch: "nl",
        polish: "pl",
        russian: "ru",
        turkish: "tr"
    }
}


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


/**
 * Returns a sorted array of objects.
 */ 
function sortedArray(json) {
    var array = [];
    var keys = Object.keys(json);
    for (var keyN = 0; keyN < keys.length; keyN++) {
        array.push({ category: keys[keyN], freq: json[keys[keyN]] });
    }
    array.sort(function (a, b) {
        return b.freq - a.freq;
    });
    return array;
}

/**
 * Creates a string containing the categories and their frequency.
 */ 
function stringify(array) {
    var text = "";
    for (var catN = 0; catN < array.length; catN++) {
        var pair = array[catN];
        text += "<a onclick='queryCategory(\"" + pair.category + "\")'>" + pair.category + "</a>" + "(" + pair.freq + ")";
        if (catN != array.length - 1) {
            text += ", ";
        }
    }
    return text;
}


function queryCategory(category) {
    // remove all tags
    $("#basic-search-input").tagsinput("removeAll");
    $("#category-search-input").tagsinput("removeAll");
    $("#author-search-input").tagsinput("removeAll");
    $("#organization-search-input").tagsinput("removeAll");
    $("#views_min_search").val("");
    $("#views-max-search").val("");

    // add the tag to the main basic input
    $("#basic-search-input").tagsinput("add", { name: category, type: "category" });
    search(fillLandscape);
}



//-------------------------------------
// Search query functions
//-------------------------------------

function search(callback) {
    
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

    var language = $('#language-search-dropdown').text().replace(/[\s]+/g, '');
    
    var minViews = $("#views-min-search-input").val();
    var maxViews = $("#views-max-search-input").val();

    // prepare the query options
    var search = [];
    // authors
    if (author.length != 0) {
        search.push({
            type: "author", 
            data: author
        });
    }
    // categories
    if (categories.length != 0) {
        search.push({
            type: "category", 
            data: categories
        });
    }
    // organization
    if (organization.length != 0) {
        search.push({
            type: "organization", 
            data: organization
        });
    }
    // language
    if (language != 'all') {
        search.push({
            type: "language", 
            data: languageFormat.fullToAbbr[language]
        });
    }
    // min views
    if (minViews != '') {
        search.push({
            type: "views-min", 
            data: minViews
        });
    }
    // max views
    if (maxViews != '') {
        search.push({
            type: "views-max", 
            data: maxViews
        });
    }
    // call the search function
    if (search.length == 0) { return; }
    else {
        callback(search);
    }

}

/**
 * Fill the landscape.
 */
function fillLandscape(value) {
    // run the wait animation
    wait.displayAnimation();
    
    $.ajax({
        type: 'POST',
        url: '/landscape-points',
        data: { data: value },
        success: function (responseData) {
            // if there is no query
            if (responseData.error != null) {
                $("#error-trigger").trigger("click");
            } else {
                searchInfo(responseData);
                landscape.setData(responseData);
                landmarkClass.toggleLandmarks();
            }
            // stop the wait animation
            wait.stopAnimation();
        }
    });
}

// Processes the found data and sends the information to div .search-info
function searchInfo(search) {
    // remove the previous info
    $(".info").empty();
    
    // add the search words
    var searchwords = search.searchwords;
    for (var wordN = 0; wordN < searchwords.length; wordN++) {
        var wordGroup = searchwords[wordN];
        // fill the correct info field
        switch (wordGroup.type) {
            case "author":
                $(".presenter-info").append(wordGroup.data.join(', '));
                break;
            case "organization":
                $(".organization-info").append(wordGroup.data.join(', '));
                break;
            case "category":
                $(".categories-info").append(wordGroup.data.join(', '));
                break;
            case "views-min":
                $(".views-info").append("min: " + wordGroup.data);
                break;
            case "views-max":
                var max = $(".views-info").is(":empty") ? "max: " : ", max: ";
                $(".views-info").append(max + wordGroup.data);
                break;
            case "language":
                $(".language-info").append(languageFormat.abbrToFull[wordGroup.data]);
                break;
            default:
                throw "Error: search type not recognized!";

        }
    }
    // add the additional information
    var points = search.points;
    // categories with frequencies
    var cat = {}, views = 0;
    for (var lectureN = 0; lectureN < points.length; lectureN++) {
        var lecture = points[lectureN];
        // add the number of views
        views += lecture.views;
        // get the categories
        if (lecture.categories) {
            var categories = lecture.categories.split(/,[ ]*/g);
            for (catN = 0; catN < categories.length; catN++) {
                if (cat[categories[catN]]) {
                    cat[categories[catN]] += 1;
                } else {
                    cat[categories[catN]] = 1;
                }
            }
        }
    }
    var sortArr = sortedArray(cat);
    $(".num-of-lectures-info").append(points.length);
    $(".categories-frequency-info").append(stringify(sortArr));
    $(".num-of-views-info").append(views);
}

//-------------------------------------
// On document ready functions
//-------------------------------------

/**
 * Initialized at the construction point of the window. 
 * It constructs the autocomplete list for the search 
 * options, where the selected keyword becomes a tag.
 * Using:
 * Typeahead: http://twitter.github.io/typeahead.js/
 * Bootstrap Tags Input: http://bootstrap-tagsinput.github.io/bootstrap-tagsinput/examples/
 * 
 */
$(document).ready(function () {
    fillAutocomplete();
    initialSearch();
});