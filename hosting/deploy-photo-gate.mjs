#!/usr/bin/env node
/**
 * Part 3: deploy the photo-gate Worker (routes for /photos/* + /api/gate-unlock).
 *
 * Default is dry-run. Pass --apply to run wrangler deploy.
 * Orange-cloud DNS should be live first (Part 2); this script checks dig/curl
 * when those tools are available and refuses --apply if still grey-clouded
 * unless you pass --force.
 *
 *   npm run hosting:photo-gate:deploy
 *   npm run hosting:photo-gate:deploy -- --apply
 *
 * Secrets (once, not via this script):
 *   npx wrangler secret put GATE_PASSWORD --config hosting/photo-gate/wrangler.toml
 *   npx wrangler secret put GATE_HMAC_SECRET --config hosting/photo-gate/wrangler.toml
 */

import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ZONE = 'adubs.site';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONFIG = path.join(HERE, 'photo-gate', 'wrangler.toml');

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

  // dig suggested CF but curl failed/unclear — still treat as caution, not hard ok
  if (report.details.some((d) => d.includes('anycast'))) {
    report.ok = true;
  }
  return report;
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

  const wranglerArgs = ['wrangler', 'deploy', '--config', CONFIG];
  if (dryRun) {
    console.log(`[dry-run] would run: npx ${wranglerArgs.join(' ')}`);
    console.log('Secrets must already exist (GATE_PASSWORD, GATE_HMAC_SECRET).');
    console.log('Re-run with --apply when orange-cloud is verified and secrets are set.');
    return;
  }

  const result = spawnSync('npx', wranglerArgs, {
    stdio: 'inherit',
    env: process.env,
    cwd: path.resolve(HERE, '..'),
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  console.log('Deploy finished. Spot-check: npm run hosting:verify-edge');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
