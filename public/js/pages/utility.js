
/**
 * The utility used for the info container.
 * @type {Object}
 */
var utility = {
    /**
     * Sorts and makes an array out of an object.
     * @param  {Object} json - The object containing the key-values, vhere values are numerical.
     * @return {string} The string where the categories are links for querying for the selected category.
     */
    stringifyCategories : function (json) {
        var array = [];
        var keys = Object.keys(json);
        for (var keyN = 0; keyN < keys.length; keyN++) {
            array.push({ category: keys[keyN], frequency: json[keys[keyN]] });
        }
        array.sort(function (a, b) {
            return b.frequency - a.frequency;
        });
        var text = "";
        for (var catN = 0; catN < array.length; catN++) {
            var pair = array[catN];
            text += "<a onclick='queryCategory(\"" + pair.category + "\")'>" + pair.category + "</a>" + " (" + pair.frequency + ")";
            if (catN != array.length - 1) {
                text += ", ";
            }
        }
        return text;
    }
};
