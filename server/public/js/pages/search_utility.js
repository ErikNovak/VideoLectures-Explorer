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
        slovene:    "sl",
        english:    "en",
        german:     "de",
        french:     "fr",
        serbian:    "sr",
        croatian:   "hr",
        ukrainian:  "uk",
        spanish:    "es",
        italian:    "it",
        bosnian:    "bs",
        dutch:      "nl",
        polish:     "pl",
        russian:    "ru",
        turkish:    "tr"
    }
}


/**
 * Toggle the visibility of the advance options.
 */ 
var toggleOptions = function () {
    $("#advance-options").slideToggle("slow");
    toggle_button = $("#advance-search-button");
    if (toggle_button.attr("data-open") == "close") {
        $("#search-chevron").removeClass("glyphicon glyphicon-chevron-right")
                            .addClass("glyphicon glyphicon-chevron-down");
        toggle_button.attr("data-open", "open");
    } else {
        $("#search-chevron").removeClass("glyphicon glyphicon-chevron-down")
                            .addClass("glyphicon glyphicon-chevron-right");
        toggle_button.attr("data-open", "close");
    }
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
        url: '/vl/autocomplete',
        success: function (data) {
            
            // author typeahead and tags 
            var authors = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local: data.authors
            }); authors.initialize();
            
            $("#author_search").tagsinput({
                maxTags: 1,
                itemValue: function (item) {
                    return item.name;
                },
                typeaheadjs: {
                    name: "authors",
                    displayKey: 'name',
                    source: authors.ttAdapter()
                }
            });
            
            // category typeahead and tags 
            var categories = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local: data.categories
            }); categories.initialize();
            
            $("#category_search").tagsinput({
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
            
            $("#organization_search").tagsinput({
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
            
            $('#basic_search').tagsinput({
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
                $('.dropdown > ul').append('<li><a href="#">' + SFormat.LanguageAbbrFull[languages[langN].name] + '</a></li>');
            }
            
            /**
             * Changes the selected language.
             */ 
            $(function () {
                $('.dropdown-menu > li').on('click', function () {
                    $('#language_search').html($(this).text() + ' <span class="caret"></span>');
                });
            });
            $("#span-basic-search").css("position", "relative")
                                    .css("top", "-12px");
        }
    });
});