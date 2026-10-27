#!/usr/bin/env bun
/**
 * One-command Tuiport setup.
 *
 *   wrangler login   (or this script will start it)
 *   bun run setup
 *
 * Deploys the Worker + Container to the Cloudflare account you are logged into,
 * generates a stable SSH host key, and stores it with the bulk secrets API.
 * No secret is ever pasted into a web form. Public SSH needs one Spectrum
 * application whose origin is this Worker; the exact API call is printed at the
 * end with your Worker's script tag filled in.
 *
 * Implementation notes (verified against wrangler source):
 *   - Login state is read from `wrangler whoami`.
 *   - The deployed URL and Worker script tag are read from wrangler's
 *     structured ND-JSON output (WRANGLER_OUTPUT_FILE_PATH, type:"deploy"),
 *     not by scraping stdout.
 *   - Secrets are sent to `wrangler secret bulk` as a JSON object over stdin.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { $ } from 'bun';

$.throws(true);

function step(message: string) {
  console.log(`\n\x1b[1m• ${message}\x1b[0m`);
}

async function isLoggedIn(): Promise<boolean> {
  try {
    const out = await $`bunx wrangler whoami`.quiet();
    return !out.stdout.toString().toLowerCase().includes('not authenticated');
  } catch {
    return false;
  }
}

type DeployInfo = { host: string | null; workerTag: string | null };

/** Read the workers.dev hostname and script tag from wrangler's ND-JSON deploy output. */
function deployInfoFromOutput(outputFile: string): DeployInfo {
  let lines: string[];
  try {
    lines = readFileSync(outputFile, 'utf8').trim().split('\n');
  } catch {
    return { host: null, workerTag: null };
  }
  for (const line of lines) {
    let entry: { type?: string; targets?: unknown; worker_tag?: unknown };
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.type !== 'deploy') continue;
    const workerTag = typeof entry.worker_tag === 'string' ? entry.worker_tag : null;
    const targets = Array.isArray(entry.targets)
      ? entry.targets.filter((t): t is string => typeof t === 'string')
      : [];
    const chosen =
      targets.find((t) => t.includes('.workers.dev')) ??
      targets.find((t) => t.startsWith('https://'));
    let host: string | null = null;
    if (chosen) {
      try {
        host = new URL(chosen).host;
      } catch {
        host = chosen.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      }
    }
    return { host, workerTag };
  }
  return { host: null, workerTag: null };
}

console.log('\x1b[1mTuiport setup\x1b[0m — deploys to the account you are logged into.');

if (!(await isLoggedIn())) {
  step('Logging in to Cloudflare (a browser window will open)');
  await $`bunx wrangler login`;
}

step('Generating SSH_HOST_KEY_B64');
const gen = await $`bash scripts/gen-secrets.sh`.quiet();
const sshHostKey = gen.stdout
  .toString()
  .trim()
  .replace(/^SSH_HOST_KEY_B64=/, '');
if (!sshHostKey) throw new Error('Host key generation failed; check that ssh-keygen is installed.');

const outDir = mkdtempSync(join(tmpdir(), 'tuiport-deploy-'));
const outputFile = join(outDir, 'wrangler-output.ndjson');
let deployed: DeployInfo = { host: null, workerTag: null };
try {
  step('Building and deploying the Worker and Container');
  await $`bun run build`;
  await $`bunx wrangler deploy`.env({ ...process.env, WRANGLER_OUTPUT_FILE_PATH: outputFile });
  deployed = deployInfoFromOutput(outputFile);
} finally {
  rmSync(outDir, { recursive: true, force: true });
}

step('Storing the host key with the bulk secrets API');
await $`bunx wrangler secret bulk < ${new Blob([JSON.stringify({ SSH_HOST_KEY_B64: sshHostKey })])}`;

// Save locally (gitignored) so `bun run local` and alchemy can reuse the same identity.
await Bun.write(
  '.dev.vars',
  `# Written by 'bun run setup'. Gitignored.\nSSH_HOST_KEY_B64=${sshHostKey}\n`,
);

const siteLine = deployed.host ? `  Site:  https://${deployed.host}\n` : '';
const workerTag = deployed.workerTag ?? 'YOUR_WORKER_SCRIPT_TAG';

console.log(`
\x1b[32m✓ Deployed.\x1b[0m The site and live browser demo are running now.
${siteLine}
\x1b[1mTo expose plain \`ssh <hostname>\`\x1b[0m, create one Spectrum application
whose origin is this Worker (paid zone required):

  curl "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/spectrum/apps" \\
    --header "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \\
    --json '{
      "protocol": "tcp/22",
      "dns": { "type": "CNAME", "name": "ssh.example.com" },
      "traffic_type": "worker",
      "origin_worker_id": "${workerTag}",
      "tls": "off"
    }'

Then connect: ssh ssh.example.com
`);
