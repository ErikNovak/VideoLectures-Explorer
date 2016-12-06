var redis = require("redis");

/**
 * This function wraps the redis in-memory data structure store, which is used as a cache.
 * See: {@link http://redis.io/}.
 * @param  {Number} [port=6379] - The port on which the redis server runs.
 * @param  {String} [host="127.0.0.1"] - The host on which the redis server is created.
 * @return {Object} The cache function.
 */
function cache(port, host) {
    // initialize server path
    var PORT = port ? port : 6053;
    var HOST = host ? host : "127.0.0.1";

    // self pointer
    var self = this;
    var keys = new Set();

    // creates the connection
    var connected = false;
    var client = redis.createClient(PORT, HOST);

    client.on('connect', function() {
        connected = true;
    });

    /**
     * Checks if redis server is connected.
     * @return {Boolean} True, if the redis server is connected. Otherwise, false.
     */
    this.isConnected = function () {
        return connected;
    }

    /**
     * Checks if the cache has already the key.
     * @param  {String} key - The key.
     * @param  {Function} callback - The function called when the response is ready.
     * @return {Boolean} True if key exists. Otherwise, false.
     */
    this.hasKey = function (key, callback) {
        client.exists(key, function (err, reply) {
            var exists = reply === 1 ? true : false;
            callback(exists);
        });
    }

    /////////////////////////////////////////////
    // Get Functions

    /**
     * Gets the value stored under the key.
     * @param  {String} key - The key.
     * @param  {Function} callback - The function called when the response is ready.
     * @return {String | Number} The value stored under the key.
     */
    this.getKeyValue = function(key, callback) {
        client.get(key, function (err, reply) {
            callback(reply);
        });
    }

    /**
     * Gets the object stored under the key.
     * @param  {String} key - The key.
     * @param  {Function} callback - The function called when the response is ready.
     * @return {Object} The object stored under the key.
     */
    this.getKeyObject = function (key, callback) {
        client.hgetall(key, function (err, object) {
            callback(object);
        });
    }

    /**
     * Gets the array of stored keys.
     * @return {Set.<String | Number>} The array of stored keys that don't have an expiration time.
     */
    this.getStoredKeys = function () {
        var keysArray = [];
        keys.forEach(function (val) { keysArray.push(val); });
        return keysArray;
    }

    /////////////////////////////////////////////
    // Set Functions

    /**
     * Sets the key-value in the redis cache.
     * @param {String}          key   - The key.
     * @param {String | Number} value - The value.
     * @param {Number}          expirationTime - The number in seconds until the key-value expires.
     * @return {Object} Self.
     */
    this.setKeyValue = function (key, value, expirationTime) {
        client.set(key, value);
        if (expirationTime) {
            client.expire(key, expirationTime);
        }
        keys.add(key);
    }

    /**
     * Sets the key-object in the redis cache.
     * @param {String} key - The key.
     * @param {Object} obj - The object containing non-nested key-values.
     * @param {Number} expirationTime - The number in miliseconds until the key-obj expires.
     * @return {Object} Self.
     */
    this.setKeyObject = function (key, obj, expirationTime) {
        client.hmset(key, obj);
        if (expirationTime) {
            client.expire(key, expirationTime);
        }
        keys.add(key);
    }

    /////////////////////////////////////////////
    // Delete Functions

    /**
     * Delete the value saved under the key.
     * @param  {String | Number} key - The key.
     */
    this.deleteKey = function (key) {
        client.del(key, function (err, reply) {
            keys.delete(key);
        });
    }

    /**
     * Delete all values saved under the key that don't have an expiration time..
     * @param  {String | Number} key - The key.
     */
    this.deleteAll = function () {
        client.flushall();
        keys = new Set();
    }

    return this;
}

module.exports = cache;
