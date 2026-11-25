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
  // Temp config lives outside hosting/photo-gate/, so pin main to an absolute path
  // (Wrangler resolves main relative to the config file otherwise → missing entry-point).
  const mainAbs = path.join(HERE, 'photo-gate', 'src', 'index.js');
  next = next.replace(/^main\s*=\s*"src\/index\.js"\s*$/m, `main = ${JSON.stringify(mainAbs)}`);
  const dir = mkdtempSync(path.join(tmpdir(), 'adubs-photo-gate-'));
  const out = path.join(dir, 'wrangler.toml');
  writeFileSync(out, next, 'utf8');
  return out;
}

function looksLikeZoneMismatch(stderrText) {
  return /could not find zone|zone_id|zone_name|authentication error|10000|1001/i.test(
    stderrText || '',
  );
}

function printZoneHelp() {
  console.error(`
Could not attach routes for ${ZONE}.

Common causes:

1) API token can edit Workers Scripts but not Zone Workers Routes
   (Account token with no zone resource → /zones returns empty; route attach 403).
   Recreate the token with the "Edit Cloudflare Workers" template AND
   Zone resources → Include → Specific zone → ${ZONE}
   (needs Workers Scripts:Edit + Workers Routes:Edit on that zone).
   https://dash.cloudflare.com/profile/api-tokens

2) Wrong account / zone IDs (DNS can still show cf-ray):
     npx wrangler whoami
     export CLOUDFLARE_ACCOUNT_ID='…'   # Overview sidebar
     export CLOUDFLARE_ZONE_ID='…'
     npm run hosting:photo-gate:deploy -- --apply

3) Or attach the four routes once in the dashboard, then re-run deploy:
     https://dash.cloudflare.com → ${ZONE} → Workers Routes
     patterns: ${ZONE}/photos/*, www.${ZONE}/photos/*,
               ${ZONE}/api/gate-unlock, www.${ZONE}/api/gate-unlock
`);
}

/** Fail fast when the token cannot read zone Workers Routes (route attach will 403). */
async function preflightZoneRouteAccess(zoneId) {
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!token || !zoneId) return { ok: true, skipped: true };

  const res = await fetch(`${API}/zones/${zoneId}/workers/routes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (res.ok && json.success) {
    return { ok: true, routeCount: (json.result || []).length };
  }
  const msg = (json.errors || []).map((e) => e.message || e.code).join('; ') || `HTTP ${res.status}`;
  return { ok: false, msg };
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

  if (zoneId) {
    const routeAccess = await preflightZoneRouteAccess(zoneId);
    if (!routeAccess.skipped) {
      if (routeAccess.ok) {
        console.log(`zone Workers Routes readable (existing=${routeAccess.routeCount})`);
      } else {
        console.error(`zone Workers Routes NOT readable: ${routeAccess.msg}`);
        console.error(
          'Token can upload the Worker but cannot attach /photos/* routes without Zone → Workers Routes:Edit on adubs.site.',
        );
        if (apply && !force) {
          printZoneHelp();
          process.exit(1);
        }
        if (apply && force) {
          console.warn('--force: deploying script anyway (routes will likely still fail)');
        }
      }
    }
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
    encoding: 'utf8',
    env,
    cwd: path.resolve(HERE, '..'),
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    const errBlob = `${result.stderr || ''}${result.stdout || ''}${result.error || ''}`;
    if (looksLikeZoneMismatch(errBlob)) {
      printZoneHelp();
    }
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
