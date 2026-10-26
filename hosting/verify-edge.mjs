#!/usr/bin/env node
/**
 * Live checks for orange-cloud + photo gate.
 * No API token required (public curls + dig).
 *
 *   npm run hosting:verify-edge
 */

import { execSync } from 'node:child_process';

const APEX = 'https://adubs.site';
const WWW = 'https://www.adubs.site';
const SAMPLE_PHOTO =
  process.env.HOSTING_VERIFY_PHOTO_URL?.trim() ||
  'https://adubs.site/photos/still-life/color/cheers.jpg';

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (e) {
    return (e.stdout || e.stderr || e.message || '').toString().trim();
  }
}

async function head(url) {
  const res = await fetch(url, { method: 'HEAD', redirect: 'manual' });
  const headers = Object.fromEntries(res.headers.entries());
  return { status: res.status, headers };
}

function flag(ok, label, detail) {
  console.log(`${ok ? 'OK ' : '!! '} ${label}${detail ? ` — ${detail}` : ''}`);
  return ok;
}

async function main() {
  let failures = 0;

  const dig = sh('dig +short adubs.site A | head -4');
  const ghIps = dig.split('\n').some((ip) => ip.startsWith('185.199.'));
  const cfLikely = dig.split('\n').some((ip) => ip.startsWith('104.') || ip.startsWith('172.67.'));
  if (!flag(!ghIps || cfLikely, 'DNS A records', dig.replace(/\n/g, ', ') || '(empty)')) {
    // grey-cloud still resolves to GitHub — expected until --phase dns
    if (ghIps) {
      console.log('    (still GitHub Pages IPs → grey-cloud; AI/cache edge features inactive)');
    }
  }

  const apex = await head(`${APEX}/`);
  const apexCf = Boolean(apex.headers['cf-ray']);
  const apexServer = apex.headers.server || '';
  if (
    !flag(
      apexCf || /cloudflare/i.test(apexServer),
      'apex cf-ray / server',
      `status=${apex.status} server=${apexServer} cf-ray=${apex.headers['cf-ray'] || 'none'}`,
    )
  ) {
    failures += 1;
  }

  const www = await head(`${WWW}/`);
  const wwwLoc = www.headers.location || '';
  const wwwOk =
    (www.status === 301 || www.status === 302) && wwwLoc.startsWith('https://adubs.site');
  if (
    !flag(
      wwwOk || www.status === 200,
      'www response',
      `status=${www.status} location=${wwwLoc || '(none)'}`,
    )
  ) {
    failures += 1;
  }

  const photo = await head(SAMPLE_PHOTO);
  const photoDetail = `status=${photo.status} cache-control=${photo.headers['cache-control'] || '?'} cf-cache-status=${photo.headers['cf-cache-status'] || 'none'}`;
  const expectGate403 = process.env.HOSTING_VERIFY_EXPECT_PHOTO_403 === '1';
  if (expectGate403) {
    if (!flag(photo.status === 403, 'sample photo HEAD (gate required)', photoDetail)) {
      failures += 1;
      console.log('    (expected 403 without cookie after photo-gate deploy)');
    }
  } else if (!flag(photo.status === 200 || photo.status === 403, 'sample photo HEAD', photoDetail)) {
    failures += 1;
  } else if (photo.status === 403) {
    console.log('    (403 expected once photo-gate Worker is live without cookie)');
  }

  const robots = await fetch(`${APEX}/robots.txt`);
  const robotsText = await robots.text();
  if (!flag(robots.ok && /Content-Signal/i.test(robotsText), 'robots.txt Content-Signal')) {
    failures += 1;
  }

  console.log('');
  if (failures) {
    console.log(`verify finished with ${failures} failure(s).`);
    process.exit(1);
  }
  console.log('verify finished clean.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
