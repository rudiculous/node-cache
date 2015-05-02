# @rdcl/cache

This package provides a caching system for Node.js. Items in the cache
can be given a max age, after which they are automatically invalidated.
The cache is cleaned up every 5 minutes.

It is also possible to remove the least recently used items from the
cache.

## TODO

- If possible, monitor memory usage. When using too much memory, start
  removing items (LRU).
- Cache clean up does not happen asynchronously. When there are a lot of
  items in the cache, this could be problematic.
- Implement tests.
