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
        url: '/api/getAutocomplete',
        success: function (data) {
            data = JSON.parse(data);
            // author typeahead and tags
            var presenters = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local: data.authors
            }); presenters.initialize();

            $("#author-search-input").tagsinput({
                freeInput: false,
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
                local: data.categories
            }); categories.initialize();

            $("#category-search-input").tagsinput({
                freeInput: false,
                itemValue: function (item) {
                    return item.name;
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
                local: data.organizations
            }); organizations.initialize();

            $("#organization-search-input").tagsinput({
                maxTags: 1,
                splitOn: null,
                freeInput: false,
                itemValue: function (item) {
                    return item.name;
                },
                typeaheadjs: {
                    name:       "organizations",
                    displayKey: 'name',
                    source:     organizations.ttAdapter()
                }
            });

            // cities typeahead and tags
            var cities = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local: data.cities
            }); cities.initialize();

            $("#city-search-input").tagsinput({
                maxTags: 1,
                splitOn: null,
                freeInput: false,
                itemValue: function (item) {
                    return item.name;
                },
                typeaheadjs: {
                    name:       "cities",
                    displayKey: 'name',
                    source:     cities.ttAdapter()
                }
            });

            // countries typeahead and tags
            var countries = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local: $.map(data.countries, function (country) {
                        return {
                            type: 'country',
                            name: formats.countries.abbrToFull[country.name]
                        };
                    })
            }); countries.initialize();

            $("#country-search-input").tagsinput({
                maxTags: 1,
                splitOn: null,
                freeInput: false,
                itemValue: function (item) {
                    return item.name;
                },
                typeaheadjs: {
                    name:       "country",
                    displayKey: 'name',
                    source:     countries.ttAdapter()
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
                freeInput: false,
                itemValue: function (item) {
                    return item.name;
                },
                typeaheadjs: {
                    name:       "all",
                    displayKey: 'name',
                    highlight:  true,
                    source:     basic.ttAdapter()
                }
            });

            // esthetics hack
            $("#basic-search").css("top", "-12px");

            // filling the language search dropdown
            var languages = data.languages;
            for (var langN = 0; langN < languages.length; langN++) {
                $('#language-dropdown').append('<li><a>' + formats.languages.abbrToFull[languages[langN].name] + '</a></li>');
            }
            /**
             * Changes the selected language.
             */
            $(function () {
                $('#language-dropdown > li').on('click', function () {
                    $('#selected-language').html($(this).text());
                });
            });
        }
    });
}
