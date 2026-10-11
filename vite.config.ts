import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { configDefaults } from 'vitest/config';
import { isGalleryPhotoRequest, PHOTO_CACHE_CONTROL } from './hosting/photo-cache';

const STILL_LIFE_PREFIX = '/photos/still-life/';
const SHEET_PREFIX = '/photos/sheet/';
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

function attachGalleryPhotoCacheControl(
  req: { url?: string },
  res: {
    setHeader(name: string, value: string): void;
    writeHead?: (...args: unknown[]) => unknown;
  },
  next: () => void,
): void {
  const url = req.url ?? '';
  const pathname = decodeURIComponent(url.split('?')[0] ?? '');
  if (!isGalleryPhotoRequest(pathname)) {
    next();
    return;
  }

  const originalWriteHead = res.writeHead?.bind(res);
  if (originalWriteHead) {
    res.writeHead = (...args: unknown[]) => {
      res.setHeader('Cache-Control', PHOTO_CACHE_CONTROL);
      return originalWriteHead(...args);
    };
  } else {
    res.setHeader('Cache-Control', PHOTO_CACHE_CONTROL);
  }
  next();
}

function manifestAssetGuardPlugin(): Plugin {
  const guard = (req: { url?: string }, res: { statusCode: number; end: (msg: string) => void }, next: () => void) => {
    const url = req.url ?? '';
    const pathname = decodeURIComponent(url.split('?')[0] ?? '');

    const isStill = pathname.startsWith(STILL_LIFE_PREFIX);
    const isSheet = pathname.startsWith(SHEET_PREFIX);
    if (!isStill && !isSheet) {
      next();
      return;
    }

    const prefix = isSheet ? SHEET_PREFIX : STILL_LIFE_PREFIX;
    const rel = pathname.slice(prefix.length);
    const baseName = rel.split('/').pop() ?? rel;
    if (!IMAGE_EXT.test(baseName)) {
      next();
      return;
    }

    const allowed = loadManifestAllowlist();
    // Sheet thumbs use .jpg; manifest rows may still be .JPG — compare stem paths.
    const relNorm = rel.replace(/\.(jpe?g|png|webp)$/i, '').toLowerCase();
    const ok = [...allowed].some((entry) => {
      const entryNorm = entry.replace(/\.(jpe?g|png|webp)$/i, '').toLowerCase();
      return entryNorm === relNorm || entry === rel;
    });
    if (!ok) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    next();
  };

  return {
    name: 'manifest-asset-guard',
    configureServer(server) {
      server.middlewares.use(attachGalleryPhotoCacheControl);
      server.middlewares.use(guard);
    },
    configurePreviewServer(server) {
      server.middlewares.use(attachGalleryPhotoCacheControl);
      server.middlewares.use(guard);
    },
  };
}

export default defineConfig({
  plugins: [react(), manifestAssetGuardPlugin()],
  // User site (adubsqz.github.io / adubs.site) serves from /
  base: '/',
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
      ignored: ['**/.tmp/**', '**/.tmp', '**/playwright-report/**', '**/test-results/**'],
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
