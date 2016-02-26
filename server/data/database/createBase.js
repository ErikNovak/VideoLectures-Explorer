/**
 * Creates the base containing the videolectures dataset. 
 * It takes the data from the videolectures .csv file and creates the base.
 * Schema is defined in the schema.json file.
 **/

var qm = require('qminer');
var fs = qm.fs;

// csv file 
var lectures = new fs.FIn('videolectures-20160216.csv');

// the base
var base = new qm.Base({
    mode:       "createClean",
    schemaPath: "schema.json",
    dbPath:     "lectures/"
})

// the first line is skipped, it contains the column names
lectures.readLine();

// import the lectures in the base
console.log("Storing data in the base...");
var lCounter = 0;
while (!lectures.eof) {
    var lecture = lectures.readLine().split(';');
    var index        = lecture[1];
    var title        = lecture[2];
    var author       = lecture[3];
    var gender       = lecture[4];
    var organization = lecture[5] != '' ? lecture[5] : null;
    var language     = lecture[6] != '' ? lecture[6] : null;
    var published    = lecture[7] != '' ? lecture[7] + "T00:00:00" : null;
    
    var duration = null;
    if (lecture[8] != '') {
        var digital = lecture[8].split(':');
        // set duration
        duration = 0;
        for (var h = 0; h < digital.length; h++) {
            duration += parseInt(digital[h]) * Math.pow(60, digital.length - h - 1) * 1000;
        }
    }
    
    var views = lecture[9] != '' ? parseInt(lecture[9]) : null;

    var categories = null;
    if (lecture[10] != '') {
        var topics = lecture[10].replace(/[_]+/g, ' ').split(/[,;\/]+/g);
        // create an array
        categories = [];
        for (t = 0; t < topics.length; t++) {
            if (categories.indexOf(topics[t]) == -1) {
                categories.push(topics[t]);
            }
        }
    }
    
    var keywords    = lecture[11] != '' ? lecture[11] : null;
    var description = lecture[12] != '' ? lecture[12] : null;
    
    base.store("Lectures").push({
        "index"         : index,
        "title"         : title,
        "author"        : author,
        "gender"        : gender,
        "organization"  : organization,
        "language"      : language,
        "published"     : published,
        "duration"      : duration,
        "views"         : views,
        "categories"    : categories,
        "keywords"      : keywords,
        "description"   : description
    });

    lCounter++;
}
console.log("Imported " + lCounter + " lectures!");
base.close();