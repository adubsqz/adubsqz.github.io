import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { configDefaults } from 'vitest/config';

const STILL_LIFE_PREFIX = '/photos/still-life/';
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

function manifestEntryPath(category: string, entry: unknown): string {
  if (typeof entry === 'object' && entry !== null && 'path' in entry) {
    const path = (entry as { path: unknown }).path;
    if (typeof path === 'string') return normalizeManifestEntry(category, path);
    return '';
  }
  if (typeof entry === 'string') return normalizeManifestEntry(category, entry);
  return '';
}

function normalizeManifestEntry(category: string, entry: string): string {
  const normalized = entry.trim().replace(/^\/+/, '');
  if (!normalized) return '';
  if (normalized.includes('/')) return normalized;
  if (category === 'bw' || category === 'color' || category === 'redscale' || category === 'people') {
    return `${category}/${normalized}`;
  }
  return normalized;
}

function loadManifestAllowlist(): Set<string> {
  const manifestPath = path.resolve(process.cwd(), 'src', 'gallery-manifest.json');
  const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
  const allowed = new Set<string>();

  for (const [category, entries] of Object.entries(raw)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      const normalized = manifestEntryPath(category, entry);
      if (!normalized) continue;
      const baseName = normalized.split('/').pop() ?? normalized;
      if (!IMAGE_EXT.test(baseName)) continue;
      allowed.add(normalized);
    }
  }
  return allowed;
}

function manifestAssetGuardPlugin(): Plugin {
  const guard = (req: { url?: string }, res: { statusCode: number; end: (msg: string) => void }, next: () => void) => {
    const url = req.url ?? '';
    const pathname = decodeURIComponent(url.split('?')[0] ?? '');

    if (!pathname.startsWith(STILL_LIFE_PREFIX)) {
      next();
      return;
    }

    const rel = pathname.slice(STILL_LIFE_PREFIX.length);
    const baseName = rel.split('/').pop() ?? rel;
    if (!IMAGE_EXT.test(baseName)) {
      next();
      return;
    }

    const allowed = loadManifestAllowlist();
    if (!allowed.has(rel)) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    next();
  };

  return {
    name: 'manifest-asset-guard',
    configureServer(server) {
      server.middlewares.use(guard);
    },
    configurePreviewServer(server) {
      server.middlewares.use(guard);
    },
  };
}

export default defineConfig({
  plugins: [react(), manifestAssetGuardPlugin()],
  // Project Pages live at https://adubsqz.github.io/adubsqz/
  base: process.env.GITHUB_PAGES === '1' ? '/adubsqz/' : '/',
  build: {
    target: 'es2020',
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/@radix-ui')) {
            return 'radix-vendor';
          }
        },
      },
    },
  },
  server: {
    watch: {
      ignored: ['**/.tmp/**', '**/.tmp'],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: [...configDefaults.exclude, 'e2e/**', 'tests/inquire.api.test.ts', 'tests/inquireEmail.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: './coverage',
      exclude: [
        'src/**/*.test.*',
        'src/test/**',
        'src/vite-env.d.ts',
        'src/main.tsx',
        'src/gallery-manifest.json',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 70,
      },
    },
  },
});
