import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const manifestPath = join(root, 'src', 'gallery-manifest.json');
const gitignorePath = join(root, '.gitignore');
const srcPath = join(root, 'src');

const START_MARKER = '# BEGIN AUTO-GENERATED CURATED STILL-LIFE';
const END_MARKER = '# END AUTO-GENERATED CURATED STILL-LIFE';
const STILL_LIFE_IGNORE_ROOT = 'public/photos/still-life';
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const STILL_LIFE_SOURCE_REF_REGEX = /\/photos\/still-life\/([^"'`)\s?#]+)/g;

function toPosixPath(filepath) {
  return filepath.replace(/\\/g, '/');
}

function isSupportedImage(filename) {
  return SUPPORTED_IMAGE_EXTENSIONS.has(extname(filename).toLowerCase());
}

function normalizeReference(reference) {
  const cleaned = toPosixPath(reference).replace(/^\/+/, '').replace(/[?#].*$/, '');
  const marker = 'photos/still-life/';
  if (!cleaned.startsWith(marker)) return '';
  return cleaned.slice(marker.length).replace(/^\/+/, '');
}

function collectManifestReferences(manifest) {
  const refs = new Set();
  for (const [gallery, filenames] of Object.entries(manifest)) {
    if (!Array.isArray(filenames)) continue;
    for (const filename of filenames) {
      if (typeof filename !== 'string') continue;
      const trimmed = filename.trim();
      if (!trimmed || !isSupportedImage(trimmed)) continue;
      const normalized = toPosixPath(trimmed).replace(/^\/+/, '');
      if (normalized.includes('/')) {
        refs.add(normalized);
        continue;
      }
      if (gallery === 'bw' || gallery === 'color' || gallery === 'redscale') {
        refs.add(`${gallery}/${normalized}`);
        continue;
      }
      if (gallery === 'still-life') {
        refs.add(normalized);
      }
    }
  }
  return refs;
}

function listSourceFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!SOURCE_EXTENSIONS.has(extname(entry.name).toLowerCase())) continue;
    files.push(fullPath);
  }
  return files;
}

function collectSourceReferences() {
  if (!statSync(srcPath).isDirectory()) return new Set();
  const refs = new Set();
  for (const sourceFile of listSourceFiles(srcPath)) {
    const content = readFileSync(sourceFile, 'utf8');
    for (const match of content.matchAll(STILL_LIFE_SOURCE_REF_REGEX)) {
      const relativePath = normalizeReference(match[0]);
      if (relativePath) refs.add(relativePath);
    }
  }
  return refs;
}

function collectParentDirectories(paths) {
  const dirs = new Set();
  for (const relativePath of paths) {
    const normalized = toPosixPath(relativePath).replace(/^\/+/, '');
    const parts = normalized.split('/');
    if (parts.length <= 1) continue;
    for (let i = 1; i < parts.length; i += 1) {
      dirs.add(parts.slice(0, i).join('/'));
    }
  }
  return [...dirs].sort();
}

function toSortedUnique(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function buildBlock(referencedFiles) {
  const files = toSortedUnique(
    referencedFiles
      .map((file) => toPosixPath(file).replace(/^\/+/, ''))
      .filter((file) => file.length > 0)
  );
  const dirs = collectParentDirectories(files);
  const unignoreDirs = dirs.map((dir) => `!${STILL_LIFE_IGNORE_ROOT}/${dir}/`);
  const unignoreFiles = files.map((file) => `!${STILL_LIFE_IGNORE_ROOT}/${file}`);
  const lines = [
    START_MARKER,
    '# Run: npm run sync:gallery-ignore',
    '# Generated from src/gallery-manifest.json and /photos/still-life/* references in src/',
    `${STILL_LIFE_IGNORE_ROOT}/**`,
    `!${STILL_LIFE_IGNORE_ROOT}/`,
    `!${STILL_LIFE_IGNORE_ROOT}/.gitkeep`,
    ...unignoreDirs,
    ...unignoreFiles,
    END_MARKER,
  ];
  return `${lines.join('\n')}\n`;
}

function readGitignoreContents() {
  try {
    return readFileSync(gitignorePath, 'utf8');
  } catch {
    return '';
  }
}

function upsertManagedBlock(existing, block) {
  const start = existing.indexOf(START_MARKER);
  const end = existing.indexOf(END_MARKER);

  if (start !== -1 && end !== -1 && end >= start) {
    const afterEnd = end + END_MARKER.length;
    const nextChar = existing[afterEnd] === '\n' ? afterEnd + 1 : afterEnd;
    return `${existing.slice(0, start)}${block}${existing.slice(nextChar)}`.trimEnd() + '\n';
  }

  return `${block}\n${existing}`.trimEnd() + '\n';
}

function main() {
  const manifestRaw = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const manifestRefs = collectManifestReferences(manifest);
  const sourceRefs = collectSourceReferences();
  const allRefs = new Set([...manifestRefs, ...sourceRefs]);
  const managedBlock = buildBlock([...allRefs]);

  const existingGitignore = readGitignoreContents();
  const updated = upsertManagedBlock(existingGitignore, managedBlock);
  writeFileSync(gitignorePath, updated, 'utf8');

  console.log(`Updated .gitignore from references (${allRefs.size} files).`);
}

main();
