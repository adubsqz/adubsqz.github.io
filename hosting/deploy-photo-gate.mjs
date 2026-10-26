#!/usr/bin/env node
/**
 * Part 3: deploy the photo-gate Worker (routes for /photos/* + /api/gate-unlock).
 *
 * Default is dry-run. Pass --apply to run wrangler deploy.
 * Orange-cloud DNS should be live first (Part 2); this script checks dig/curl
 * when those tools are available and refuses --apply if still grey-clouded
 * unless you pass --force.
 *
 * If wrangler OAuth is on an account that does not own adubs.site, set:
 *   CLOUDFLARE_ACCOUNT_ID=…   # from `npx wrangler whoami` / dash Overview
 *   CLOUDFLARE_ZONE_ID=…      # from dash Overview for adubs.site
 * The deploy then rewrites routes to use zone_id (more reliable than zone_name).
 *
 *   npm run hosting:photo-gate:deploy
 *   npm run hosting:photo-gate:deploy -- --apply
 *
 * CI: .github/workflows/photo-gate.yml runs `--apply` on relevant main pushes
 * (needs CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID Actions secrets).
 *
 * Worker runtime secrets (once, not via this script or GitHub Actions):
 *   npx wrangler secret put GATE_PASSWORD --config hosting/photo-gate/wrangler.toml
 *   npx wrangler secret put GATE_HMAC_SECRET --config hosting/photo-gate/wrangler.toml
 *   npx wrangler secret put GALLERY_JWT_SECRET --config hosting/photo-gate/wrangler.toml
 */

import { execSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ZONE = 'adubs.site';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONFIG = path.join(HERE, 'photo-gate', 'wrangler.toml');
const API = 'https://api.cloudflare.com/client/v4';

function parseArgs(argv) {
  return {
    apply: argv.includes('--apply'),
    force: argv.includes('--force'),
  };
}

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (e) {
    return (e.stdout || e.stderr || '').toString().trim();
  }
}

function commandExists(name) {
  try {
    execSync(`command -v ${name}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function checkOrangeCloud() {
  const report = { ok: false, details: [] };

  if (commandExists('dig')) {
    const dig = sh(`dig +short ${ZONE} A`);
    const ips = dig.split('\n').filter(Boolean);
    const ghIps = ips.some((ip) => ip.startsWith('185.199.'));
    const cfLikely = ips.some((ip) => ip.startsWith('104.') || ip.startsWith('172.67.'));
    report.details.push(`dig A: ${ips.join(', ') || '(empty)'}`);
    if (ghIps && !cfLikely) {
      report.details.push('still GitHub Pages IPs → grey-cloud (Worker routes will not fire)');
      return report;
    }
    if (cfLikely) report.details.push('dig looks like Cloudflare anycast');
  } else {
    report.details.push('dig not available; skipping DNS check');
  }

  if (commandExists('curl')) {
    try {
      const out = sh(`curl -sI --max-time 15 https://${ZONE}/`);
      const cfRay = /cf-ray:/i.test(out);
      const server = (out.match(/^server:\s*(.+)$/im) || [])[1]?.trim() || '';
      report.details.push(`curl HEAD server=${server || '?'} cf-ray=${cfRay ? 'yes' : 'no'}`);
      if (cfRay || /cloudflare/i.test(server)) {
        report.ok = true;
        return report;
      }
    } catch (e) {
      report.details.push(`curl failed: ${e.message || e}`);
    }
  } else {
    report.details.push('curl not available; skipping edge header check');
  }

  if (report.details.some((d) => d.includes('anycast'))) {
    report.ok = true;
  }
  return report;
}

