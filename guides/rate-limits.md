---
title: HTTP API Rate Limits
category: Guides
---
A global rate limit of 120 requests per minute (2 requests per second) applies
to requests made to any endpoint. Requests that fail due to this rate limit
are automatically retried by default. To disable this behavior, set
{@link ScreepsClientConfig.retry429Global} to false when initializing the client.

Certain endpoints have an additional rate limit. If your requests fail due
this limit, there are 3 ways to resolve or mitigate the issue:
1. Rewrite your application to make fewer requests to the limited endpoint
2. Enable automatic retries by setting {@link ScreepsClientConfig.retry429MaxRetries}
  to a positive number.
3. Open {@link ScreepsHttpClient.rateLimitResetUrl} periodically to manually reset
  your rate limits for all endpoints.

See the [official documentation](https://docs.screeps.com/auth-tokens.html#Rate-Limiting) for more details on rate limits.
