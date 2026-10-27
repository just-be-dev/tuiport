# Tutorial: deploy Tuiport

This tutorial produces a working OpenTUI SSH application in your Cloudflare account.

## Prerequisites

- a Cloudflare account with Workers Containers access
- Bun and the Wrangler CLI (`bun install` brings Wrangler in)
- for public SSH only: a paid zone with Spectrum

## Deploy the application

The site and the live browser demo need no secrets. From a clone of the repository:

```sh
bun install
wrangler login      # or `bun run setup` starts it for you
bun run setup
```

`bun run setup` deploys the Worker and Container to the account you are logged into, generates `SSH_HOST_KEY_B64`, and stores it with the bulk secrets API. It reads the deployed URL and Worker script tag from Wrangler's structured output and prints both. The host key is also saved to `.dev.vars` (gitignored).

The stable host key prevents fingerprint warnings after a Container restart. The generator uses `ssh-keygen` (present on macOS and Linux).

## Point Spectrum at the Worker

[Cloudflare Spectrum](https://developers.cloudflare.com/spectrum/) is Cloudflare's public TCP proxy. Create one application whose origin is the Worker itself — `setup` prints this command with your script tag filled in:

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

The token needs `Zone Settings Write`. TLS stays off because SSH provides its own encryption.

## Connect

```sh
ssh ssh.example.com
```

Accept the host key on the first connection. Press `q` to leave the sample app.

You now have OpenSSH talking to an OpenTUI application in a Cloudflare Container, with nothing running outside Cloudflare.
