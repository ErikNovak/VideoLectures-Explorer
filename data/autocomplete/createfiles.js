/**
 * Creates the .json file of authors that are in the 
 * database. Used in the author autocomplete search
 * bar.
 */ 

var qm = require('qminer');

// prepare the files
var data = qm.fs.openRead('../database/videolectures-20160216.csv');
var authors = qm.fs.openWrite('./authors.txt');
var organizations = qm.fs.openWrite('./organizations.txt');
var categories = qm.fs.openWrite('./categories.txt');
var languages = qm.fs.openWrite('./languages.txt');

var auto = new qm.ht.StrIntMap(), 
    org = new qm.ht.StrIntMap(), 
    categ = new qm.ht.StrIntMap(),
    lang = new qm.ht.StrIntMap();

// read the first line (column names)
data.readLine();

while (!data.eof) {
    var lecture = data.readLine().split(';');
    // check for the author
    var author = lecture[3];
    if (!auto.hasKey(author)) {
        authors.writeLine(author);
        auto.put(author, 1);
    }
    
    // check for the organization
    if (lecture[5] != '') {
        var organization = lecture[5];
        if (!org.hasKey(organization)) {
            organizations.writeLine(organization);
            org.put(organization, 1);
        }
    }
    
    // check for the language
    if (lecture[6] != '') {
        var language = lecture[6];
        if (!lang.hasKey(language)) {
            languages.writeLine(language);
            lang.put(language, 1);
        }
    }

    // check for the category
    if (lecture[10] != '') {
        var topics = lecture[10].replace(/[_]+/g, ' ');
        topics = topics.split(/[,;\/]/g);
        for (t = 0; t < topics.length; t++) {
            if (!categ.hasKey(topics[t])) {
                categories.writeLine(topics[t]);
                categ.put(topics[t], 1);
            }
        }
    }
}

// close the write files
authors.close();
organizations.close();
categories.close();
languages.close();