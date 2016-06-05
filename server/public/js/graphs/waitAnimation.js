/**
 * WAIT ANIMATION
 * Creates a wait icon animation using d3.js.
 */
function waitAnimation(_options) {
    // settings
    var options = $.extend({
        containerName: undefined,                                   // the dom that contains the svg element
        radius: { inner: 30, outer: 40 },                           // the inner and outer radius of the wait icon
        color: { background: "#ddd", foreground: "#6375fc" }        // the background and foreground color of the wait icon
    }, _options);
    
    // self pointer
    var self = this;

    /**
     * Wait variables
     */ 
    var interval = null,
        isRunning = false;

    /**
     * Displays the animation of the waiting object. 
     */
    this.displayAnimation = function () {
        // makes the container visible
        $(options.containerName).show();

        // set the location of the icon
        var totalWidth = $(options.containerName).width(),
            totalHeight = $(options.containerName).height(),
            tau = 2 * Math.PI;
        
        var svg = d3.select(options.containerName)
            .append("svg")
            .attr("width", totalWidth)
            .attr("height", totalHeight)
            .append("g")
            .attr("transform", "translate(" + totalWidth / 2 + "," + totalHeight / 2 + ")");
        
        // set the arc of object
        var arc = d3.svg.arc()
            .innerRadius(options.radius.inner)
            .outerRadius(options.radius.outer);
        
        // set the arc of inner object
        var arcInner = d3.svg.arc()
            .innerRadius(options.radius.inner/2)
            .outerRadius(options.radius.outer/2);

        // center circle
        var circle = svg.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 8)
            .attr("fill", options.color.foreground);

        // the background arc
        var background = svg.append("path")
        .datum({ startAngle: 0, endAngle: tau })
        .style("fill", options.color.background)
        .attr("d", arc);
        
        // one part of the foreground arc
        var foregroundFirst = svg.append("path")
        .datum({ startAngle: tau/6, endAngle: tau/3 })
        .style("fill", options.color.foreground)
        .attr("d", arc);
        
        // second part of the foreground arc
        var foregroundSecond = svg.append("path")
        .datum({ startAngle: 2*tau/3, endAngle: 2*tau/3 + tau/6 })
        .style("fill", options.color.foreground)
        .attr("d", arc);
        
        // one part of the foreground arc
        var innerFirst = svg.append("path")
        .datum({ startAngle: tau / 6, endAngle: tau / 3 })
        .style("fill", options.color.foreground)
        .attr("d", arcInner);
        
        // second part of the foreground arc
        var innerSecond = svg.append("path")
        .datum({ startAngle: 2 * tau / 3, endAngle: 2 * tau / 3 + tau / 6 })
        .style("fill", options.color.foreground)
        .attr("d", arcInner);

        var startAngleFirst = tau/6;
        var endAngleFirst = tau/3;
        
        var startAngleSecond = 2*tau/3;
        var endAngleSecond = 2*tau/3 + tau/6;
        
        var startInnerFirst = tau / 6;
        var endInnerFirst = tau / 3;
        
        var startInnerSecond = 2 * tau / 3;
        var endInnerSecond = 2 * tau / 3 + tau / 6;

        interval = setInterval(function () {
            // update the first arc
            startAngleFirst +=  tau/2;
            endAngleFirst +=  tau/2;
            
            foregroundFirst.transition()
            .duration(1000)
            .call(arcTweenOut, startAngleFirst, endAngleFirst);
            
            // update the second arc
            startAngleSecond +=  tau/2;
            endAngleSecond +=  tau/2;
            
            foregroundSecond.transition()
            .duration(1000)
            .call(arcTweenOut, startAngleSecond, endAngleSecond);

            // update the first inner arc
            startInnerFirst -= tau / 2;
            endInnerFirst -= tau / 2;
            
            innerFirst.transition()
            .duration(1000)
            .call(arcTweenIn, startInnerFirst, endInnerFirst);

            // update the first arc
            startInnerSecond -= tau / 2;
            endInnerSecond -= tau / 2;
            
            innerSecond.transition()
            .duration(1000)
            .call(arcTweenIn, startInnerSecond, endInnerSecond);
        }, 1000);
        
        /**
         * The helper function, which creates the transition of the 
         * wait animation.  
         */
        function arcTweenOut(transition, startAngle, endAngle) {
            transition.attrTween("d", function (d) {
                var interpolateStart = d3.interpolate(d.startAngle, startAngle);
                var interpolateEnd = d3.interpolate(d.endAngle, endAngle);
                return function (t) {
                    d.startAngle = interpolateStart(t);
                    d.endAngle = interpolateEnd(t);
                    return arc(d);
                }
            });
        }

        function arcTweenIn(transition, startAngle, endAngle) {
            transition.attrTween("d", function (d) {
                var interpolateStart = d3.interpolate(d.startAngle, startAngle);
                var interpolateEnd = d3.interpolate(d.endAngle, endAngle);
                return function (t) {
                    d.startAngle = interpolateStart(t);
                    d.endAngle = interpolateEnd(t);
                    return arcInner(d);
                }
            });
        }
    }
    
    /**
     * Stops and hides the animation
     */ 
    this.stopAnimation = function () {
        clearInterval(interval);
        // remove the previous SVG contained elements
        d3.select(options.containerName + " svg").remove();
        $(options.containerName).hide();
    }

    $(window).resize(function () {
        if (isRunning) {

        }
    })
}