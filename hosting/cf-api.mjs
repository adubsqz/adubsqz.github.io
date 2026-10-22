/**
 * Tiny Cloudflare API helper shared by hosting/*.mjs scripts.
 */

export const ZONE_NAME = 'adubs.site';
export const API = 'https://api.cloudflare.com/client/v4';

export async function cf(token, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.success) {
    const err = new Error(
      `Cloudflare ${method} ${path} failed (${res.status}): ${JSON.stringify(json.errors ?? json)}`,
    );
    err.status = res.status;
    err.errors = json.errors;
    throw err;
  }
  return json.result;
}

export function requireToken() {
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!token) {
    console.error(`Missing CLOUDFLARE_API_TOKEN.

Create a custom API token at https://dash.cloudflare.com/profile/api-tokens
with (zone-scoped to ${ZONE_NAME}):
  Zone → Zone → Read
  Zone → Zone Settings → Edit
  Zone → DNS → Edit
  Zone → Cache Rules → Edit
  Zone → Firewall Services → Edit
  Zone → Dynamic Redirect → Edit  (or Rulesets Write)

Then:
  CLOUDFLARE_API_TOKEN='…' npm run hosting:orange-cloud -- --dry-run
`);
    process.exit(1);
  }
  return token;
}

export async function resolveZone(token, zoneName = ZONE_NAME) {
  const zones = await cf(token, 'GET', `/zones?name=${encodeURIComponent(zoneName)}`);
  const zone = Array.isArray(zones) ? zones[0] : null;
  if (!zone?.id) throw new Error(`Zone not found for this token: ${zoneName}`);
  return zone;
}

export function serializeRules(rules) {
  return rules.map((r) => ({
    expression: r.expression,
    description: r.description,
    action: r.action,
    action_parameters: r.action_parameters,
    enabled: r.enabled !== false,
  }));
}

/** Upsert one rule by description into a zone phase entrypoint. */
export async function ensurePhaseRule(token, zoneId, phase, rule, { dryRun = false } = {}) {
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

  if (dryRun) {
    console.log(
      `[dry-run] would ${entry ? 'update' : 'create'} phase=${phase} rule="${rule.description}" (keep ${others.length} other)`,
    );
    return;
  }

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

export async function patchSetting(token, zoneId, setting, value, { dryRun = false } = {}) {
  if (dryRun) {
    console.log(`[dry-run] would PATCH settings/${setting} => ${JSON.stringify(value)}`);
    return { id: setting, value };
  }
  return cf(token, 'PATCH', `/zones/${zoneId}/settings/${setting}`, { value });
}

/** Soft-set a zone setting; ignore 400/404 (plan / unknown id). */
export async function tryPatchSetting(token, zoneId, setting, value, { dryRun = false } = {}) {
  try {
    const result = await patchSetting(token, zoneId, setting, value, { dryRun });
    console.log(`settings/${setting} => ${JSON.stringify(result.value ?? value)}`);
    return true;
  } catch (e) {
    console.warn(`settings/${setting} skipped: ${e.message}`);
    return false;
  }
}
