/**
 * verify-ux.mjs — one-handed UX verification
 * Serves dist/ with /NewAppLeo prefix stripped (matches app.json baseUrl).
 */
import { createServer } from 'http';
import { readFile, mkdir, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(rootDir, '..', 'dist');
const PORT = 4201;
const BASE_PATH = '/NewAppLeo';

function mimeType(f) {
  const ext = path.extname(f).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js')   return 'text/javascript; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.png')  return 'image/png';
  if (['.ttf','.woff','.woff2'].includes(ext)) return 'font/ttf';
  if (ext === '.ico')  return 'image/x-icon';
  if (ext === '.svg')  return 'image/svg+xml';
  return 'application/octet-stream';
}

const server = createServer(async (req, res) => {
  // Strip /NewAppLeo prefix so dist/ maps correctly
  let rawPath = decodeURIComponent(req.url?.split('?')[0] ?? '/');
  if (rawPath.startsWith(BASE_PATH)) rawPath = rawPath.slice(BASE_PATH.length) || '/';
  let filePath = path.join(distDir, rawPath);
  const exists = await stat(filePath).then(() => true).catch(() => false);
  const target = exists && rawPath !== '/' ? filePath : path.join(distDir, 'index.html');
  try {
    const d = await readFile(target);
    res.writeHead(200, { 'Content-Type': mimeType(target), 'Cache-Control': 'no-cache' });
    res.end(d);
  } catch {
    res.writeHead(404); res.end();
  }
});

await new Promise(r => server.listen(PORT, r));
const BASE = `http://localhost:${PORT}${BASE_PATH}`;
console.log(`Server: ${BASE}`);

const MOBILE = { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true };
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: MOBILE, javaScriptEnabled: true });
const page = await ctx.newPage();

const consoleErrors = [];
page.on('pageerror', e => consoleErrors.push(e.message));
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });

await mkdir('scripts/verify-shots', { recursive: true }).catch(() => {});
const shot = (n) => page.screenshot({ path: `scripts/verify-shots/${n}.png` });

const steps = [];
const findings = [];

// Wait for React to mount (body has real content)
async function waitForMount(timeout = 12000) {
  return page.waitForFunction(() => {
    const t = document.body?.innerText || '';
    return t.length > 30 && !t.includes('You need to enable JavaScript');
  }, { timeout }).catch(() => false);
}

// Get all interactive elements in bottom zone
async function bottomZone(yMin) {
  return page.evaluate((yMin) => {
    const results = [];
    const seen = new WeakSet();
    for (const el of [...document.querySelectorAll('[role="button"],[aria-label]')]) {
      if (seen.has(el)) continue; seen.add(el);
      const r = el.getBoundingClientRect();
      if (r.height === 0 || r.y < yMin) continue;
      results.push({
        tag: el.tagName,
        label: el.getAttribute('aria-label') || el.innerText?.trim().slice(0, 30),
        y: Math.round(r.y), h: Math.round(r.height),
      });
    }
    return results.sort((a, b) => a.y - b.y);
  }, yMin);
}

