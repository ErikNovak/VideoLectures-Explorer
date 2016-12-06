
/**
 * Initializes the landscape graph and the wait
 * container.
 */

//-------------------------------------
// Tooltip class
//-------------------------------------
var tooltipClass = {
    /**
     * Additional data, the date of the latest/used database.
     */
    databaseDate: "24.07.2016",

    /**
     * Creates a string from the point information.
     * @param {object} data - The point object containing the info of the lecture.
     * @returns {string} The html string containing the info of the data. It
     * is used for the toolbox info, when hovering over a point.
     */
    CreateText: function(data) {
        var title = data.title;
        var author = data.author ? data.author.join(", ") : "N/A";
        var organization = data.organization ? data.organization : "N/A";

        var text = "<b>Lecture title:</b> " + title + "<br>";
        text += "<b>Presenter:</b> " + author + "<br>";
        text += "<b>Organization:</b> " + organization + "<br><br>";

        if (data.description) {
            var description = tooltipClass.getDescription(data.description);
            text += "<b>Description: </b>" + description + "<br><br>";
        }

        // lecture language
        if (data.language) {
            var language = formats.languages.abbrToFull[data.language];
            text += "The lecture is in " + language + ". ";
        }
        // category
        if (data.categories && data.categories.length !== 0) {
            var num = data.categories.length === 1;
            var categories = num ? "category" : "categories";
            var timeWas = num ? "was" : "were";
            text += "The main " + categories + " of the lecture " +
                timeWas + " <b>" + data.categories.join(", ") + "</b>. ";
        }
        // published and duration
        if (data.published) {
            var date = data.published.split('T')[0].split('-').reverse().join('.');
            text += "It was published in " + date;
        }
        if (data.duration) {
            var time = tooltipClass.getTime(data.duration);
            text += " and it's duration is " + time;
        }
        text += ". There have been <b>" + data.views +
        "</b> views until " + tooltipClass.databaseDate + ". ";
        return text;
    },

    /**
     * Converts the miliseconds to time format.
     * @param {string} duration - The duration in miliseconds.
     * @returns {string} The representation hh:mm:ss of duration.
     */
    getTime: function(duration) {
        // get the duration
        var time = '',
            seconds = parseInt(duration);
        // get hours
        var hours = Math.floor(seconds / 3600);
        if (hours / 10 < 1) {
            time += '0' + hours + ':';
        } else {
            time += hours + ':';
        }
        seconds -= 3600 * hours;
        // get minutes
        var minutes = Math.floor(seconds / 60);
        if (minutes / 10 < 1) {
            time += '0' + minutes + ':';
        } else {
            time += minutes + ':';
        }
        seconds -= 60 * minutes;
        // get seconds
        if (seconds / 10 < 1) {
            time += '0' + seconds;
        } else {
            time += seconds;
        }
        return time;
    },

    /**
     *  Helper function for description handling.
     *  It cuts the description if it's too long. It finds the next dot
     *  after the first 200 characters and returns everything in between.
     */
    getDescription: function(str) {
        var getDot = str.indexOf('.', 300);
        var desc = getDot != -1 ? str.substr(0, getDot + 1) + '...' : str;
        return desc;
    }
};

//-------------------------------------
// Landmark class
//-------------------------------------
var landmarkClass = {
    // max number of landmarks
    numberOfLandmarks: 400,
    /**
     * Creates a tag for the landmark.
     * @param {Array.<Objects>} points - The objects representing the lectures.
     * @returns {String} The chosen name.
     */
    setText: function(points) {
        // get the frequency of the categories
        var landmarks = [];
        if (points.length === 1) {
            if (points[0].categories) {
                var categories = points[0].categories.slice(1);
                var diceRoll = Math.floor(categories.length * Math.random());
                return categories[diceRoll];
            }
        } else {
            for (var MatN = 0; MatN < points.length; MatN++) {
                if (!points[MatN].landmarkTags) {
                    continue;
                }
                var landmarkTags = points[MatN].landmarkTags;
                for (var KeyN = 0; KeyN < landmarkTags.length; KeyN++) {
                    if (landmarks[landmarkTags[KeyN][0]]) {
                        landmarks[landmarkTags[KeyN][0]] += landmarkTags[KeyN][1];
                    } else {
                        landmarks[landmarkTags[KeyN][0]] = landmarkTags[KeyN][1];
                    }
                }
            }
            if (Object.keys(landmarks).length === 0) {
                return;
            }
            // create an array of key-values
            var ArrayOfCategories = [];
            for (var key in landmarks) {
                if (landmarks[key] !== 0) {
                    ArrayOfCategories.push([key, landmarks[key]]);
                }
            }
            if (ArrayOfCategories.length === 0) {
                return "";
            } else {
                ArrayOfCategories.sort(function(a, b) {
                    return b[1] - a[1];
                });
                var upperBound = ArrayOfCategories.length >= 3 ? 3 : ArrayOfCategories.length;
                var categories = ArrayOfCategories.slice(0, 3);
                var diceRoll = Math.floor(upperBound * Math.random());
                return categories[diceRoll][0];
            }
        }
    },

    /**
     * Shows/hides the landmarks on the landscape.
     */
    toggleLandmarks: function() {
        var landmarks = d3.selectAll(".landmark");
        landmarkClass.landmarksVisibility(landmarks[0]);
    },

    /**
     * Sets the visibility of the landmark tags. If two are covering
     * each other, the younger one is hidden.
     * @param {object} _tags - The landmark tags.
     */
    landmarksVisibility: function(_tags) {
        // create additional cluster border control
        var addBorder = 10;
        // saves the visible clusters
        var visibles = [];
        // get the DOMs and go through them
        var DOMs = _tags;
        for (var ClustN = 0; ClustN < DOMs.length; ClustN++) {
            var currentClust = DOMs[ClustN];
            var currentBox = currentClust.getBoundingClientRect();
            for (var i = 0; i < visibles.length; i++) {
                var visibleBox = visibles[i].getBoundingClientRect();
                // if the bounding boxes cover each other
                if (Math.abs(currentBox.left - visibleBox.left) - addBorder <= Math.max(currentBox.width, visibleBox.width) &&
                    Math.abs(currentBox.top - visibleBox.top) - addBorder <= Math.max(currentBox.height, visibleBox.height)) {
                    $(currentClust).attr("class", $(currentClust).attr("class") + " hidden");
                    break;
                }
            }
            // otherwise the cluster is visible
            visibles.push(currentClust);
        }
    }
};

/**
 * Adds the functionality of the landscape tickbox
 */


//-------------------------------------
// Landscape and wait animation init
//-------------------------------------

var landscape = new landscapeGraph({
    containerName: '#landscape-graph-container',
    tooltipClass: tooltipClass,
    landmarkClass: landmarkClass
});

var wait = new waitAnimation({
    containerName: '#wait-container'
});
