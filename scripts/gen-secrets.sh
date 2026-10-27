#!/usr/bin/env bash
# Generate the stable SSH host key Tuiport uses, in a form alchemy.env.ts accepts.
# Uses ssh-keygen (present on macOS and Linux) because LibreSSL's `openssl
# genpkey -algorithm ED25519` is unavailable on macOS.
# Usage:
#   bash scripts/gen-secrets.sh            # print to stdout
#   bash scripts/gen-secrets.sh >> .env    # append for `alchemy deploy`
set -euo pipefail

key_dir="$(mktemp -d)"
trap 'rm -rf "$key_dir"' EXIT
key_path="$key_dir/host_ed25519"
ssh-keygen -t ed25519 -N '' -C 'tuiport-host-key' -f "$key_path" >/dev/null

printf 'SSH_HOST_KEY_B64=%s\n' "$(base64 < "$key_path" | tr -d '\n')"
