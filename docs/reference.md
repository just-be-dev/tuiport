# Reference

## Worker entry points

| Entry | Contract |
|---|---|
| `connect()` | Raw TCP from a Spectrum worker-origin application; spliced to Container port `2222` |
| `GET /` | Public svelte-hono site |
| `GET /tutorial` | Tutorial |
| `GET /how-to` | Task-oriented guides |
| `GET /reference` | Reference |
| `GET /explanation` | Architecture explanation |
| `GET /api/health` | Reports Worker readiness without waking the Container |
| `WS /ws/demo` | Same-origin, constrained OpenTUI browser session; no shell |

## Ports

| Port | Location | Purpose |
|---|---|---|
| `22` | Spectrum edge | public SSH |
| `2222` | Container | `@opentui/ssh` server |
| `8080` | Container | health and browser-demo WebSocket |
| `443` | Worker | docs and browser demo |

## Resources

- Worker: `tuiport`
- Durable Object / Container class: `TuiportContainer`
- Container size: `lite`
- Maximum instances: `1`
- Sleep timeout: `10m` (deferred while any SSH socket is open)
- Spectrum application: `protocol: tcp/22`, `traffic_type: worker`, `origin_worker_id: <script tag>`, `tls: off`

## Configuration

`SSH_HOST_KEY_B64` is a base64-encoded Ed25519 private key in PEM form. If omitted, the Container generates an ephemeral development key.

The sample SSH policy accepts any valid public key after proof-of-possession verification. It does not accept passwords.

The browser demo is a separate transport and never reaches SSH port 2222. It mounts an OpenTUI renderer directly, accepts bounded keyboard input, caps concurrent sessions, and reaps idle and maximum-duration sessions.
