# Tuiport

![Tuiport — real SSH apps, built with OpenTUI, on Cloudflare](.github/readme-banner.png)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/acoyfellow/tuiport)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Serve an [OpenTUI](https://github.com/anomalyco/opentui) application over real SSH from a Cloudflare Container.

Tuiport is an **Agent Experience** release: a shared terminal interface where agents and humans can meet, work, and stay in flow.

```sh
git clone https://github.com/acoyfellow/tuiport
cd tuiport && bun install
bun run local

# in another terminal
ssh -p 2222 localhost
```

Everything runs on Cloudflare. A Spectrum application hands raw SSH TCP to the Worker's `connect()` handler, which splices it through the Container's Durable Object straight onto the SSH port:

```text
OpenSSH ──TCP──▶ Spectrum ──▶ Worker connect() ──▶ Durable Object ──▶ Container :2222
                                                                       └─ @opentui/ssh
```

No relay host, no WebSocket tunnel, no shared token. Nothing in the path can read the SSH session.

## Live browser session

The landing page also runs a constrained version of the same OpenTUI application directly in the browser:

```text
cloudterm → same-origin WebSocket → Worker → Durable Object → Container → OpenTUI
```

This is a real Container-backed session, not a recording. It intentionally exposes no shell, command execution, filesystem, or visitor credentials. The direct WebSocket path exists for dogfooding; ordinary SSH remains the product interface.

## Deploy

### Step 1 — Get it running

The site and the live browser demo need no secrets. Deploy in one command:

```sh
git clone https://github.com/acoyfellow/tuiport
cd tuiport && bun install
wrangler login      # or `bun run setup` will start it for you
bun run setup
```

`bun run setup` deploys the Worker and Container to the account you are logged
into, generates a stable `SSH_HOST_KEY_B64`, and stores it with the bulk secrets
API. No secret is ever pasted into a web form. It prints your deployed URL and
the Spectrum command for Step 2 when it finishes.

Prefer no local toolchain? The **Deploy to Cloudflare** button above also works
and requires no secrets — it gives you the site and browser demo. Run `bun run
setup` (or Step 2) afterward to enable SSH.

### Step 2 — Expose plain `ssh <hostname>` (optional)

Create one Spectrum application (paid zone) whose origin is the Worker. `setup`
prints this with your Worker's script tag filled in:

```sh
curl "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/spectrum/apps" \
  --header "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  --json '{
    "protocol": "tcp/22",
    "dns": { "type": "CNAME", "name": "ssh.example.com" },
    "traffic_type": "worker",
    "origin_worker_id": "YOUR_WORKER_SCRIPT_TAG",
    "tls": "off"
  }'
```

Then `ssh ssh.example.com`.

## Make it yours

Edit `container/server.ts`. `@opentui/ssh` gives each accepted session an OpenTUI renderer connected to the remote PTY:

```ts
createServer({ auth: { publicKey: 'any' } }).serve((session) => {
  session.renderer.root.add(yourOpenTuiApp(session.renderer));
});
```

The sample accepts any **verified** public key. Set `SSH_HOST_KEY_B64` before sharing the hostname so the server fingerprint survives Container restarts. Use an `authorized_keys` allowlist before attaching private data or capabilities.

## Repository map

| Path | Purpose |
|---|---|
| `src/` | svelte-hono site, embedded cloudterm session, routing, `connect()` TCP handler, and Container binding |
| `container/` | OpenTUI SSH application and browser-demo server |
| `docs/` | Diátaxis documentation |
| `wrangler.jsonc` | portable one-click deployment |
| `alchemy.run.ts` | custom-domain deployment for `tuiport.coey.dev` |

## Documentation

- [Tutorial](docs/tutorial.md) — deploy a working instance
- [How-to guides](docs/how-to.md) — customize auth, UI, and hostnames
- [Reference](docs/reference.md) — exact routes, ports, and resources
- [Explanation](docs/explanation.md) — architecture and platform boundary

The same documentation is published at <https://tuiport.coey.dev>.

## Local development

Run the complete SSH loop with Docker:

```sh
bun install
bun run local

# in another terminal
ssh -p 2222 localhost
```

Run the Worker development server separately with `bun run dev`. Run `bun run check` before pushing.

## Status

Tuiport is a focused proof, version `0.0.1`. Every runtime component runs on Cloudflare.

## License

MIT © Jordan Coeyman.
