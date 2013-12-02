# node-mem-cache

A simple in-memory cache for node.js
- Entries will be disposed on timeout
- Emits an event on each dispose item by timeout

## Installation

    npm install mem-cache

## Usage

    var Cache = require('mem-cache');
    var cache = new Cache();

    cache.set('foo', 'bar');
    console.log(cache.get('foo'))

## API

#### constructor = function(options)
* 'options' argument is an optional object instance containing the configuration. 
*   - timeout.              Optional number. Specifies in milliseconds the default timeout for each entry. Default 60000 ms.
*   - doesNotRenewTimeout   Optional boolean. Specifies if entries's timeout should be reseted after each query or update. Default false.
*   - timeoutDisabled       Optional boolean. Enable/diable timeout feature. If timeout feature is desable, items will not expire. Default false.

### Methods

#### set = function(key, value, timeout)
* Stores or updates a value.
* - key     {string} Required. 
* - value   {any}    Required.
* - timeout {number} Optional. Specifies in milliseconds the timeout for this entry.

#### get = function(key)
* Retreives a value for a given key, if there is no value for the given key a null value will be returned
* - key     {string} Required.

#### remove = function(key)
* Deletes the value and its key from the cache

#### clear = function()
* Deletes cache's entries all keys

### Properties

#### keys 
*Returns an string array containing all items' keys. It will include keys of items that are expired but weren't been removed yet.

#### length 
* Property that returns the current number of entries in the cache

### Events

#### expired 
* This event will be emitted for every cache entry that was removed because timed out