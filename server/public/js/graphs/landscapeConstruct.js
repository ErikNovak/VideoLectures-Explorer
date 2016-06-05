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
     * Creates a string of the data info.
     * @param {object} data - The object containing the info of the lecture.
     * @returns {string} The html string containing the info of the data. It
     * is used for the toolbox info, when hovering over a point.
     */ 
    CreateText : function (data) {
        // the paper title
        var text = "<b>Lecture title:</b> " + data.title + "<br>";
        text += "<b>Presenter:</b> " + (data.author ? data.author : "not-found") + "<br>";
        text += "<b>Organization:</b> " + (data.organization ? data.organization : "not-found") + "<br><br>";
        // description
        if (data.description) {
            text += "<b>Description: </b>" + tooltipClass.getDescription(data.description) + "<br><br>";
        }
        
        // lecture language
        text += "The lecture is in " + SFormat.LanguageAbbrFull[data.language] + ". ";
        // category
        if (data.categories) {
            var num = data.categories.indexOf(',') == -1;
            var category_ies = num ? "category" : "categories";
            var was_re = num ? "was" : "were";
            text += "The main " + category_ies + " of the lecture " + was_re + " <b>" + data.categories + "</b>. ";
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
        var time = '', miliseconds = parseInt(duration);
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
        var getDot = str.indexOf('.', 200);
        var desc = getDot != -1 ? str.substr(0, getDot + 1) + ' ...' : str;
        return desc;
    }
}

//-------------------------------------
// Landmark class
//-------------------------------------
var landmarkClass = {
    numberOfLandmarks: 400,

    setText: function (points) {
        // get the frequency of the categories
        var landmarkFrequency = {};
        for (var MatN = 0; MatN < closestPoints.length; MatN++) {
            if (!closestPoints[MatN].categories) { continue; }
            var categories = closestPoints[MatN].categories.split(/,[ ]*/g);
            for (var KeyN = 0; KeyN < categories.length; KeyN++) {
                if (landmarkFrequency[categories[KeyN]] != null) {
                    landmarkFrequency[categories[KeyN]] += 1;
                } else {
                    landmarkFrequency[categories[KeyN]] = 1;
                }
            }
        }
        if (Object.keys(landmarkFrequency).length == 0) {
            return;
        }
        return landmarkClass.getName(landmarkFrequency);
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
        var jsonArr = [];
        for (key in json) {
            jsonArr.push([key, json[key]]);
        }
        jsonArr.sort(function (a, b) { return b[1] - a[1]; });
        // get the distribution of the values
        var distribution = [0, jsonArr[0][1]]; // add the biggest value
        for (var i = 1; i < jsonArr.length; i++) {
            distribution.push(distribution[i] + jsonArr[i][1]);
        }
        var diceRoll = Math.floor(Math.random() * distribution[distribution.length - 1]);
        for (var n = 0; n < distribution.length - 1; n++) {
            if (distribution[n] <= diceRoll && diceRoll < distribution[n + 1]) {
                return jsonArr[n][0];
            }
        }
    }
}

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

