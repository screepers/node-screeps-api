---
title: HTTP API Rate Limits
category: Guides
---
The Screeps API has two different types of rate limits: global and endpoint-specific.

A global rate limit of 120 requests per minute (2 requests per second) applies
to requests made to any endpoint.

In addition to the global limit, certain endpoints have their own rate limits. See the [official documentation](https://docs.screeps.com/auth-tokens.html#Rate-Limiting) for a complete list of limited endpoints and the limits for each endpoint.

## Automatic Retries

{@link ScreepsHttpClient} does not attempt to prevent the consumer from exceeding rate limits, but it does have features that allow it to automatically recover when a request is rejected with an HTTP 429 response (Too Many Requests).

When the client receives an HTTP 429 response, it can determine whether the exceeded limit is global or endpoint-specific. This is because `x-ratelimit-*` headers are only included in a response when an endpoint-specific limit is exceeded.

Because the reset period for endpoint rate limits (either one hour or one day, depending on the endpoint) is much longer than the global rate limit (one minute), {@link ScreepsHttpClient} uses different approaches for recovering from each type of limit.

### Automatic Retries: Global Rate Limit

{@link ScreepsHttpClient} recovers from global 429 errors by waiting for a short, random period of time (see {@link GLOBAL_RATE_LIMIT_DELAY} for specifics) before each retry. Retries will be attempted until the request succeeds.

Automatic retries are enabled by default for requests that exceed the global rate limit. This feature can be disabled at any time by setting {@link ScreepsClientConfig.retry429Global} to `false`:

```ts
// During initialization:
const api = await ScreepsHttpClient.fromConfig('main', { app: { retry429Global: false } })

// After initialization:
api.appConfig.retry429Global = false
```

### Automatic Retries: Endpoint Rate Limits

{@link ScreepsHttpClient} recovers from endpoint 429 errors by retrying a finite number of times with exponential backoff. The initial delay, maximum delay, and number of retries can all be configured via {@link ScreepsClientConfig}.

Automatic retries are disabled by default for requests that exceed an endpoint rate limit (see {@link DEFAULT_CLIENT_CONFIG} for default settings). This feature can be enabled at any time by setting {@link ScreepsClientConfig.retry429MaxRetries} to a positive number:

```ts
// During initialization:
const api = await ScreepsHttpClient.fromConfig('main', { app: { retry429MaxRetries: 5 } })

// After initialization:
api.appConfig.retry429MaxRetries = 5
```

This feature works best when used with an application that implements other safeguards. For example, if you are writing an application that uses {@link ScreepsHttpClient.userMemoryGet} to monitor and record changes to `Memory.stats` (limit: 1440 / day, or 1 / minute on average), you might implement a one minute delay between requests. Assuming only one instance of the app is running per auth token, if the rate limit is exceeded, it's very likely that the automatic reset would occur soon after.

## Custom Recovery

When automatic retries are disabled (or the maximum number of retries for an endpoint limit has been exceeded), {@link ScreepsHttpClient} handles 429 errors in the following way:

1. It emits the {@link ScreepsHttpClient.RATE_LIMIT} event. The payload is a {@link RateLimitEvent}. Here is an example of how to listen to and parse these events:

```ts
import { setTimeout } from 'node:timers/promises'
import { ScreepsHttpClient, ScreepsHttpResponse, RateLimitEvent } from 'screeps-api'

// Assumes the client has already been initialized and assigned to `api`
declare const api: ScreepsHttpClient

api.on(ScreepsHttpClient.RATE_LIMIT, async (event: RateLimitEvent) => {
  const { method, path, params, toReset } = event

  // Determine whether global or endpoint rate limit was exceeded
  const isGlobal = isNaN(toReset)
  const [desc, delay] = isGlobal
    ? ['Global', 500]
    : [`${method} ${path}`, toReset * 1_000]

  // Wait for limit to reset before retrying request
  console.warn(`${desc} rate limit exceeded; retrying in ${delay.toLocaleString()} ms`)
  await setTimeout(delay)

  // Retry request:
  // - If retry succeeds, ScreepsHttpClient.RESPONSE_RESULT listener will handle the result
  // - If still rate limited, this listener will be invoked again
  api.req(method, path, params)
})

api.on(ScreepsHttpClient.RESPONSE_RESULT, async (event: ScreepsHttpResponse) => {
  const { method, path, params } = event
  // ... Use request data to match this event to request that is awaiting a response ...

  // ... event.data contains the payload that would have been returned as a Promise from an API endpoint method ...
})
```

2. It throws a {@link ScreepsApiError}. Here is an example of how to detect 429 errors:

```ts
import { ScreepsApiError } from 'screeps-api'

try {
  // ... ScreepsHttpClient endpoint method calls...
} catch (err) {
  // Detect HTTP 429 errors
  if ((err instanceof ScreepsApiError) && err.status === 429) {
    // Determine whether the rate limit is global or endpoint-specific
    const isGlobal = !err.headers['x-ratelimit-limit']

    // ... Retry or fail gracefully ...
  }

  // Bubble up any other errors
  throw err
}
```

## Manual Recovery

One final option to resolve rate limiting issues is to manually reset rate limits for an auth token via its reset page: {@link ScreepsHttpClient.rateLimitResetUrl}.

This is a stopgap solution that trades convenience and reliability for additional API usage. While rate limits can be reset an unlimited number of times in this way, the reset must be performed manually each time, and the rate limited application/service must usually be restarted as well.
