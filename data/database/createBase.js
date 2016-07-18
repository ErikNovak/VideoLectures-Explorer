/**
 * Creates the database containing the videolectures dataset.
 * It takes the data stored in rawdata.
 * Schema is defined in the schema.json file.
 */

var fs = require('fs');
var qm = require('qminer');

console.log('Reading raw files...');
// get all the raw data
// these are arrays
var authors       = JSON.parse(fs.readFileSync('rawdata/authors.json', 'utf8'));
var lectures      = JSON.parse(fs.readFileSync('rawdata/lectures.json', 'utf8'));
var organizations = JSON.parse(fs.readFileSync('rawdata/organizations.json', 'utf8'));

// these are json objects
// TODO: when API allows, use API to get the data
var categories = JSON.parse(fs.readFileSync('rawdata/categories.json', 'utf8'))[0];
var edges      = JSON.parse(fs.readFileSync('rawdata/edges.json', 'utf8'))[0];

console.log('Files read');

// base construction
var base = new qm.Base({
    mode:       "createClean",
    schemaPath: "schema.json",
    dbPath:     "lecturesTest/"
});

// 1. import organizations
console.log('Importing organizations...');
for (var OrgN = 0; OrgN < organizations.length; OrgN++) {
    var organization = organizations[OrgN];
    var record = {
        "index":   organization.id.toString(),
        "name":    organization.name,
        "city":    organization.city    != "" ? organization.city    : null,
        "country": organization.country != "" ? organization.country : null
    };
    base.store('Organizations').push(record);
}
console.log('Organizations imported');
console.log("Number of organizations", base.store('Organizations').length);

// 2. import categories
console.log('Import categories...');
var categoryKeys = Object.keys(categories);
for (var CatN = 0; CatN < categoryKeys.length; CatN++) {
    var catKey   = categoryKeys[CatN];
    var category = categories[catKey];

    var record = {
        "index":       catKey.slice(1),
        "title":       category.text.title,
        "path":        category.url.split('/'),
        "wiki":        category.refs      ? category.refs.wiki : null,
        "description": category.text.desc ? category.text.desc : null
    }
    base.store('Categories').push(record);
}
console.log('Categories imported');
console.log("Number of categories", base.store('Categories').length);

// 3. add categories parent join
console.log('Adding joins to categories...');
for (var CatN = 0; CatN < categoryKeys.length; CatN++) {
    var catKey   = categoryKeys[CatN];
    var category = categories[catKey];

    var recId    = catKey.slice(1);

    if (category.edges && base.store('Categories').recordByName(recId)) {
        var joinId = category.edges.parent.slice(1);
        base.store('Categories').recordByName(recId).$addJoin('parent',
            base.store('Categories').recordByName(joinId)
        );
    }
}
console.log('Finished adding joins to categories');

// 3. import authors
console.log('Importing Authors...');
for(var AutN = 0; AutN < authors.length; AutN++) {
    var author = authors[AutN];
    var record = {
        "index":  author.id.toString(),
        "name":   author.name,
        "title":  author.title  != '' ? author.title  : null,
        "gender": author.gender != '' ? author.gender : null,
        "slug":   author.slug   != '' ? author.slug   : null,
    }
    base.store('Authors').push(record);

    var orgRef = author.organization;
    if (orgRef && base.store('Organizations').recordByName(orgRef.id.toString())) {
        base.store('Authors').recordByName(author.name).$addJoin('worksAt',
            base.store('Organizations').recordByName(orgRef.id.toString())
        );
    }
}
console.log('Authors imported');
console.log('Number of authors', base.store('Authors').length);

// 4. import lectures
console.log('Import Lectures...');
for(var LectN = 0; LectN < lectures.length; LectN++) {
    var lecture = lectures[LectN];
    var time    = Date.parse(lecture.time) > 0 ? lecture.time.slice(0, 19) : null;
    var record = {
        "index":       lecture.id.toString(),
        "slug":        lecture.slug,
        "recorded":    time,
        "type":        lecture.type,
        "title":       lecture.title,
        "description": lecture.description != '' ? lecture.description : null,
        "language":    lecture.language,
        "duration":    lecture.duration,
        "views":       lecture.view_ctr
    }
    base.store('Lectures').push(record);

    // join the presenters
    var presenters = lecture.authors;
    if (presenters) {
        for (var PresN = 0; PresN < presenters.length; PresN++) {
            var presenter = presenters[PresN];
            if (base.store('Authors').recordByName(presenter)) {
                base.store('Lectures').recordByName(lecture.id.toString()).$addJoin(
                    'presenters', base.store('Authors').recordByName(presenter)
                )
            }
        }
    }
}
console.log('Lectures imported');
console.log('Number of lectures', base.store('Lectures').length);

// 5. add lectures categories join
console.log('Joining Categories and Lectures...');
var edgeKeys = Object.keys(edges);
for (var EdgeN = 0; EdgeN < edgeKeys.length; EdgeN++) {
    var edgeKey = edgeKeys[EdgeN];
    var lecture = edges[edgeKey];

    var lectureId = edgeKey.slice(1);

    if (lecture.categories && base.store('Lectures').recordByName(lectureId)) {
        var lectCategoryKeys = Object.keys(lecture.categories);
        for (var CatN = 0; CatN < lectCategoryKeys.length; CatN++) {
            var catId = lectCategoryKeys[CatN].slice(1);
            if (base.store('Categories').recordByName(catId)) {
                base.store('Lectures').recordByName(lectureId).$addJoin('categories',
                    base.store('Categories').recordByName(catId)
                );
            }
        }
    }
}
console.log('Finished Joining Categories and Lectures');

// 6. add lectures hasParent join
console.log('Adding Lectures parent Join...');
for(var LectN = 0; LectN < lectures.length; LectN++) {
    var lecture = lectures[LectN];

    // join the presenters
    if (lecture.parent) {
        var parentId = lecture.parent.id.toString();
        if (base.store('Lectures').recordByName(parentId)) {
            base.store('Lectures').recordByName(lecture.id.toString()).$addJoin(
                'parent', base.store('Lectures').recordByName(parentId)
            )
        }
    }
}
console.log('Finished Joining parent Lectures');
base.close();
