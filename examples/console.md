---
title: Interact with the Console
group: Examples
category:
- Console
- HTTP API
- WebSocket API
---
This example uses the WebSocket API to stream console output and the HTTP API
to evaluate expressions on the console.

All console expressions are evaluated on {@link ScreepsClientConfig.defaultShard}. If it is undefined, the script will abort with an error after any console expression is sent.

Type `exit` or press Ctrl+C / Cmd+C to quit.

{@includeCode console.ts}
