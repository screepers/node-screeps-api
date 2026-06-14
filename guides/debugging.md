---
title: Debugging
category: Guides
---
## Event Logging

`node-screeps-api` uses the [debug](https://www.npmjs.com/package/debug) package to expose diagnostic information. Debug output is divided into several namespaces:
* `screepsapi:config`: `ScreepsConfigManager` operations
* `screepsapi:http`: HTTP requests
* `screepsapi.ratelimit`: HTTP API rate limit state
* `screepsapi.ratelimitexceeded`: HTTP API endpoint rate limit exceeded events
* `screepsapi.socket`: WebSocket API events/messages

Multiple namespaces can be specified by providing a comma-delimited list (ex: `screepsapi:http,screepsapi:ratelimit`). All namespaces can be specified by providing `screepsapi:*`.

To enable debug output in Node, set the `DEBUG` environment variable to the
namespace(s) you want to enable. Here is an example that uses the CLI in bash:
```sh
DEBUG=screepsapi.http,screepsapi.ratelimit screeps-api raw --server main auth.me
```

These environment variables work when invoking your own apps as well.

You can also enable/disable debug logs dynamically using `ScreepsHttpClient.debug()`:
```ts
const api = ScreepsHttpClient.fromConfig('main', 'appName')

// Enable debug logging for HTTP requests and rate limits:
api.debug({ http: true, rateLimit: true })

// Diable all debug logging
api.debug()
```

## Errors

Most errors thrown by the HTTP API should be instances of {@link ScreepsApiError}.
These errors include HTTP request/response fields that may be helpful.