/** Prefer env; otherwise try Cloudflare API with CLOUDFLARE_API_TOKEN. */
async function resolveZoneId() {
  const fromEnv = process.env.CLOUDFLARE_ZONE_ID?.trim();
  if (fromEnv) return fromEnv;

  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!token) return null;

  const res = await fetch(`${API}/zones?name=${encodeURIComponent(ZONE)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  const zone = Array.isArray(json.result) ? json.result[0] : null;
  return zone?.id ?? null;
}

function buildConfigWithZoneId(zoneId, accountId) {
  const base = readFileSync(CONFIG, 'utf8');
  // Drop zone_name lines; inject zone_id after each pattern (stable for our file).
  let next = base.replace(/\nzone_name = "adubs\.site"/g, `\nzone_id = "${zoneId}"`);
  if (accountId && !/^\s*account_id\s*=/m.test(next)) {
    next = next.replace(/^name = "adubs-photo-gate"/m, `name = "adubs-photo-gate"\naccount_id = "${accountId}"`);
  }
  const dir = mkdtempSync(path.join(tmpdir(), 'adubs-photo-gate-'));
  const out = path.join(dir, 'wrangler.toml');
  writeFileSync(out, next, 'utf8');
  return out;
}

function printZoneHelp() {
  console.error(`
Could not attach routes for ${ZONE}.

DNS can show Cloudflare (orange-cloud) while Wrangler is logged into a *different*
account that does not own the zone.

Fix (pick one):

1) Confirm account owns the zone:
     npx wrangler whoami
   In the Cloudflare dashboard, open the account that lists ${ZONE}.

2) Pin IDs (Overview sidebar on ${ZONE}):
     export CLOUDFLARE_ACCOUNT_ID='…'
     export CLOUDFLARE_ZONE_ID='…'
     npm run hosting:photo-gate:deploy -- --apply

3) Or API token scoped to that zone/account:
     export CLOUDFLARE_API_TOKEN='…'
     npm run hosting:photo-gate:deploy -- --apply
`);
}

async function main() {
  const { apply, force } = parseArgs(process.argv.slice(2));
  const dryRun = !apply;

  console.log(`adubs photo-gate deploy (${dryRun ? 'DRY-RUN' : 'APPLY'})`);
  console.log(`wrangler config: ${CONFIG}`);

  const edge = await checkOrangeCloud();
  for (const line of edge.details) console.log(`  ${line}`);

  if (!edge.ok) {
    console.log(
      'Orange-cloud not confirmed. Finish Part 2 (npm run hosting:orange-cloud / hosting:verify-edge) first.',
    );
    if (apply && !force) {
      console.error('Refusing --apply while grey-clouded. Pass --force to override.');
      process.exit(1);
    }
    if (apply && force) {
      console.warn('--force: deploying anyway');
    }
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || '';
  const zoneId = await resolveZoneId();
  let configPath = CONFIG;
  if (zoneId) {
    configPath = buildConfigWithZoneId(zoneId, accountId);
    console.log(`using zone_id=${zoneId}${accountId ? ` account_id=${accountId}` : ''}`);
  } else if (accountId) {
    console.log(`CLOUDFLARE_ACCOUNT_ID set (${accountId}); zone_id not set — wrangler will use zone_name`);
  }

  const wranglerArgs = ['wrangler', 'deploy', '--config', configPath];
  if (dryRun) {
    console.log(`[dry-run] would run: npx ${wranglerArgs.join(' ')}`);
    console.log('Secrets must already exist (GATE_PASSWORD, GATE_HMAC_SECRET, GALLERY_JWT_SECRET).');
    console.log('Re-run with --apply when orange-cloud is verified and secrets are set.');
    return;
  }

  const env = { ...process.env };
  if (accountId) env.CLOUDFLARE_ACCOUNT_ID = accountId;

  const result = spawnSync('npx', wranglerArgs, {
    stdio: 'inherit',
    env,
    cwd: path.resolve(HERE, '..'),
  });
  if (result.status !== 0) {
    printZoneHelp();
    process.exit(result.status ?? 1);
  }
  console.log('Deploy finished. Spot-check:');
  console.log(`  curl -sI https://${ZONE}/photos/still-life/color/cheers.jpg | grep -iE 'HTTP|cf-'`);
  console.log('  npm run hosting:verify-edge');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
