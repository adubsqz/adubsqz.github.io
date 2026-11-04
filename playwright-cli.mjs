import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
// Always use a repo-local cache so a broken global/sandbox PLAYWRIGHT_BROWSERS_PATH cannot win.
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, '.pw-browsers');

const args = process.argv.slice(2);

if (args[0] === '--wrapper-help' || args[0] === '--agent-help') {
  const browsers = process.env.PLAYWRIGHT_BROWSERS_PATH;
  console.log(`playwright-cli.mjs — repo-local Playwright entry (sets PLAYWRIGHT_BROWSERS_PATH).

All other arguments are passed through to the Playwright CLI unchanged.

Examples:
  npm run test:e2e
  npm run test:e2e -- --project=chromium
  npm run playwright:install
  node playwright-cli.mjs test --list
  node playwright-cli.mjs test e2e/example.spec.ts --headed

Browser cache: ${browsers}
Upstream help: node playwright-cli.mjs help test
`);
  process.exit(0);
}

const cli = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');
if (!fs.existsSync(cli)) {
  console.error(`Error: Playwright CLI not found at:
  ${cli}

Fix:
  npm ci
  npm run playwright:install
`);
  process.exit(1);
}

const result = spawnSync(process.execPath, [cli, ...args], {
  stdio: 'inherit',
  env: process.env,
  cwd: root,
});

process.exit(result.status === null ? 1 : result.status);
