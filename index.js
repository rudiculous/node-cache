"use strict";

/* TODO: Monitor memory usage.
 */

const util = require('util');

const moment = require('moment');
const ms = require('ms');


/** @var _cacheObject The actual cache object. */
const _cacheObject = Object.create(null);


/** @var forEach._break Throw this inside `forEach` to break the loop. */
forEach._break = new Error('break');


/**
 * To prevent access to magic keys (e.g. __proto__), we prefix all keys.
 *
 * @var keyPrefix
 */
const keyPrefix = 'xx';


/** @var first A reference to first item in the cache. */
let first = null;

/** @var last A reference to the last item in the cache. */
let last = null;


/** @var cache The public API.*/
const cache = exports = module.exports = {

    /**
     * Removes all expired keys.
     */
    'clean': function clean() {
        forEach(function (key) {
            if (cache.isExpired(key)) {
                cache.remove(key);
            }
        }, false);
    },

    /**
     * Removes everything from the cache.
     */
    'clear': function clear() {
        forEach(cache.remove, false);
    },

    /**
     * Returns `true` if the cache contains this key.
     *
     * @param {String} key
     * @return {Boolean}
     */
    'containsKey': function containsKey(key) {
        return _prefix(key) in _cacheObject && !cache.isExpired(key);
    },

    /**
     * Returns `true` if a key exists for which this value is stored in
     * the cache.
     *
     * @param {*} value
     * @return {Boolean}
     */
    'containsValue': function containsValue(value) {
        let returnValue = false;

        forEach(function (key, val) {
            if (val === value) {
                returnValue = true;
                throw forEach._break;
            }
        });

        return returnValue;
    },

    /**
     * Returns the value that is stored in the cache for this key, or
     * undefined if either the key is not defined in the cache, or the
     * value has been expired.
     *
     * @param {String} key
     * @param {*}      [defaultValue] (Optional) The value to return if
     *                                the key does not exist.
     * @return {*}
     */
    'get': function get(key, defaultValue) {
        let returnValue = defaultValue;

        if (cache.containsKey(key)) {
            let v = _cacheObject[_prefix(key)];
            v.lastAccess = Date.now();

            if (v === first && v.next != null) {
                first = v.next;
            }

            if (v.previous != null) {
                v.previous.next = v.next;
            }

            if (v.next != null) {
                v.next.previous = v.previous;
            }

            v.previous = last;
            v.next = null;
            last.next = v;
            last = v;

            returnValue = _get(key);
        }

        return returnValue;
    },

    /**
     * Returns true if the cache contains nothing.
     *
     * @return {Boolean}
     */
    'isEmpty': function isEmpty() {
        let returnValue = true;

        forEach(function (key) {
            returnValue = false;
            throw forEach._break;
        });

        return returnValue;
    },

    /**
     * Checks whether the max age is greater than the current age,
     * relative to the last update.
     *
     * @param {String} key
     * @return {Boolean|null} Returns null if the key does not exist.
     */
    'isExpired': function isExpired(key) {
        key = _prefix(key);

        if (key in _cacheObject) {
            let v = _cacheObject[key];

            if (v.maxAge == null) {
                return false;
            }
            else {
                return moment(v.lastUpdate).add(v.maxAge).isBefore();
            }
        }
        else {
            return null;
        }
    },

    /**
     * Returns a Set of all keys.
     *
     * @return {Set}
     */
    'keySet': function keySet() {
        let keys = new Set([]);
        forEach(keys.add);

        return keys;
    },

    /**
     * Stores the value in the cache.
     *
     * @param {String}       key      The key under which to store the
     *                                value.
     * @param {*}            value    The value to store.
     * @param {Integer|null} [maxAge] The maximum age of this cache in
     *                                ms. If null, the key will never
     *                                expire.
     */
    'put': function put(key, value, maxAge) {
        if (maxAge != null) {
            maxAge = maxAge|0;
        }

        if (cache.containsKey(key)) {
            let v = _cacheObject[_prefix(key)];

            if (v === first && v.next != null) {
                first = v.next;
            }

            if (v.previous != null) {
                v.previous.next = v.next;
            }

            if (v.next != null) {
                v.next.previous = v.previous;
            }

            v.previous = last;
            v.next = null;
            last.next = v;
            last = v;

            v.value = value;
            v.lastAccess = Date.now();
            v.lastUpdate = Date.now();

            if (maxAge !== undefined) {
                v.maxAge = maxAge;
            }
        }
        else {
            if (maxAge == null) {
                maxAge = null;
            }

            let item = {
                key: key,
                value: value,
                lastAccess: Date.now(),
                lastUpdate: Date.now(),
                created: Date.now(),
                maxAge: maxAge,
                previous: null,
                next: null,
                inspect: function() {
                    return key;
                },
            };

            if (first == null) {
                first = item;
            }

            if (last != null) {
                item.previous = last;
                last.next = item;
            }
            last = item;

            _cacheObject[_prefix(key)] = item;
        }
    },

    /**
     * Puts all key-value pairs in the cache.
     *
     * @param {Object} map
     */
    'putAll': function putAll(map) {
        Object.keys(map).forEach(function (key) {
            cache.put(key, map[key]);
        });
    },

    /**
     * Removes this key from the cache.
     *
     * @param {String} key
     * @return {*}
     */
    'remove': function remove(key) {
        if (!cache.containsKey(key)) {
            return undefined;
        }

        let v = _cacheObject[_prefix(key)];
        delete _cacheObject[_prefix(key)];

        if (v === first) {
            first = v.next;
        }

        if (v === last) {
            last = v.previous;
        }

        if (v.previous != null) {
            v.previous.next = v.next;
        }

        if (v.next != null) {
            v.next.previous = v.previous;
        }

        return v.value;
    },

    /**
     * Removes the least recently used key from the cache.
     *
     * @return {*}
     */
    'removeLRU': function removeLRU() {
        if (first == null) {
            return undefined;
        }

        return cache.remove(first.key);
    },

    /**
     * Returns the number of keys in the cache.
     *
     * @return {Integer}
     */
    'size': function size() {
        return cache.keySet().size;
    },

    /**
     * Returns a representation of the cache.
     *
     * @return {String}
     */
    'inspect': function inspect() {
        let repr = [];
        let ref = first;

        while (ref != null) {
            let lastUpdate = moment(ref.lastUpdate);

            repr.push({
                key: ref.key,
                value: ref.value,
                lastAccess: moment(ref.lastAccess).fromNow(),
                lastUpdate: lastUpdate.fromNow(),
                created: moment(ref.created).fromNow(),
                maxAge: ref.maxAge == null ? 'indefinite' : moment.duration(ref.maxAge).humanize(),
                expires: ref.maxAge == null ? 'never' : lastUpdate.add(ref.maxAge).fromNow(),
            });

            ref = ref.next;
        }

        return repr;
    },
};


