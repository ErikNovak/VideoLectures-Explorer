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
    databaseDate : "16.02.2016",

    /**
     * Creates a string from the point information.
     * @param {object} data - The point object containing the info of the lecture.
     * @returns {string} The html string containing the info of the data. It
     * is used for the toolbox info, when hovering over a point.
     */ 
    CreateText : function (data) {
        var title = data.title;
        var author = data.author ? data.author : "not-found";
        var organization = data.organization ? data.organization : "not-found";

        var text = "<b>Lecture title:</b> " + title + "<br>";
        text += "<b>Presenter:</b> " + author + "<br>";
        text += "<b>Organization:</b> " + organization + "<br><br>";
        
        if (data.description) {
            var description = tooltipClass.getDescription(data.description);
            text += "<b>Description: </b>" + description + "<br><br>";
        }
        
        // lecture language
        var language = languageFormat.abbrToFull[data.language];
        text += "The lecture is in " + language + ". ";
        // category
        if (data.categories) {
            var num = data.categories.indexOf(',') == -1;
            var categories = num ? "category" : "categories";
            var timeWas = num ? "was" : "were";
            text += "The main " + categories + " of the lecture " + 
                    timeWas + " <b>" + data.categories + "</b>. ";
        }
        // published and duration
        var date = data.published.split('T')[0].split('-').reverse().join('.');
        var time = tooltipClass.getTime(data.duration);
        text += "It was published in " + date + " and it's duration is " +
        time + ". There have been <b>" + data.views +
        "</b> views until " + tooltipClass.databaseDate + ". ";
        
        return text;
    },

    /**
     * Converts the miliseconds to time format. 
     * @param {string} duration - The duration in miliseconds.
     * @returns {string} The representation hh:mm:ss of duration.
     */ 
    getTime: function (duration) {
        // get the duration
        var time = '', 
            miliseconds = parseInt(duration);
        // get hours
        var hours = Math.floor(miliseconds / 3600000);
        if (hours / 10 < 1) { time += '0' + hours + ':'; }
        else { time += hours + ':'; }
        miliseconds -= 3600000 * hours;
        // get minutes
        var minutes = Math.floor(miliseconds / 60000);
        if (minutes / 10 < 1) { time += '0' + minutes + ':'; }
        else { time += minutes + ':'; }
        miliseconds -= 60000 * minutes;
        // get seconds
        var seconds = miliseconds / 1000;
        if (seconds / 10 < 1) { time += '0' + seconds; }
        else { time += seconds; }
        return time;
    },

    /**
     *  Helper function for description handling.
     *  It cuts the description if it's too long. It finds the next dot 
     *  after the first 200 characters and returns everything in between.
     */ 
    getDescription : function (str) {
        var getDot = str.indexOf('.', 300);
        var desc = getDot != -1 ? str.substr(0, getDot + 1) + '...' : str;
        return desc;
    }
}

//-------------------------------------
// Landmark class
//-------------------------------------
var landmarkClass = {
    // max number of landmarks
    numberOfLandmarks: 400,
    
    /**
     * Sets the text for the landmark.
     */ 
    setText: function (points) {
        // get the frequency of the categories
        var landmarkFreq = {};
        for (var MatN = 0; MatN < points.length; MatN++) {
            if (!points[MatN].categories) { continue; }
            var categories = points[MatN].categories.split(/,[ ]*/g);
            for (var KeyN = 0; KeyN < categories.length; KeyN++) {
                if (landmarkFreq[categories[KeyN]] != null) {
                    landmarkFreq[categories[KeyN]] += 1;
                } else {
                    landmarkFreq[categories[KeyN]] = 1;
                }
            }
        }
        if (Object.keys(landmarkFreq).length == 0) {
            return;
        }
        return landmarkClass.getName(landmarkFreq);
    },
    /**
     * Get the random tag from the json object containing the key: tagName
     * and value: name frequency, based on a dice roll and it's distribution.
     * @param {Object} json - Contains the key-values of the names and their 
     * frequency.
     * @returns {String} The chosen name.
     */ 
    getName : function (json) {
        // create an array of key-values
        var ArrayOfCategories = [];
        for (key in json) {
            ArrayOfCategories.push([key, json[key]]);
        }
        ArrayOfCategories.sort(function (a, b) { return b[1] - a[1]; });
        // get the distribution of the values
        var distribution = [0, ArrayOfCategories[0][1]]; // add the biggest value
        for (var i = 1; i < ArrayOfCategories.length; i++) {
            distribution.push(distribution[i] + ArrayOfCategories[i][1]);
        }
        var diceRoll = Math.floor(Math.random() * distribution[distribution.length - 1]);
        for (var n = 0; n < distribution.length - 1; n++) {
            if (distribution[n] <= diceRoll && diceRoll < distribution[n + 1]) {
                return ArrayOfCategories[n][0];
            }
        }
    },
    
    /**
     * Shows/hides the landmarks on the landscape.
     */ 
    toggleLandmarks : function () {
        var tick = $("#landmarks-check").is(':checked');
        var landmarks = d3.selectAll(".landmark");
        if (!tick) {
            landmarks.classed('hidden', true);
        } else {
            landmarks.classed('hidden', false);
            landmarkClass.landmarksVisibility(landmarks[0]);
        }
    },

    /**
     * Sets the visibility of the landmark tags. If two are covering
     * each other, the younger one is hidden.    
     * @param {object} _tags - The landmark tags. 
     */ 
    landmarksVisibility : function (_tags) {
        // create additional cluster border control
        var addBorder = 10;
        // saves the visible clusters
        var visibles = [];
        // get the DOMs and go through them
        var DOMs = _tags;
        for (var ClustN = 0; ClustN < DOMs.length; ClustN++) {
            var currentClust = DOMs[ClustN];
            var currentBox = currentClust.getBBox();
            for (var i = 0; i < visibles.length; i++) {
                var visibleBox = visibles[i].getBBox();
                // if the bounding boxes cover each other
                if (Math.abs(currentBox.x - visibleBox.x) - addBorder <= Math.max(currentBox.width, visibleBox.width) && 
                        Math.abs(currentBox.y - visibleBox.y) - addBorder <= Math.max(currentBox.height, visibleBox.height)) {
                    $(currentClust).attr("class", $(currentClust).attr("class") + " hidden");
                    break;
                }
            }
            // otherwise the cluster is visible
            visibles.push(currentClust);
        }
    }
}

/**
 * Adds the functionality of the landscape tickbox 
 */ 
$("#landmarks-check").on('click', landmarkClass.toggleLandmarks);


//-------------------------------------
// Landscape and wait animation init
//-------------------------------------

var landscape = new landscapeGraph({
    containerName: "#landscape-graph-container",
    tooltipClass: tooltipClass,
    landmarkClass: landmarkClass
});

var wait = new waitAnimation({
    containerName: "#wait-container"
});

