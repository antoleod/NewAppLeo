import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distHtml = resolve(__dirname, '..', 'dist', 'index.html');

if (!existsSync(distHtml)) {
  console.error('[inject-pwa] dist/index.html not found — run `expo export --platform web` first.');
  process.exit(1);
}

const PWA_HEAD = `
    <meta name="theme-color" content="#0D1117" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="BabyFlow" />
    <link rel="manifest" href="/NewAppLeo/manifest.json" />
    <link rel="apple-touch-icon" href="/NewAppLeo/apple-touch-icon.png?v=5" />
    <link rel="apple-touch-icon" sizes="180x180" href="/NewAppLeo/apple-touch-icon.png?v=5" />
    <link rel="icon" type="image/png" href="/NewAppLeo/favicon.png?v=5" />
    <link rel="shortcut icon" href="/NewAppLeo/favicon.png?v=5" />`;

const PWA_BODY = `
    <script>
      window.__pwaInstallPrompt = null;
      window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        window.__pwaInstallPrompt = e;
      });
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/NewAppLeo/sw.js?v=5').catch(function () {});
        });
      }
    </script>`;

let html = readFileSync(distHtml, 'utf8');

if (html.includes('rel="manifest"')) {
  console.log('[inject-pwa] PWA tags already present — skipping.');
  process.exit(0);
}

html = html.replace('</head>', `${PWA_HEAD}\n  </head>`);
html = html.replace('</body>', `${PWA_BODY}\n  </body>`);

writeFileSync(distHtml, html, 'utf8');
console.log('[inject-pwa] PWA tags injected into dist/index.html');
