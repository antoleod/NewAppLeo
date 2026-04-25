import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const distDir = join(process.cwd(), 'dist');
const basePath = process.env.EXPO_BASE_PATH || '/AppLeo';

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

function withBase(path) {
  return `${basePath}${path}`;
}

if (!existsSync(distDir)) {
  process.exit(0);
}

for (const file of walk(distDir).filter((path) => path.endsWith('.html'))) {
  let html = readFileSync(file, 'utf8');
  html = html
    .replaceAll('/BabyFlow/', `${basePath}/`)
    .replaceAll('href="/manifest.json"', `href="${withBase('/manifest.json')}"`)
    .replaceAll('href="/logo192.png"', `href="${withBase('/logo192.png')}"`)
    .replaceAll('href="/logo512.png"', `href="${withBase('/logo512.png')}"`);
  writeFileSync(file, html);
}

const manifestPath = join(distDir, 'manifest.json');
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.start_url = `${basePath}/`;
  manifest.scope = `${basePath}/`;
  manifest.icons = (manifest.icons ?? []).map((icon) => ({
    ...icon,
    src: icon.src?.startsWith('/') ? withBase(icon.src) : icon.src,
  }));
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
