/**
﻿ * Creates the files used for input autocompletion.
 */

var qm = require('qminer');
var fs = require('fs');

console.log('Building base...');
var base = new qm.Base({
    mode:   'openReadOnly',
    dbPath: '../database/lecturesTest/'
});

console.log('Preparing writing files...');
// initialize the autocompletion files
var authorsFs       = fs.createWriteStream('authors.aut', 'utf8');
var categoriesFs    = fs.createWriteStream('categories.aut', 'utf8');
var languagesFs     = fs.createWriteStream('languages.aut', 'utf8');
var organizationsFs = fs.createWriteStream('organizations.aut', 'utf8');

// write authors in the data
console.log('Writing authors...');
var authors = base.store("Authors").allRecords;
for (var AuthorN = 0; AuthorN < authors.length; AuthorN++) {
    authorsFs.write(authors[AuthorN].name + '\n');
}
authorsFs.end();

// write categories in the data
console.log('Writing categories...');
var categories = base.store("Categories").allRecords;
for (var CatN = 0; CatN < categories.length; CatN++) {
    categoriesFs.write(categories[CatN].title + '\n');
}
categoriesFs.end();

// write languages in the data
console.log('Writing languages...');
var lectures  = base.store("Lectures").allRecords;
var languageHt = new qm.ht.StrIntMap();
for (var LectureN = 0; LectureN < lectures.length; LectureN++) {
    var language = lectures[LectureN].language;
    if (!languageHt.hasKey(language)) {
        languagesFs.write(language + '\n');
        languageHt.put(language, 1);
    }
}
languagesFs.end();

// write categories in the data
console.log('Writing organizations...');
var organizations = base.store("Organizations").allRecords;
for (var OrgN = 0; OrgN < organizations.length; OrgN++) {
    organizationsFs.write(organizations[OrgN].name + '\n');
}
organizationsFs.end();

console.log('Finished');
base.close();