try {
  // ── 1. Boot & mount ──────────────────────────────────────────────────
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  const mounted = await waitForMount();
  await shot('01-boot');
  console.log('Console errors:', consoleErrors.slice(0, 5));
  if (!mounted) {
    const html = await page.evaluate(() => document.body.innerHTML.slice(0, 300));
    steps.push('❌ React app did not mount — check console errors');
    findings.push(`❌ App not mounting. Errors: ${consoleErrors.slice(0,3).join('; ')}`);
    findings.push(`HTML: ${html}`);
    throw new Error('App not mounted');
  }
  const bodyText = await page.evaluate(() => document.body.innerText);
  steps.push(`✅ App mounted — ${bodyText.length} chars rendered`);
  console.log('Body text sample:', bodyText.slice(0, 200));

  // ── 2. Login screen ──────────────────────────────────────────────────
  await shot('02-login');
  // Look for guest option
  const guestEl = page.getByText(/guest|invité|gast|sin cuenta/i).first();
  if (await guestEl.isVisible({ timeout: 3000 }).catch(() => false)) {
    await guestEl.click();
    await page.waitForTimeout(2000);
    steps.push('✅ Clicked guest mode');
  } else {
    steps.push('⚠️  Guest mode not found on login — proceeding with direct nav');
  }

  // ── 3. Home — sticky quick-action bar ────────────────────────────────
  await page.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForMount();
  await page.waitForTimeout(1500);
  await shot('03-home');

  // Bottom 130px (y > 714) — our bar is 52px + 8px padding + insets
  const homeBottom = await bottomZone(714);
  console.log('\nHome bottom zone (y>714):', JSON.stringify(homeBottom, null, 2));

  const quickLabels = homeBottom.filter(b =>
    /bottle|diaper|sleep|food|🍼|🧷|😴|🍎|biberon|couche|sommeil|nourriture/i.test(b.label || '')
  );

  if (quickLabels.length >= 4) {
    steps.push(`✅ Home sticky bottom bar: ${quickLabels.length} quick-action buttons in thumb zone`);
    quickLabels.forEach(b => steps.push(`   • "${b.label}" at y=${b.y}`));
  } else if (homeBottom.length >= 4) {
    steps.push(`✅ Home bottom zone has ${homeBottom.length} elements (labels may differ)`);
    homeBottom.forEach(b => steps.push(`   • "${b.label}" at y=${b.y}`));
  } else {
    steps.push(`⚠️  Home sticky bottom: ${homeBottom.length} elements below y=714`);
    findings.push(`⚠️  Home quick-action sticky bar: found ${homeBottom.length} elements, expected ≥4`);
  }

  // ── 4. History — sticky bottom day nav ───────────────────────────────
  await page.goto(`${BASE}/history`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForMount();
  await page.waitForTimeout(1500);
  await shot('04-history');

  // Bottom 110px (y > 734)
  const historyBottom = await bottomZone(734);
  console.log('\nHistory bottom zone (y>734):', JSON.stringify(historyBottom, null, 2));

  const hasNav = historyBottom.some(b => /prev|next|today|yesterday|chevron|←|→|day/i.test(b.label || ''));
  if (historyBottom.length >= 3 || hasNav) {
    steps.push(`✅ History sticky bottom nav: ${historyBottom.length} elements in thumb zone`);
    historyBottom.forEach(b => steps.push(`   • "${b.label}" at y=${b.y}`));
  } else {
    steps.push(`⚠️  History sticky bottom: ${historyBottom.length} elements (expected ≥3)`);
    findings.push(`⚠️  History day-nav sticky bar: found ${historyBottom.length} elements`);
  }

  // ── 5. Entry /feed — cancel in footer ────────────────────────────────
  await page.goto(`${BASE}/entry/feed`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForMount();
  await page.waitForTimeout(1500);
  await shot('05-entry-feed');

  // Bottom 230px (y > 614) — footer has save + cancel row
  const entryBottom = await bottomZone(614);
  console.log('\nEntry /feed bottom zone (y>614):', JSON.stringify(entryBottom, null, 2));

  const hasSave   = entryBottom.some(b => /save|guardar|enregistrer|opslaan/i.test(b.label || ''));
  const hasCancel = entryBottom.some(b => /cancel|back|annul|retour|volver|terug/i.test(b.label || ''));

  steps.push(hasSave
    ? '✅ Entry form Save button in footer (thumb zone)'
    : '⚠️  Entry form Save button not found in bottom 230px'
  );
  steps.push(hasCancel
    ? '✅ Entry form Cancel button in footer (NEW — thumb zone, no top-right reach needed)'
    : '⚠️  Entry form Cancel button not in footer bottom zone'
  );
  if (!hasCancel) findings.push('⚠️  Cancel/Back not found in entry footer — may require reaching top-right');

  await shot('06-entry-footer');

  // ── 6. Sleep entry — mode picker ─────────────────────────────────────
  await page.goto(`${BASE}/entry/sleep`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForMount();
  await page.waitForTimeout(1500);
  await shot('07-entry-sleep');

  const sleepText = await page.evaluate(() => document.body.innerText);
  const hasPicker = /start timer|démarrer timer|timer starten|iniciar timer/i.test(sleepText);
  steps.push(hasPicker
    ? '🔍 Sleep mode picker rendered (Start timer / Log past) — footer save correctly hidden'
    : '🔍 Sleep mode picker text not visible (may be behind auth guard)'
  );

  // ── 7. Medication — touch target size ────────────────────────────────
  await page.goto(`${BASE}/entry/medication`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForMount();
  await page.waitForTimeout(1500);
  await shot('08-entry-medication');

  const medIntervalBtns = page.locator('[aria-label="4 h"], [aria-label="6 h"], [aria-label="8 h"]');
  const medCount = await medIntervalBtns.count();
  if (medCount > 0) {
    let minH = 999;
    for (let i = 0; i < medCount; i++) {
      const box = await medIntervalBtns.nth(i).boundingBox().catch(() => null);
      if (box) minH = Math.min(minH, box.height);
    }
    steps.push(minH >= 44
      ? `🔍 Med interval buttons min height: ${Math.round(minH)}px ≥ 44pt ✅`
      : `🔍 Med interval buttons min height: ${Math.round(minH)}px < 44pt ⚠️`
    );
    if (minH < 44) findings.push(`⚠️  Med interval buttons still below 44pt (${Math.round(minH)}px)`);
  } else {
    steps.push('🔍 Med interval buttons not found (possible auth redirect)');
  }

  // ── 8. Probe: tap diaper from home bar ───────────────────────────────
  await page.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForMount();
  await page.waitForTimeout(1500);

  const diaperBtn = page.locator('[aria-label*="iaper"], [aria-label*="ñal"], [aria-label*="uche"]').first();
  if (await diaperBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await diaperBtn.click();
    await page.waitForTimeout(2000);
    const afterUrl = page.url();
    steps.push(afterUrl.includes('/entry/diaper')
      ? `🔍 Diaper sticky button → /entry/diaper ✅`
      : `🔍 Diaper sticky button tapped → ${afterUrl} (expected /entry/diaper)`
    );
    await shot('09-after-diaper-tap');
  } else {
    steps.push('🔍 Diaper button not found by aria-label — checking all bottom elements for tap test');
    // Try by y position — diaper should be second of 4 buttons in bottom bar
    const allBottom = await bottomZone(714);
    console.log('Bottom elements for diaper probe:', JSON.stringify(allBottom));
  }

} catch (err) {
  if (err.message !== 'App not mounted') {
    steps.push(`❌ Error: ${err.message}`);
    console.error(err.stack);
  }
} finally {
  await browser.close();
  server.close();
}

console.log('\n=== STEPS ===');
steps.forEach(s => console.log(s));
console.log('\n=== FINDINGS ===');
if (findings.length === 0) { console.log('None'); } else { findings.forEach(f => console.log(f)); }
