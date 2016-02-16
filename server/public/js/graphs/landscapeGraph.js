﻿/*
 * LANDSCAPE GRAPH
 * Creates the topic landscape using d3.js.
 * 
 */
function landscapeGraph(_options) {
    // setting
    var options = $.extend({
        containerName: undefined,                                       // the dom that contains the svg element
        tooltipTextCallback: LHelperFunctions.tooltipTextCallback,      // the callback that generates the text info on the chart (defined at the end of the file)
        radius: { point: 2.5, hexagon: 8 },
        landmarkNumber: 400,
        margin: { top: 20, left: 20, bottom: 20, right: 20 },               
        color: {
            shadeLight: "#A28DE6", shadeDark: "#4724B9",  
            addShadeLight: "#FFEF6B", addShadeDark: "#FFE510",
            background: "#260788", text: "#FFFFFF"
        }
    }, _options);
    
    var zoom = undefined;
    var xScale = undefined;
    var yScale = undefined;
    var cShadeScale = undefined;
    var cAddScale = undefined;
    var chartBody = undefined;
    
    
    /**
     * The points is a JSON object containing the data landscape and additional
     * points.
     * The data contains the x and y coordinate of the document, created by
     * the multidimensional scaling, and it's info.
     */
    var points = null;
    
    /**
     * Landmark coordinates, where the signs are set.
     */ 
    var landmarks = [];
    for (var landN = 0; landN < options.landmarkNumber; landN++) {
        landmarks.push({ x: Math.random(), y: Math.random() });
    }

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
        
        var totalWidth = $(options.containerName).width(),
            totalHeight = $(options.containerName).height(),
            width = totalWidth - options.margin.left - options.margin.right,
            height = totalHeight - options.margin.top - options.margin.bottom;
        
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
        
        // the x coordinate scale
        xScale = d3.scale.linear()
            .domain([0, 1])
            .range([(width - height) / 2  + padding.left, (width + height) / 2 - padding.right]);
        
        // the y coordinate scale
        yScale = d3.scale.linear()
            .domain([0, 1])
            .range([height - padding.bottom, 0 + padding.top]);
        
        // the color scale for the shade / hexagons
        cScale = d3.scale.log()
            .domain([1, 100])
            .range([options.color.shadeDark, options.color.shadeLight])
            .interpolate(d3.interpolateLab);
   
        // zoom configurations
        zoom.x(xScale)
            .y(yScale)
            .scaleExtent([1, 10]);
        
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
            
            d3.select("#hexagons").attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
            
            // change the points position and size
            chartBody.selectAll(".points")
                 .attr("cx", function (d) { return xScale(d.x); })
                 .attr("cy", function (d) { return yScale(d.y); })
                 .attr("r", function (d) { return options.radius.point * d3.event.scale });

            // change the landmark position and the visibility
            var landmarkTags = chartBody.selectAll(".landmark")
                .attr("x", function (d) {
                    var xChange = this.getBBox().width != 0 ? this.getBBox().width / 2 : 0;
                    return xScale(d.x) - xChange;
                })
                .attr("y", function (d) {
                    var yChange = this.getBBox().height != 0 ? this.getBBox().height / 2 : 0;
                    return yScale(d.y) + yChange;
                })
            tagsVisibility(landmarkTags);
            
        }
        zoom.on("zoom", onZoom);
        
        /**
         * Hexbins are GREAT for static visualization, BUT for panning and zooming
         * they are not. Append hexbins to "g" tag in SVD. On zoom, get the "g" tag
         * and transform it. It will zoom/pan the hexagons.
         */
        var hexagons = chartBody.append("g")
                          .attr("id", "hexagons");
        // create the hexagon shade 
        var hexbin = d3.hexbin()
            .radius(options.radius.hexagon);
        
        var hexagon = hexagons.selectAll(".Hexagon")
            .data(hexbin(points.map(function (d) { return [xScale(d.x), yScale(d.y)]; })));
        
        hexagon.enter().append("path")
            .attr("class", "Hexagon")
            .attr("d", hexbin.hexagon())
            .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; })
            .style("fill", function (d) { return cScale(d.length); });
        
        // add the points
        var LPoints = chartBody.selectAll(".points")
                .data(points);
        LPoints.exit().remove();
        LPoints.enter().append("circle")
                .attr("class", "points")
                .attr("cx", function (d) { return xScale(d.x); })
                .attr("cy", function (d) { return yScale(d.y); })
                .attr("r", options.radius.point)
                .attr("fill", options.color.shadeLight);
        
        /*
         * Sets the visibility of the keywords tags. If two are covering
         * each other, the younger one is hidden.    
         * @param {object} _tags - The keyword tags. 
         */ 
        var tagsVisibility = function (_tags) {
            // create additional cluster border control
            var additionalBorder = 5;
            // saves the visible clusters
            var visibleClusters = [];
            // get the DOMs and go through them
            var DOMs = _tags[0];
            for (var ClusN = 0; ClusN < DOMs.length; ClusN++) {
                var currentClust = DOMs[ClusN];
                var currentBox = currentClust.getBBox();
                for (var i = 0; i < visibleClusters.length; i++) {
                    var visibleBox = visibleClusters[i].getBBox();
                    // if the bounding boxes cover each other
                    if (Math.abs(currentBox.x - visibleBox.x) - additionalBorder <= Math.max(currentBox.width, visibleBox.width) && 
                        Math.abs(currentBox.y - visibleBox.y) - additionalBorder <= Math.max(currentBox.height, visibleBox.height)) {
                        $(currentClust).attr("class", $(currentClust).attr("class") + " hidden");
                        break;
                    }
                }
                // otherwise the cluster is visible
                visibleClusters.push(currentClust);
            }
        }
        
        // create the categories tags
        var landmarkTags = chartBody.selectAll(".landmark")
            .data(landmarks);
        landmarkTags.exit().remove();
        landmarkTags.enter().append("text")
            .attr("class", "landmark")
            .text(function (d) {
                // get the points, that are close to the landmark position 
                closestPoints = $.grep(points, function (point) {
                return Math.sqrt(Math.pow((xScale(d.x) - xScale(point.x)), 2) + 
                                Math.pow((yScale(d.y) - yScale(point.y)), 2)) < 36;
                });
                if (closestPoints.length == 0) { return; }
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
            .attr("x", function (d) {
                var xChange = this.getBBox().width != 0 ? this.getBBox().width / 2 : 0;
                return xScale(d.x) - xChange;
            })
            .attr("y", function (d) {
                var yChange = this.getBBox().height != 0 ? this.getBBox().height / 2 :0;
                return yScale(d.y) + yChange;
            })
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("font-family", "sans-serif")
            .attr("fill", options.color.text);
        tagsVisibility(landmarkTags);

        /**
         * Additional functionality
         * Creates the box containing the lecture information when hovered
         * over the points.
         */ 
        chartBody.selectAll(".points")
            .on("mouseover", function (d, idx) {
                var coords = d3.mouse(this);
                // create the tooltip with the point's information
                if (options.tooltipTextCallback) {
                    var tooltipDiv = $("#landscape-tooltip");
                    tooltipDiv.html(options.tooltipTextCallback(d));
                    var x = coords[0] + options.margin.left;
                    var y = coords[1] + options.margin.top;
                    var xOffset = (coords[0] > ($(options.containerName).width() / 2)) ? (-tooltipDiv.outerWidth() - 5) : 5;
                    var yOffset = (coords[1] > ($(options.containerName).height() / 2)) ? (-tooltipDiv.outerHeight() + 60) : -60;
                    tooltipDiv.css({ left: (x + xOffset) + "px", top: (y + yOffset) + "px" })
                        .removeClass("notvisible");
                }
            })
            .on("mouseout", function (d, idx) {
                // hide the tooltip
                $("#landscape-tooltip").addClass("notvisible");
            });
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
    databaseDate : "11.04.2015",

    /**
     * Creates a string of the data info.
     * @param {object} data - The object containing the info of the lecture.
     * @returns {string} The html string containing the info of the data. It
     * is used for the toolbox info, when hovering over a point.
     */ 
    tooltipTextCallback : function (data) {
        // the paper title
        var text = "<b>Lecture title:</b> " + data.title + "<br>";
        text += "<b>Presenter:</b> " + data.author + "<br>";
        text += "<b>Organization:</b> " + data.organization + "<br><br>";
        // description
        if (data.description) {
            text += "<b>Description: </b>" + LHelperFunctions.getDescription(data.description) + "<br><br>";
        }
        
        // lecture language
        text += "The lecture is in " + (data.language == 'sl' ? 'slovene. ' : 'english. ');
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
        var diceToss = Math.floor(Math.random() * distribution[distribution.length - 1]);
        for (var n = 0; n < distribution.length - 1; n++) {
            if (distribution[n] <= diceToss && diceToss < distribution[n + 1]) {
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