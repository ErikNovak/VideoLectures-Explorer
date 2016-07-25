/**
 * This file contains the function(s) for input autocompletion. 
 */

/**
 * Gets the autocomplete lists and creates the autocomplete functionality
 * for the inputs.
 */
function fillAutocomplete() {
    // get the autocomplete data
    $.ajax({
        type: 'GET',
        url: 'http://localhost:6052/autocomplete',
        success: function (data) {

            // author typeahead and tags
            var presenters = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local:          data.authors
            }); presenters.initialize();

            $("#author-search-input").tagsinput({
                itemValue: function (item) {
                    return item.name;
                },
                typeaheadjs: {
                    name:       "authors",
                    displayKey: 'name',
                    source:     presenters.ttAdapter()
                }
            });

            // category typeahead and tags
            var categories = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local:          data.categories
            }); categories.initialize();

            $("#category-search-input").tagsinput({
                itemValue: function (item) {
                    return item.name
                },
                typeaheadjs: {
                    name:       "categories",
                    displayKey: 'name',
                    source:     categories.ttAdapter()
                }
            });

            // organization typeahead and tags
            var organizations = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local:          data.organizations
            }); organizations.initialize();

            $("#organization-search-input").tagsinput({
                maxTags: 1,
                splitOn: null,
                itemValue: function (item) {
                    return item.name
                },
                typeaheadjs: {
                    name:       "organizations",
                    displayKey: 'name',
                    source:     organizations.ttAdapter()
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
                local:          all
            }); basic.initialize();

            $('#basic-search-input').tagsinput({
                splitOn: null,
                itemValue: function (item) {
                    return item.name
                },
                typeaheadjs: {
                    name:       "all",
                    displayKey: 'name',
                    highlight:  true,
                    source:     basic.ttAdapter()
                }
            });

            // filling the language search dropdown
            var languages = data.languages;
            for (var langN = 0; langN < languages.length; langN++) {
                $('.dropdown > ul').append('<li><a>' + formats.languages.abbrToFull[languages[langN].name] + '</a></li>');
            }

            /**
             * Changes the selected language.
             */
            $(function () {
                $('.dropdown-menu > li').on('click', function () {
                    $('#language-search-dropdown').html($(this).text() + ' <span class="caret"></span>');
                });
            });
        }
    });
}