/**
 * Clean up the cache (i.e. remove expired keys) every 5 minutes.
 *
 * TODO: Cleaning up does not happen asynchronous. With a large cache,
 *       this could conceivably cause problems.
 */
setInterval(cache.clean, ms('5 minutes'));


/**
 * Convenience method to loop over the cache.
 *
 * @param {Function} cb A callback function, which accepts two
 *                      arguments: The key and the value.
 * @param {Boolean} [excludeExpired=true] Don't loop over expired keys.
 */
function forEach(cb, excludeExpired) {
    if (excludeExpired == null) excludeExpired = true;

    try {
        Object.keys(_cacheObject).forEach(function (key) {
            key = _unPrefix(key);

            if (!excludeExpired || !cache.isExpired(key)) {
                cb.call(this, key, _get(key));
            }
        });
    }
    catch (err) {
        if (err !== forEach._break) throw err;
    }
}

/**
 * Convenience method to retrieve the value for a key.
 *
 * @param {String} key
 * @return {*}
 */
function _get(key) {
    return _cacheObject[_prefix(key)].value;
}

/**
 * Convenience method to prefix the key.
 *
 * @param {String} key
 * @return {String}
 */
function _prefix(key) {
    return keyPrefix + key;
}

/**
 * Convenience method to remove the prefix from a key.
 *
 * @param {String} key
 * @return {String}
 */
function _unPrefix(key) {
    return key.substring(keyPrefix.length);
}
