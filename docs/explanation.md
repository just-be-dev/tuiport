# Explanation: how SSH reaches the Container

Tuiport aims to preserve one interface: `ssh hostname`. That means the first connection is arbitrary inbound TCP, not HTTP and not a client-side Cloudflare Tunnel command.

Cloudflare now delivers that TCP natively:

```text
OpenSSH ──TCP──▶ Spectrum ──▶ Worker connect() ──▶ Durable Object connect() ──▶ Container :2222
                 (worker origin)                                                  └─ @opentui/ssh
```

1. A Spectrum application with `traffic_type: "worker"` accepts public SSH on port 22 and hands the raw socket to the Worker's `connect()` handler.
2. The Worker calls `connect()` on the singleton `TuiportContainer` Durable Object stub, forwarding the socket.
3. The Durable Object starts the Container if needed and splices the socket onto `ctx.container.getTcpPort(2222)`.
4. SSH encryption, authentication, PTY handling, and application rendering all happen in the Container.

No hop in this path parses the stream. There is no relay host, no TCP-to-WebSocket conversion, and no shared bearer token: the only thing that can reach the Worker's `connect()` handler is a Spectrum application (or service binding) in your own account.

While any SSH socket is open, the Durable Object refuses to let the Container go idle, so long sessions survive the `sleepAfter` window.

## History

Earlier versions of Tuiport ran a small Go relay on a public host because Workers could not accept inbound TCP. Spectrum forwarded SSH to the relay, which tunnelled the bytes over an authenticated WebSocket to a `/bridge` route on the Worker, and a bridge inside the Container converted them back to TCP. Native inbound TCP made all three pieces unnecessary; the OpenTUI application did not change.

## Public sources

- [Workers connect() handler](https://developers.cloudflare.com/workers/runtime-apis/handlers/connect/)
- [Workers and Containers now support inbound TCP connections](https://blog.cloudflare.com/grpc-workers/)
- [Spectrum application API (`traffic_type: "worker"`, `origin_worker_id`)](https://developers.cloudflare.com/api/resources/spectrum/subresources/apps/methods/create/)
