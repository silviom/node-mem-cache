var events  = require("events");
var util    = require("util");

/*
* This class a key/value cache on memory.
* A timeout will be added to each entry.
* When a timeout happens for a single entry, the event 'expired'
* will be rised with the pair key/value as argument.
* When an entry was query or updated, its timeout will be reseted.
* @param options {object} Optional configuration options.
*   - timeout               {number}  Optional. Specifies in ms the default timeout for each entry. Default 60000 ms.
*   - doesNotRenewTimeout   {boolean} Optional. Specifies if entries's timeout should be reseted after each query or update. Default false.
*   - timeoutDisabled       {boolean} Optional. Enable/diable timeout feature. If timeout feature is desable, items will not expire. Default false.
* @api public
*/
var Cache = function(options) {

    if (typeof options== 'number') {
        options = { timeout: options};
    } else {
        options = options || {};
    }

    var self = this;        // Self reference
    var cache = {};         // Entries by key
    var _length = 0;        // Internal counter of cache's entries
    var expirations = [];   // Entries sorted ascending by their expiration time and sequence.
    var sequence = 0;       // Internal counter for sorting entries within 'expirations' array.
    var timerId = null;     // Reference to timer
    var config = {          // Global configuration
        timeout: options.timeout || 60000,
        doesNotRenewTimeout: options.doesNotRenewTimeout || false,
        timeoutDisabled: options.timeoutDisabled || false
    };

    /*
    * Returns the number of entries that the cache contains.
    * @api public
    */
    Object.defineProperty(this, "length", {
      enumerable: true,
      get : function(){ return _length; }
    });


    /*
    * Returns all keys.
    * @api public
    */
    Object.defineProperty(this, "keys", {
      enumerable: true,
      get : function(){ return Object.keys(cache); }
    });

    /*
    * Inserts or updates an entry into the cache.
    * @param key        {string} Required.
    * @param value      {any}    Required.
    * @param timeout    {number} Optional. Specifies in milliseconds the timeout for this entry.
    * @api public
    */
    this.set = function (key, value, timeout) {
        var current = cache[key];
        if (current) {
            if (!config.timeoutDisabled) removeExpiration(current);
        } else {
            _length++;
        }


        var item = {
            key: key,
            value: value
        };

        cache[key] = item;

        if (!config.timeoutDisabled) {
            item.timeout = timeout || config.timeout;
            addExpiration(item);
        }
    };

    /*
    * Removes an entry from the cache.
    * @param key    {string} Required.
    * @api public
    */
    this.remove =function (key) {
        var item = cache[key];
        if (!item) return null;

        _length --;
        if (!config.timeoutDisabled) removeExpiration(item);
        delete cache[key];
        return item.value;
    };

    /*
    * Gets an entry's value by its key.
    * @param key    {string}    Required.
    * @return       {any}       Returns entry's value or null if entry was not found
    * @api public
    */
    this.get = function (key) {
        var item = cache[key];
        if (item) {
            if (!config.timeoutDisabled && !config.doesNotRenewTimeout) {
                removeExpiration(item);
                addExpiration(item);
            }
            return item.value;
        }
        return null;
    };

    /*
    * Removes all entries from the cache
    * @public api
    */
    this.clean = function () {
        if (timerId) {
            clearTimeout(timerId);
            timerId = null;
        }

        cache = {};
        expirations = [];
        _length = 0;
    };

    // adds an entry to expirations array
    var addExpiration = function (item) {
        item.expires = new Date().getTime() + item.timeout;
        item.sequence = sequence++;

        var index = binaryInsert(item, itemComparer);
        if (index === 0) setItemTimeout(item);
    };

    // removes an entry from expirations array
    var removeExpiration = function (item) {
        var index = binarySearch(item);
        if (index >= 0) {
            if (index === 0 && expirations.length > 1) setItemTimeout(expirations[1]);
            expirations.splice(index, 1);
        }
    };

    // sets expiration timer for an item
    var setItemTimeout = function (item) {
        if (timerId) {
            clearTimeout(timerId);
            timerId = null;
        }

        var timeout = item.expires - new Date().getTime();
        timerId = setTimeout(onTimer, timeout < 10 ? 10 : timeout);
    };

    // on timer event, emits one event 'expired' for each entry at expirations array that are expired.
    var onTimer = function() {
        var now = new Date().getTime();
        if (timerId) {
            clearTimeout(timerId);
            timerId = null;
        }

        var itemsToEmit = [];   // Collects all expired items


        for (var index in expirations) {

            // Gets entry from expirations cache
            var item = expirations[index];

            // Stops when find a non expired item
            if (item.expires > now) {

                // Sets timer for no expired item
                setItemTimeout(item);

                // Removes all expired entries from array
                expirations = expirations.slice(index);
                break;
            }
            // All remaining expirations may need to be removed...
            else if( index == expirations.length-1 && item.expires <= now) {
                expirations = expirations.slice(index+1);
            }

            // Adds expired entry to collection of expired items
            itemsToEmit.push(item);

            // Removes expired entry from cache
            delete cache[item.key];
        }

        // Updates length property
        _length -= itemsToEmit.length;

        // Emits 'expired' event for each expired item
        itemsToEmit.forEach( function( item ) {
            self.emit("expired", {
                key: item.key,
                value: item.value
            });
        });
    };

    // Internal function that compares two entries's timeouts
    var itemComparer = function(a, b) {
        if (a && !b) return -1;
        if (!a && b) return 1;
        if (b.expires === a.expires) {
            return a.sequence - b.sequence;
        }

        return a.expires - b.expires;
    };

    // searchs on expirations array
    var binarySearch = function (value) {
         var low = 0, up = expirations.length,  middle, result;

         while ( low <= up ) {

            middle = (low + up)  >> 1;
            result = itemComparer(value, expirations[middle]);

            if (result === 0) return middle;

            if (result > 0) {
                low = middle + 1;
            } else {
                up = middle - 1;
            }
         }

         return -1;
    };

    // inserts on expirations array
    var binaryInsert = function (value) {
         var low = 0, up = expirations.length, count = up, middle, result;

         while ( low <= up ) {

            middle = (low + up)  >> 1;
            result = itemComparer(value, expirations[middle]);

            if (result === 0) return middle;

            if (result > 0 ) {
                low = middle + 1;
            } else {
                up = middle - 1;
            }
         }

         expirations.splice(low, 0, value);
         return low>count ? count : low;
    };

};

// Cache inherits from EventEmitter
util.inherits(Cache, events.EventEmitter);

// Exports Cache class
module.exports = Cache;