/**
 * Contains the functions used for searching and smooth 
 * animation transitions.
 */

/**
 * Toggle the visibility of the advance options.
 */ 
var toggleOptions = function () {
    $("#advance-options").slideToggle("slow");
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
window.onload = function () {
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
                $('.dropdown > ul').append('<li><a href="#">' + languages[langN].name.toUpperCase() + '</a></li>');
            }
            
            /**
             * Changes the selected language.
             */ 
            $(function () {
                $('.dropdown-menu > li').on('click', function () {
                    $('#language_search').html($(this).text() + ' <span class="caret"></span>');
                });
            });

        }
    });
}