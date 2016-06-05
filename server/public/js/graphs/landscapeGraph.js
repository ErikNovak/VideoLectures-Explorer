/*
 * LANDSCAPE GRAPH
 * Creates the topic landscape using d3.js.
 * @param {Object} [_options] - The options for the graph construction.
 * @param {string} [_options.containerName = null] - The indetifier for the graph container.
 */
function landscapeGraph(_options) {
    // setting
    var options = $.extend({
        containerName: undefined,                                       // the dom that contains the svg element
        tooltipTextCallback: LHelperFunctions.tooltipTextCallback,      // the callback that generates the text info on the chart (defined at the end of the file)
        landmarkNumber: 400,
        margin: { top: 20, left: 20, bottom: 20, right: 20 },               
        color: { points: "#A289FE", background: "#FFFFFF", landmarks: "#06141C" }
    }, _options);
    
    var zoom = undefined;
    var xScale = undefined;
    var yScale = undefined;
    var cShadeScale = undefined;
    var cAddScale = undefined;
    var chartBody = undefined;
    
    
    /**
     * The points is a JSON object containing the data landscape and additional
     * points. The data contains the x and y coordinate of the document, created 
     * by the multidimensional scaling, and it's info.
     */
    var points = null;
    
    /**
     * Landmark coordinates, where the signs are set.
     */ 
    var landmarks = [];
    
    /*
     * Gets the landscape data.
     * @returns {object} A JSON object containing the points.
     */
    this.getPoints = function () {
        return { "points": points };
    }
    
    /*
     * Set the landscape data. 
     * @param {object} [data] - Contains the paper points (key: points) and the
     * keywords points (key: keywords).
     */
    this.setData = function (data) {
        // if data is not contained
        if (data.points == null) {
            throw "landscapeGraph.setData: must contain the .points data!";
        } else {
            // set the data and draw the graph
            points = data.points;
        }
    }
    
    /*
     * Updates the options. 
     * @param {object} [_options] - The options given for the update.
     */
    this.updateOptions = function (_options) {
        options = $.extend(options, _options);
    }
    
    
    /*
     * Displays the landscape graph.
     * Sets the SVG container for the DOM manipulation and vizualization.
     */
    this.displayLandscapeGraph = function () {
        
        // HACK: make options.containerName visible
        $(options.containerName).show();
        var totalWidth = $(options.containerName).width(),
            totalHeight = $(options.containerName).height(),
            width = totalWidth - options.margin.left - options.margin.right,
            height = totalHeight - options.margin.top - options.margin.bottom;
        
        $(options.containerName).hide();

        // remove the previous SVG contained elements
        d3.select(options.containerName + " svg").remove();
        
        // if the data is not defined
        if (points == undefined) {
            $(options.containerName).hide();
            return;
        } else {
            $(options.containerName).show();
        }
        
        // construct the zoom object
        zoom = d3.behavior.zoom();
        
        // create the SVG container
        var svg = d3.select(options.containerName)
            .append("svg")
            .attr("id", "land-container")
            .attr("width", totalWidth)
            .attr("height", totalHeight)
            .append("g")
            .attr("transform", "translate(" + options.margin.left + ", " + options.margin.top + ")")
            .call(zoom);
        
        svg.append("rect")
            .attr("fill", options.color.background)
            .attr("width", width)
            .attr("height", height);
        
        // create the border of what is shown
        svg.append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", width)
            .attr("height", height);
        
        chartBody = svg.append("g")
            .attr("clip-path", "url(#clip)");
        
        // padding: all points are in the SVG container field
        // they are not clipped in half
        var padding = { left: 30, right: 30, top: 30, bottom: 30 };
        
        // the x, y coordinate scale
        var minX, maxX, minY, maxY;
        if (points.length < 10) {
            minX = (3 * width - height) / 6 + padding.left;
            maxX = (3 * width + height) / 6 - padding.right
            minY = 2 / 3 * height - padding.bottom
            maxY = 1 / 3 * height + padding.top;
        } else {
            minX = (width - height) / 2 + padding.left;
            maxX = (width + height) / 2 - padding.right;
            minY = height - padding.bottom
            maxY = 0 + padding.top;
        }
        xScale = d3.scale.linear()
            .domain([0, 1])
            .range([minX, maxX]);
        
        // the y coordinate scale
        yScale = d3.scale.linear()
            .domain([0, 1])
            .range([minY, maxY]);
        
        // maximum number of views
        var maxView = Math.max.apply(null, $.map(points, function (rec) { return rec.views }));
        // the point size scale based on the number of views
        pScale = d3.scale.linear()
            .domain([0, maxView])
            .range([3, 10]);
        
        // zoom configurations
        zoom.x(xScale)
            .y(yScale)
            .scaleExtent([1, 5]);
        
        // redraw the graph
        this.redraw();
    }
    
    /*
     * Redraws the landscape of topics. 
     * It redraws all the data. 
     */
     this.redraw = function () {
        
        var totalWidth = $(options.containerName).width(),
            totalHeight = $(options.containerName).height(),
            width = totalWidth - options.margin.left - options.margin.right,
            height = totalHeight - options.margin.top - options.margin.bottom;
        
        // what to do when zoomed
        var onZoom = function () {
            
            // change the points position and size
            chartBody.selectAll(".point")
                .attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
            
            // change the landmark position and the visibility
            landmarkTags = chartBody.selectAll(".landmark")
                .attr("x", function (d) { return xScale(d.x) - d.width / 2; })
                .attr("y", function (d) { return yScale(d.y); });
            landmarkTags.classed("hidden", false);
            toggleLandmarks(landmarkTags[0]);
            
        }
        zoom.on("zoom", onZoom);
        
        // add the points
        var LPoints = chartBody.selectAll(".point")
                .data(points);

        LPoints.exit()
               .transition()
               .attr("r", 0)
               .remove();

        LPoints.enter().append("circle")
                .attr("class", "point")
                .attr("cx", function (d) { return xScale(d.x) })
                .attr("cy", function (d) { return yScale(d.y) })
                .attr("fill", options.color.points)
                .attr("r", 0)
                .transition().delay(500).duration(1000)
                .attr("r", function (d) { return pScale(d.views) });;
        
        // create the landmarks
        this.createLandmarks();

        /**
         * Additional functionality
         * Creates the box containing the lecture information when hovered
         * over the points.
         */ 
        chartBody.selectAll(".point")
                .on("mouseover", function (d, idx) {
                    coords = [xScale(d.x), yScale(d.y)];
                    $(this).css("fill", d3.rgb(options.color.points).brighter(1));
                    // create the tooltip with the point's information
                    if (options.tooltipTextCallback) {
                        // remove previous tooltip
                $("#landscape-tooltip").remove();
                $(options.containerName).append("<div id=\"landscape-tooltip\" class=\"notvisible\"></div>");
                var tooltipDiv = $("#landscape-tooltip");
                        tooltipDiv.html(options.tooltipTextCallback(d));
                        var x = coords[0] + options.margin.left;
                        var y = coords[1] + options.margin.top;
                        var scale = zoom.scale();
                        var xOffset = (coords[0] > ($(options.containerName).width() / 2)) ? (-tooltipDiv.outerWidth() - pScale(d.views) * scale) : pScale(d.views) * scale;
                        var yOffset = (coords[1] > ($(options.containerName).height() / 2)) ? (-tooltipDiv.outerHeight() + 60) : -60;
                        tooltipDiv.css({ left: (x + xOffset) + "px", top: (y + yOffset) + "px" })
                                .removeClass("notvisible");
                    }
                })
                .on("mouseout", function (d, idx) {
                    // hide the tooltip
                    $(this).css("fill", d3.rgb(options.color.points));
                    $("#landscape-tooltip").addClass("notvisible");
                });
    },

    this.createLandmarks = function () {
        // create the landmark points 
        // based on the number of points
        if (points.length < 50) {
            landmarks = $.map(points, function (pnt) { return { x: pnt.x, y: pnt.y } });
        } else {
            for (var landN = 0; landN < options.landmarkNumber; landN++) {
                landmarks.push({ x: Math.random(), y: Math.random() });
            }
        }

        landmarkTags = chartBody.selectAll(".landmark")
            .data(landmarks);
        landmarkTags.exit().remove();
        landmarkTags.enter().append("text")
            .attr("class", "landmark")
            .text(function (d, i) {
            // get the points, that are close to the landmark position 
            closestPoints = $.grep(points, function (point) {
                return Math.sqrt(Math.pow((xScale(d.x) - xScale(point.x)), 2) + 
                                        Math.pow((yScale(d.y) - yScale(point.y)), 2)) < 25;
            });
            if (closestPoints.length == 0) { $(this).remove(); return; }
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
            return LHelperFunctions.getTag(landmarkFrequency);
        })
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("font-family", "sans-serif")
            .each(function (d) { d.width = this.getBBox().width; })
            .attr("x", function (d) {
            return xScale(d.x) - d.width / 2;
        })
            .attr("y", function (d) {
            return yScale(d.y);
        })
            .attr('fill-opacity', 0)// for more smooth visualization
            .transition()
            .delay(1200).duration(1000)
            .attr('fill-opacity', 1);
        toggleLandmarks(landmarkTags[0]);
    }
}

/**
 * Creates the tooltip text for the Microsoft Academics data. 
 * @param {object} data - The json object containing the data of the paper.
 * @returns {string} The string for the appropriate data.
 */

LHelperFunctions = {
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
    tooltipTextCallback : function (data) {
        // the paper title
        var text = "<b>Lecture title:</b> " + data.title + "<br>";
        text += "<b>Presenter:</b> " + (data.author ? data.author : "not-found") + "<br>";
        text += "<b>Organization:</b> " + (data.organization ? data.organization : "not-found") + "<br><br>";
        // description
        if (data.description) {
            text += "<b>Description: </b>" + LHelperFunctions.getDescription(data.description) + "<br><br>";
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
        var time = LHelperFunctions.getTime(data.duration);
        text += "It was published in " + date + " and it's duration is " +
        time + ". There have been <b>" + data.views +
        "</b> views until " + LHelperFunctions.databaseDate + ". ";
        
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
     * Get the random tag from the json object containing the key: tagName
     * and value: name frequency, based on a dice roll and it's distribution.
     * @param {Object} json - Contains the key-values of the names and their 
     * frequency.
     * @returns {String} The chosen name.
     */ 
    getTag : function (json) {
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