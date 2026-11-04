#!/usr/bin/env node
/**
 * Part 2 automation: prepare Cloudflare so AI bot / cache / WAF controls work
 * in front of GitHub Pages (orange-cloud proxy).
 *
 * Default is dry-run. Nothing mutates the zone until you pass --apply.
 *
 * Safe order (matches docs/ai-crawler-controls.md):
 *   1) ssl          pin SSL/TLS to Full; leave Always Use HTTPS off
 *   2) rules        www→apex redirect + ACME cache bypass
 *   3) bots         AI bot settings (best-effort) + WAF UA block rule
 *   4) dns          orange-cloud apex A/AAAA + www CNAME
 *   5) cache        gallery photo Cache Rules (same as hosting:photo-cache-rules)
 *   6) always-https only after verify (opt-in: --phase always-https)
 *   7) verify       live curl checks (no token needed for public curls)
 *
 *   CLOUDFLARE_API_TOKEN='…' npm run hosting:orange-cloud -- --dry-run
 *   CLOUDFLARE_API_TOKEN='…' npm run hosting:orange-cloud -- --apply --phase ssl,rules
 *   CLOUDFLARE_API_TOKEN='…' npm run hosting:orange-cloud -- --apply --phase dns
 *   npm run hosting:verify-edge
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  ZONE_NAME,
  cf,
  requireToken,
  resolveZone,
  ensurePhaseRule,
  tryPatchSetting,
} from './cf-api.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const AI_UA_EXPRESSION = [
  '(http.user_agent contains "GPTBot")',
  '(http.user_agent contains "ClaudeBot")',
  '(http.user_agent contains "anthropic-ai")',
  '(http.user_agent contains "CCBot")',
  '(http.user_agent contains "Bytespider")',
  '(http.user_agent contains "Amazonbot")',
  '(http.user_agent contains "meta-externalagent")',
  '(http.user_agent contains "Diffbot")',
  '(http.user_agent contains "ImagesiftBot")',
  '(http.user_agent contains "Google-Extended")',
  '(http.user_agent contains "Applebot-Extended")',
  '(http.user_agent contains "PerplexityBot")',
  '(http.user_agent contains "OAI-SearchBot")',
  '(http.user_agent contains "ChatGPT-User")',
  '(http.user_agent contains "Claude-User")',
  '(http.user_agent contains "meta-externalfetcher")',
].join(' or ');

const ALL_PHASES = ['ssl', 'rules', 'bots', 'dns', 'cache', 'always-https', 'verify'];

function parseArgs(argv) {
  const apply = argv.includes('--apply');
  const dryRun = !apply;
  const phaseArg = argv.find((a) => a.startsWith('--phase='))?.slice('--phase='.length)
    ?? (argv.includes('--phase') ? argv[argv.indexOf('--phase') + 1] : null);
  const phases = phaseArg
    ? phaseArg.split(',').map((p) => p.trim()).filter(Boolean)
    : ALL_PHASES.filter((p) => p !== 'always-https');
  for (const p of phases) {
    if (!ALL_PHASES.includes(p)) {
      throw new Error(`Unknown phase "${p}". Valid: ${ALL_PHASES.join(', ')}`);
    }
  }
  return { dryRun, phases };
}

async function phaseSsl(token, zoneId, dryRun) {
  console.log('\n== ssl ==');
  await tryPatchSetting(token, zoneId, 'ssl', 'full', { dryRun });
  // Prefer pinning Full over Automatic SSL/TLS ratcheting toward strict.
  await tryPatchSetting(token, zoneId, 'ssl_automatic_mode', 'custom', { dryRun });
  await tryPatchSetting(token, zoneId, 'min_tls_version', '1.2', { dryRun });
  // Keep off until after DNS is proxied and curl looks clean.
  await tryPatchSetting(token, zoneId, 'always_use_https', 'off', { dryRun });
  console.log('note: leave HSTS off until you commit to staying proxied.');
}

async function phaseRules(token, zoneId, dryRun) {
  console.log('\n== rules ==');
  await ensurePhaseRule(
    token,
    zoneId,
    'http_request_dynamic_redirect',
    {
      rulesetName: 'adubs www redirect',
      description: 'www → apex (adubs.site)',
      expression: '(http.host eq "www.adubs.site")',
      action: 'redirect',
      action_parameters: {
        from_value: {
          status_code: 301,
          target_url: {
            expression: 'concat("https://adubs.site", http.request.uri.path)',
          },
          preserve_query_string: true,
        },
      },
    },
    { dryRun },
  );

  await ensurePhaseRule(
    token,
    zoneId,
    'http_request_cache_settings',
    {
      rulesetName: 'adubs ACME bypass',
      description: 'ACME challenge — bypass cache',
      expression: 'starts_with(http.request.uri.path, "/.well-known/acme-challenge/")',
      action: 'set_cache_settings',
      action_parameters: {
        cache: false,
      },
    },
    { dryRun },
  );
}

async function phaseBots(token, zoneId, dryRun) {
  console.log('\n== bots ==');
  // Best-effort zone settings (names differ by plan / rollout). Soft-fail.
  await tryPatchSetting(token, zoneId, 'ai_bots_protection', 'block', { dryRun });
  await tryPatchSetting(token, zoneId, 'ai_labyrinth', 'on', { dryRun });
  // Bot Fight Mode can false-positive; leave off by default. Opt in via env.
  if (process.env.HOSTING_ENABLE_BOT_FIGHT === '1') {
    await tryPatchSetting(token, zoneId, 'browser_check', 'on', { dryRun });
    await tryPatchSetting(token, zoneId, 'security_level', 'medium', { dryRun });
  } else {
    console.log('Bot Fight Mode not auto-enabled (set HOSTING_ENABLE_BOT_FIGHT=1 to try).');
  }

  await ensurePhaseRule(
    token,
    zoneId,
    'http_request_firewall_custom',
    {
      rulesetName: 'adubs AI crawler UA blocks',
      description: 'Block known AI crawler / agent user-agents',
      expression: AI_UA_EXPRESSION,
      action: 'block',
    },
    { dryRun },
  );
  console.log(
    'Dashboard still required for Search/Training/Agent policy presets if zone settings above 400.',
  );
}

async function phaseDns(token, zoneId, dryRun) {
  console.log('\n== dns ==');
  const records = await cf(token, 'GET', `/zones/${zoneId}/dns_records?per_page=100`);
  const list = Array.isArray(records) ? records : records?.result ?? [];
  const targets = list.filter((r) => {
    const name = r.name?.replace(/\.$/, '');
    if (name !== ZONE_NAME && name !== `www.${ZONE_NAME}`) return false;
    return r.type === 'A' || r.type === 'AAAA' || r.type === 'CNAME';
  });

  if (!targets.length) {
    throw new Error(`No apex/www A/AAAA/CNAME records found in zone ${ZONE_NAME}`);
  }

  for (const r of targets) {
    if (r.proxied === true) {
      console.log(`already proxied: ${r.type} ${r.name} → ${r.content}`);
      continue;
    }
    if (dryRun) {
      console.log(`[dry-run] would proxy ${r.type} ${r.name} → ${r.content}`);
      continue;
    }
    await cf(token, 'PATCH', `/zones/${zoneId}/dns_records/${r.id}`, {
      proxied: true,
      type: r.type,
      name: r.name,
      content: r.content,
      ttl: 1,
    });
    console.log(`proxied: ${r.type} ${r.name} → ${r.content}`);
  }
}

async function phaseCache(dryRun) {
  console.log('\n== cache ==');
  const script = path.join(HERE, 'apply-photo-cache-rules.mjs');
  if (dryRun) {
    console.log(`[dry-run] would run: node ${script}`);
    console.log('          (pass --apply --phase cache to mutate Cache Rules)');
    return;
  }
  const result = spawnSync(process.execPath, [script], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error('hosting/apply-photo-cache-rules.mjs failed');
  }
}

async function phaseAlwaysHttps(token, zoneId, dryRun) {
  console.log('\n== always-https ==');
  console.log('Only enable after verify shows cf-ray and no redirect loops.');
  await tryPatchSetting(token, zoneId, 'always_use_https', 'on', { dryRun });
}

async function phaseVerify() {
  console.log('\n== verify ==');
  const script = path.join(HERE, 'verify-edge.mjs');
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  if (result.status !== 0) process.exitCode = result.status ?? 1;
}

async function main() {
  const { dryRun, phases } = parseArgs(process.argv.slice(2));
  console.log(`adubs.site orange-cloud automation (${dryRun ? 'DRY-RUN' : 'APPLY'})`);
  console.log(`phases: ${phases.join(', ')}`);

  const needsApi = phases.some((p) => p !== 'verify' && !(p === 'cache' && dryRun));
  let token;
  let zone;
  if (needsApi || phases.includes('cache') && !dryRun) {
    token = requireToken();
    zone = await resolveZone(token);
    console.log(`zone ${ZONE_NAME} id=${zone.id} plan=${zone.plan?.name ?? '?'}`);
  }

  for (const phase of phases) {
    switch (phase) {
      case 'ssl':
        await phaseSsl(token, zone.id, dryRun);
        break;
      case 'rules':
        await phaseRules(token, zone.id, dryRun);
        break;
      case 'bots':
        await phaseBots(token, zone.id, dryRun);
        break;
      case 'dns':
        await phaseDns(token, zone.id, dryRun);
        break;
      case 'cache':
        await phaseCache(dryRun);
        break;
      case 'always-https':
        await phaseAlwaysHttps(token, zone.id, dryRun);
        break;
      case 'verify':
        await phaseVerify();
        break;
      default: {
        const _exhaustive = phase;
        throw new Error(`Unhandled phase: ${_exhaustive}`);
      }
    }
  }

  if (dryRun) {
    console.log(`\nDry-run only. Re-run with --apply when ready.`);
    console.log(`Suggested apply sequence:`);
    console.log(`  1) --apply --phase ssl,rules,bots`);
    console.log(`  2) --apply --phase dns`);
    console.log(`  3) npm run hosting:verify-edge`);
    console.log(`  4) --apply --phase cache`);
    console.log(`  5) --apply --phase always-https   # after clean verify`);
    console.log(`Then: npm run hosting:photo-gate:deploy`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
