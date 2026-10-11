#!/usr/bin/env node
/**
 * Apply gallery photo Cache Rules on adubs.site via Cloudflare Rulesets API.
 *
 * Token needs: Zone → Cache Rules → Edit, Zone → Zone Settings → Edit,
 * Zone → Zone → Read (cf OAuth login also works via CLOUDFLARE_API_TOKEN).
 * Create: https://dash.cloudflare.com/profile/api-tokens
 *
 *   CLOUDFLARE_API_TOKEN=… npm run hosting:photo-cache-rules
 */

const ZONE_NAME = 'adubs.site';
const API = 'https://api.cloudflare.com/client/v4';
const MAX_AGE = 604_800;
const SWR = 86_400;
const EXPRESSION =
  '(starts_with(http.request.uri.path, "/photos/still-life/") or starts_with(http.request.uri.path, "/photos/sheet/")) and http.request.method eq "GET"';
const CACHE_CONTROL = `public, max-age=${MAX_AGE}, stale-while-revalidate=${SWR}`;

async function cf(token, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) {
    const err = new Error(
      `Cloudflare ${method} ${path} failed (${res.status}): ${JSON.stringify(json.errors ?? json)}`,
    );
    err.status = res.status;
    throw err;
  }
  return json.result;
}

function serializeRules(rules) {
  return rules.map((r) => ({
    expression: r.expression,
    description: r.description,
    action: r.action,
    action_parameters: r.action_parameters,
    enabled: r.enabled !== false,
  }));
}

async function ensurePhaseRule(token, zoneId, phase, rule) {
  let entry = null;
  try {
    entry = await cf(token, 'GET', `/zones/${zoneId}/rulesets/phases/${phase}/entrypoint`);
  } catch (e) {
    if (e.status !== 404) throw e;
  }

  const existing = Array.isArray(entry?.rules) ? entry.rules : [];
  const others = existing.filter((r) => r.description !== rule.description);
  const nextRules = serializeRules([
    {
      expression: rule.expression,
      description: rule.description,
      action: rule.action,
      action_parameters: rule.action_parameters,
      enabled: true,
    },
    ...others,
  ]);

  if (!entry) {
    await cf(token, 'POST', `/zones/${zoneId}/rulesets`, {
      name: rule.rulesetName,
      kind: 'zone',
      phase,
      rules: nextRules,
    });
    console.log(`created phase=${phase} (+ ${rule.description})`);
    return;
  }

  await cf(token, 'PUT', `/zones/${zoneId}/rulesets/phases/${phase}/entrypoint`, {
    rules: nextRules,
  });
  console.log(
    `updated phase=${phase} (ensured ${rule.description}; kept ${others.length} other rule(s))`,
  );
}

async function main() {
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!token) {
    console.error(`Missing CLOUDFLARE_API_TOKEN.

1) Open https://dash.cloudflare.com/profile/api-tokens
2) Create Token → Custom token
3) Permissions:
     Zone → Cache Rules → Edit
     Zone → Zone Settings → Edit
     Zone → Zone → Read
4) Zone Resources: Include → Specific zone → ${ZONE_NAME}
5) Create, copy token, then:

   CLOUDFLARE_API_TOKEN='…' npm run hosting:photo-cache-rules
`);
    process.exit(1);
  }

  const zones = await cf(token, 'GET', `/zones?name=${encodeURIComponent(ZONE_NAME)}`);
  const zone = Array.isArray(zones) ? zones[0] : null;
  if (!zone?.id) throw new Error(`Zone not found for this token: ${ZONE_NAME}`);
  console.log(`zone ${ZONE_NAME} id=${zone.id}`);

  // Free plan: zone Browser Cache TTL wins over Cache Rule browser_ttl / Transform
  // rewrites for the Cache-Control header clients see. Keep it aligned with MAX_AGE.
  const browserTtl = await cf(token, 'PATCH', `/zones/${zone.id}/settings/browser_cache_ttl`, {
    value: MAX_AGE,
  });
  console.log(`zone browser_cache_ttl => ${browserTtl.value}`);

  await ensurePhaseRule(token, zone.id, 'http_request_cache_settings', {
    rulesetName: 'Gallery photo cache settings',
    description: 'Gallery photos — cache at edge',
    expression: EXPRESSION,
    action: 'set_cache_settings',
    action_parameters: {
      cache: true,
      edge_ttl: { mode: 'override_origin', default: MAX_AGE },
      browser_ttl: { mode: 'override_origin', default: MAX_AGE },
      serve_stale: { disable_stale_while_updating: false },
    },
  });

  // Cache Response Rules use operation/value objects (not bare booleans/numbers).
  await ensurePhaseRule(token, zone.id, 'http_response_cache_settings', {
    rulesetName: 'Gallery photo cache response',
    description: 'Gallery photos — browser Cache-Control',
    expression: EXPRESSION,
    action: 'set_cache_control',
    action_parameters: {
      public: { operation: 'set' },
      'max-age': { operation: 'set', value: MAX_AGE },
      'stale-while-revalidate': { operation: 'set', value: SWR },
    },
  });

  console.log(`target Cache-Control: ${CACHE_CONTROL}`);
  console.log('verify:');
  console.log(
    `  curl -sI 'https://adubs.site/photos/still-life/color/cheers.jpg' | grep -iE 'cache-control|cf-cache-status'`,
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
