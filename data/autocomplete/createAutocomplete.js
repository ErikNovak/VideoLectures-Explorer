/**
﻿ * Creates the files used for input autocompletion.
 */

var qm = require('../../../../qminer');
var fs = require('fs');

console.log('Building base...');
var base = new qm.Base({
    mode:   'openReadOnly',
    dbPath: '../database/lectures/'
});

console.log('Preparing writing files...');
// initialize the autocompletion files
var authorsFs       = fs.createWriteStream('authors.aut', 'utf8');
var categoriesFs    = fs.createWriteStream('categories.aut', 'utf8');
var languagesFs     = fs.createWriteStream('languages.aut', 'utf8');
var citiesFs        = fs.createWriteStream('cities.aut', 'utf8');
var typesFs         = fs.createWriteStream('types.aut', 'utf8');
var countriesFs     = fs.createWriteStream('countries.aut', 'utf8');
var organizationsFs = fs.createWriteStream('organizations.aut', 'utf8');

// write authors in the data
console.log('Writing authors...');
var authors = base.store("Authors").allRecords;
for (var AuthorN = 0; AuthorN < authors.length; AuthorN++) {
    var name = authors[AuthorN].name;
    if (name && name.length != 0) {
        authorsFs.write(name + '\n');
    }
}
authorsFs.end();

// write categories in the data
console.log('Writing categories...');
var categories = base.store("Categories").allRecords;
for (var CatN = 0; CatN < categories.length; CatN++) {
    var title = categories[CatN].title;
    if (title && title.length != 0) {
        categoriesFs.write(title + '\n');
    }
}
categoriesFs.end();

// write languages in the data
console.log('Writing languages...');
var lectures  = base.store("Lectures").allRecords;
var languageHt = new qm.ht.StrIntMap();
var typeHt     = new qm.ht.StrIntMap();
for (var LectureN = 0; LectureN < lectures.length; LectureN++) {

    var language = lectures[LectureN].language;
    if (language && language.length != 0) {
        if (!languageHt.hasKey(language)) {
            languagesFs.write(language + '\n');
            languageHt.put(language, 1);
        }
    }

    var type = lectures[LectureN].type;
    if (type && type.length != 0) {
        if (!typeHt.hasKey(type)) {
            typesFs.write(type + '\n');
            typeHt.put(type, 1);
        }
    }
}
languagesFs.end();

// write categories in the data
console.log('Writing organizations...');
var organizations = base.store("Organizations").allRecords;
var cityHt = new qm.ht.StrIntMap();
var countriesHt = new qm.ht.StrIntMap();
for (var OrgN = 0; OrgN < organizations.length; OrgN++) {
    organizationsFs.write(organizations[OrgN].name + '\n');

    var city = organizations[OrgN].city.trim();
    if (city && city.length != 0) {
        if (!cityHt.hasKey(city)) {
            citiesFs.write(city + '\n');
            cityHt.put(city, 1);
        }
    }

    var country = organizations[OrgN].country.trim().toUpperCase();
    if (country && country.length != 0) {
        if (!countriesHt.hasKey(country)) {
            countriesFs.write(country + '\n');
            countriesHt.put(country, 1);
        }
    }
}
organizationsFs.end();
citiesFs.end();
countriesFs.end();

console.log('Finished');
base.close();
