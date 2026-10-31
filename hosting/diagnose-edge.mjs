#!/usr/bin/env node
/**
 * Public, no-token diagnosis of orange-cloud + photo-gate readiness.
 * Explains the usual "Worker exists but zone is on another account" wait state.
 *
 *   npm run hosting:diagnose-edge
 */

import { execSync } from 'node:child_process';

const APEX = 'https://adubs.site';
const SAMPLE_PHOTO =
  process.env.HOSTING_VERIFY_PHOTO_URL?.trim() ||
  'https://adubs.site/photos/still-life/color/cheers.jpg';
const UNLOCK = `${APEX}/api/gate-unlock`;

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (e) {
    return (e.stdout || e.stderr || e.message || '').toString().trim();
  }
}

function line(level, label, detail) {
  const tag = level === 'ok' ? 'OK ' : level === 'wait' ? 'WAIT' : '!! ';
  console.log(`${tag} ${label}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  const blockers = [];
  const waiting = [];

  const dig = sh('dig +short adubs.site A | head -4');
  const ns = sh('dig +short NS adubs.site');
  const cfIps = dig.split('\n').some((ip) => ip.startsWith('104.') || ip.startsWith('172.67.'));
  const ghIps = dig.split('\n').some((ip) => ip.startsWith('185.199.'));
  if (cfIps) {
    line('ok', 'DNS / proxy', `Cloudflare anycast (${dig.replace(/\n/g, ', ')})`);
  } else if (ghIps) {
    line('wait', 'DNS / proxy', 'still GitHub Pages IPs (grey-cloud)');
    waiting.push('orange-cloud DNS (hosting:orange-cloud --phase dns)');
  } else {
    line('fail', 'DNS / proxy', dig || '(empty)');
    blockers.push('DNS for adubs.site');
  }
  if (ns) line('ok', 'nameservers', ns.replace(/\n/g, ', '));

  const apex = await fetch(`${APEX}/`, { method: 'HEAD', redirect: 'manual' });
  const apexCf = apex.headers.get('cf-ray') || /cloudflare/i.test(apex.headers.get('server') || '');
  if (apexCf) {
    line('ok', 'apex edge', `status=${apex.status} cf-ray=${apex.headers.get('cf-ray') || 'yes'}`);
  } else {
    line('wait', 'apex edge', `status=${apex.status} (no cf-ray)`);
    waiting.push('orange-cloud proxy');
  }

  const photo = await fetch(SAMPLE_PHOTO, { method: 'HEAD', redirect: 'manual' });
  const photoCc = photo.headers.get('cache-control') || '?';
  if (photo.status === 403) {
    line('ok', 'photo gate', `403 without cookie (${photoCc})`);
  } else if (photo.status === 200) {
    line(
      'wait',
      'photo gate',
      `public ${photo.status} cache-control=${photoCc} — Worker routes not on this zone`,
    );
    waiting.push(
      'attach adubs-photo-gate routes on the Cloudflare account that owns the adubs.site zone',
    );
  } else {
    line('fail', 'photo gate', `status=${photo.status}`);
    blockers.push('sample photo fetch');
  }

  let unlockStatus = 0;
  let unlockBody = '';
  try {
    const unlock = await fetch(UNLOCK, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: APEX,
      },
      body: JSON.stringify({ password: '__diagnose__' }),
      redirect: 'manual',
    });
    unlockStatus = unlock.status;
    unlockBody = (await unlock.text().catch(() => '')).slice(0, 120);
  } catch (e) {
    unlockBody = String(e.message || e);
  }

  // Live Worker answers 401/403/503 with plain text; Pages/origin answers 404/405 HTML.
  const workerLike =
    unlockStatus === 401 ||
    unlockStatus === 403 ||
    unlockStatus === 503 ||
    (unlockStatus === 400 && !/html/i.test(unlockBody));
  if (workerLike) {
    line('ok', 'gate-unlock route', `Worker responded status=${unlockStatus}`);
  } else if (unlockStatus === 404 || unlockStatus === 405) {
    line(
      'wait',
      'gate-unlock route',
      `status=${unlockStatus} from origin — routes not attached (zone ≠ Worker account)`,
    );
    waiting.push('same Cloudflare account must own both the zone and adubs-photo-gate');
  } else {
    line('wait', 'gate-unlock route', `status=${unlockStatus} body=${unlockBody.slice(0, 60) || '(empty)'}`);
    waiting.push('confirm Worker routes for /api/gate-unlock');
  }

  // SPA flag: look for unlock path string in the main module.
  try {
    const html = await (await fetch(APEX)).text();
    const jsPath = (html.match(/assets\/index-[^"']+\.js/) || [])[0];
    if (jsPath) {
      const js = await (await fetch(`${APEX}/${jsPath}`)).text();
      if (js.includes('gate-unlock') || js.includes('/api/gate-unlock')) {
        line('ok', 'SPA edge flag', 'bundle references gate-unlock (VITE_EDGE_PHOTO_GATE baked)');
      } else {
        line(
          'wait',
          'SPA edge flag',
          'bundle has no gate-unlock — set Actions secret VITE_EDGE_PHOTO_GATE=1 and redeploy Pages',
        );
        waiting.push('GitHub Actions secret VITE_EDGE_PHOTO_GATE=1');
      }
    } else {
      line('wait', 'SPA edge flag', 'could not find main JS asset');
    }
  } catch (e) {
    line('fail', 'SPA edge flag', String(e.message || e));
  }

  console.log('');
  if (blockers.length) {
    console.log('Blockers:');
    for (const b of blockers) console.log(`  - ${b}`);
  }
  if (waiting.length) {
    console.log('Waiting on (code already shipped; ops left):');
    for (const w of [...new Set(waiting)]) console.log(`  - ${w}`);
    console.log('');
    console.log('Typical fix: Cloudflare account that lists adubs.site under Domains must also');
    console.log('own Worker adubs-photo-gate, then set CLOUDFLARE_* + VITE_EDGE_PHOTO_GATE secrets');
    console.log('and re-run Actions → Photo gate. See hosting/AUTOMATION.md.');
  }
  if (!blockers.length && !waiting.length) {
    console.log('Edge looks fully wired.');
  }

  // Non-zero only for hard failures — WAIT is an expected pre-zone-attach state.
  process.exit(blockers.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
