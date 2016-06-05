/**
 * Contains the functions used for searching and smooth 
 * animation transitions.
 */


/**
 * Contains the formats for handling search variables. 
 * 
 */ 
var SFormat = {
    LanguageAbbrFull : {
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
    LanguageFullAbbr : {
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

/**
 * Returns a sorted array of objects.
 */ 
function sortedArr(json) {
    var arr = [];
    var keys = Object.keys(json);
    for (var keyN = 0; keyN < keys.length; keyN++) {
        arr.push({ category: keys[keyN], freq: json[keys[keyN]] });
    }
    arr.sort(function (a, b) {
        if (a.freq > b.freq) { return -1; }
        if (a.freq < b.freq) { return 1; }
        return 0;
    });
    return arr;
}

/**
 * Creates a string containg the categories (frequency).
 */ 
function stringify(arr) {
    var text = "";
    for (var catN = 0; catN < arr.length; catN++) {
        var pair = arr[catN];
        text += "<a onclick='queryMe(\"" + pair.category + "\")'>" + pair.category + "</a>" + "(" + pair.freq + ")";
        if (catN != arr.length - 1) {
            text += ", ";
        }
    }
    return text;
}


function queryMe(category) {
    // remove all tags
    $("#basic-search-input").tagsinput("removeAll");
    $("#category-search-input").tagsinput("removeAll");
    $("#author-search-input").tagsinput("removeAll");
    $("#organization-search-input").tagsinput("removeAll");
    $("#views_min_search").val("");
    $("#views-max-search").val("");

    // add the tag to the main basic input
    $("#basic-search-input").tagsinput("add", { name: category, type: "category" });
    search(SLandscape);
}

/**
 * Processes the found data and sends the information to div .search-info. 
 */
function searchInfo(search) {
    // remove the previous info
    $(".info").empty();
    
    // add the search words
    var searchwords = search.searchwords;
    for (var swordN = 0; swordN < searchwords.length; swordN++) {
        var wordGroup = searchwords[swordN];
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
            case "views_min":
                $(".views-info").append("min: " + wordGroup.data);
                break;
            case "views_max":
                var max = $(".views-info").is(":empty") ? "max: " : ", max: ";
                $(".views-info").append(max + wordGroup.data);
                break;
            case "language":
                $(".language-info").append(SFormat.LanguageAbbrFull[wordGroup.data]);
                break;
            default:
                throw "Error: search type not recognized!";

        }
    }
    // add the additional information
    var points = search.points;
    // number of found lectures
    
    
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
    var sortArr = sortedArr(cat);
    $(".num-of-lectures-info").append(points.length);
    $(".categories-frequency-info").append(stringify(sortArr));
    $(".num-of-views-info").append(views);
    
    $("#query-info-container").show();
}

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
    // get the autocomplete data
    $.ajax({
        type: 'GET',
        url: '/autocomplete',
        success: function (data) {
            
            // author typeahead and tags 
            var presenters = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local: data.authors
            }); presenters.initialize();
            
            $("#author-search-input").tagsinput({
                maxTags: 1,
                itemValue: function (item) {
                    return item.name;
                },
                typeaheadjs: {
                    name: "authors",
                    displayKey: 'name',
                    source: presenters.ttAdapter()
                }
            });
            
            // category typeahead and tags 
            var categories = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local: data.categories
            }); categories.initialize();
            
            $("#category-search-input").tagsinput({
                itemValue: function (item) {
                    return item.name
                },
                typeaheadjs: {
                    name: "categories",
                    displayKey: 'name',
                    source: categories.ttAdapter()
                }
            });
            
            // organization typeahead and tags 
            var organizations = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local: data.organizations
            }); organizations.initialize();
            
            $("#organization-search-input").tagsinput({
                maxTags: 1,
                splitOn: null,
                itemValue: function (item) {
                    return item.name
                },
                typeaheadjs: {
                    name: "organizations",
                    displayKey: 'name',
                    source: organizations.ttAdapter()
                }
            });
            
            // getting the values 
            var all = [];
            for (var ValN = 0; ValN < Object.keys(data).length; ValN++) {
                all = all.concat(data[Object.keys(data)[ValN]]);
            }
            
            // basic search typeahead and tags
            var basic = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local: all
            }); basic.initialize();
            
            $('#basic-search-input').tagsinput({
                splitOn: null,
                itemValue: function (item) {
                    return item.name
                },
                typeaheadjs: {
                    name: "all",
                    displayKey: 'name',
                    highlight: true,
                    source: basic.ttAdapter()
                }
            });
            
            // filling the language search dropdown
            var languages = data.languages;
            for (var langN = 0; langN < languages.length; langN++) {
                $('.dropdown > ul').append('<li><a>' + SFormat.LanguageAbbrFull[languages[langN].name] + '</a></li>');
            }
            
            /**
             * Changes the selected language.
             */ 
            $(function () {
                $('.dropdown-menu > li').on('click', function () {
                    $('#language-search').html($(this).text() + ' <span class="caret"></span>');
                });
            });
        }
    });
});