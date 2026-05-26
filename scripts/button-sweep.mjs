// Button sweep: serves dist/, logs in, then visits each main screen and
// clicks every [role=button] one-by-one, detecting which ones produce NO
// effect (no navigation, no DOM mutation, no dialog) => candidate "dead" button.
//
// Run: node scripts/button-sweep.mjs
import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(rootDir, '..');
const distDir = path.join(projectRoot, 'dist');
const port = 4174;

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.ttf': 'font/ttf',
  };
  return map[ext] ?? 'application/octet-stream';
}

const server = createServer(async (req, res) => {
  try {
    const rawPath = decodeURIComponent(req.url?.split('?')[0] ?? '/');
    let filePath = path.join(distDir, rawPath);
    const exists = await stat(filePath).then(() => true).catch(() => false);
    if (!exists || rawPath.endsWith('/')) filePath = path.join(distDir, 'index.html');
    const data = await readFile(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', mimeType(filePath));
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
});
await new Promise((resolve) => server.listen(port, resolve));
const baseUrl = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`));
page.on('dialog', async (d) => { await d.dismiss().catch(() => {}); });

const now = Date.now();
const account = {
  displayName: `Sweep ${now}`,
  username: `sweep${String(now).slice(-8)}`,
  email: `sweep.${now}@example.com`,
  password: 'Passw0rd!23',
  pin: '123456',
};

// Detect whether a click produced any observable effect.
async function clickAndDetect(page, locator) {
  await page.evaluate(() => {
    window.__sweepChanged = false;
    window.__sweepUrl = location.href;
    if (window.__sweepObs) window.__sweepObs.disconnect();
    window.__sweepObs = new MutationObserver(() => { window.__sweepChanged = true; });
    window.__sweepObs.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
  });
  let clickError = null;
  try {
    await locator.click({ timeout: 2500, trial: false });
  } catch (e) {
    clickError = e.message.split('\n')[0];
  }
  await page.waitForTimeout(550);
  const result = await page.evaluate(() => ({
    changed: window.__sweepChanged,
    navigated: location.href !== window.__sweepUrl,
  }));
  return { ...result, clickError };
}

async function login(page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByText('Welcome back').waitFor({ timeout: 25000 });
  await page.goto(`${baseUrl}/register`, { waitUntil: 'networkidle' });
  await page.getByText('Create an account').waitFor({ timeout: 10000 });
  const ri = page.locator('input');
  await ri.nth(0).fill(account.displayName);
  await ri.nth(1).fill(account.username);
  await ri.nth(2).fill(account.email);
  await ri.nth(3).fill(account.password);
  await ri.nth(4).fill(account.pin);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/onboarding$/, { timeout: 30000 });
  await page.getByText('Finish your workspace').waitFor({ timeout: 30000 });
  let inp = page.locator('input');
  await inp.nth(0).fill('Test Caregiver');
  await inp.nth(1).fill('Leo');
  await inp.nth(2).fill('2025-10-21');
  await page.getByText('Continue', { exact: true }).click();
  await page.waitForTimeout(500);
  inp = page.locator('input');
  await inp.nth(0).fill('8');
  await inp.nth(1).fill('14');
  await inp.nth(2).fill('6');
  await page.getByText('Continue', { exact: true }).click();
  await page.waitForTimeout(500);
  await page.getByText('Theme mode').waitFor({ timeout: 10000 });
  await page.getByText('Enter app', { exact: true }).click();
  await page.waitForURL(/\/home$/, { timeout: 20000 });
  await page.getByText('Dashboard', { exact: true }).waitFor({ timeout: 20000 });
}

// Sweep one screen: re-navigate fresh, enumerate role=button, click nth, reset.
async function sweepScreen(page, name, urlPath, readyText) {
  const report = { name, urlPath, buttons: [], error: null };
  try {
    await page.goto(`${baseUrl}${urlPath}`, { waitUntil: 'load' });
    if (readyText) await page.getByText(readyText, { exact: false }).first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(800);
  } catch (e) {
    report.error = `screen load failed: ${e.message.split('\n')[0]}`;
    return report;
  }
  const buttons = page.locator('[role="button"]');
  const count = await buttons.count();
  // capture labels first (stable), then click by index with fresh reload between
  const labels = [];
  for (let i = 0; i < count; i++) {
    const b = buttons.nth(i);
    const label = (await b.getAttribute('aria-label')) || (await b.innerText().catch(() => '')) || `<button #${i}>`;
    labels.push(label.replace(/\s+/g, ' ').trim().slice(0, 40) || `<button #${i}>`);
  }
  for (let i = 0; i < count; i++) {
    // fresh state each click to avoid cascading nav/modals
    await page.goto(`${baseUrl}${urlPath}`, { waitUntil: 'load' });
    if (readyText) await page.getByText(readyText, { exact: false }).first().waitFor({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);
    const b = page.locator('[role="button"]').nth(i);
    const visible = await b.isVisible().catch(() => false);
    if (!visible) { report.buttons.push({ i, label: labels[i], status: 'HIDDEN' }); continue; }
    const r = await clickAndDetect(page, b);
    let status;
    if (r.clickError) status = `CLICK_ERR (${r.clickError})`;
    else if (r.navigated) status = 'NAV';
    else if (r.changed) status = 'WORKS';
    else status = 'DEAD?';
    report.buttons.push({ i, label: labels[i], status });
  }
  return report;
}

const screens = [
  { name: 'Home', urlPath: '/home', readyText: 'Dashboard' },
  { name: 'History', urlPath: '/history', readyText: null },
  { name: 'Insights', urlPath: '/insights', readyText: null },
  { name: 'Profile', urlPath: '/profile', readyText: 'Settings' },
  { name: 'Settings/Theme', urlPath: '/(app)/(tabs)/settings-theme', readyText: null },
  { name: 'Entry: feed', urlPath: '/entry/feed', readyText: null },
  { name: 'Entry: food', urlPath: '/entry/food', readyText: null },
  { name: 'Entry: sleep', urlPath: '/entry/sleep', readyText: null },
  { name: 'Entry: diaper', urlPath: '/entry/diaper', readyText: null },
  { name: 'Entry: medication', urlPath: '/entry/medication', readyText: null },
  { name: 'Entry: vaccine', urlPath: '/entry/vaccine', readyText: null },
  { name: 'Entry: measurement', urlPath: '/entry/measurement', readyText: null },
  { name: 'Entry: symptom', urlPath: '/entry/symptom', readyText: null },
  { name: 'Entry: temperature', urlPath: '/entry/temperature', readyText: null },
  { name: 'Entry: milestone', urlPath: '/entry/milestone', readyText: null },
  { name: 'Entry: pump', urlPath: '/entry/pump', readyText: null },
];

const allReports = [];
try {
  console.log('Logging in...');
  await login(page);
  console.log('Logged in. Starting button sweep.\n');
  for (const s of screens) {
    console.log(`Sweeping ${s.name} (${s.urlPath})...`);
    const r = await sweepScreen(page, s.name, s.urlPath, s.readyText);
    allReports.push(r);
  }

  console.log('\n\n========== BUTTON SWEEP REPORT ==========\n');
  for (const r of allReports) {
    console.log(`### ${r.name}  (${r.urlPath})`);
    if (r.error) { console.log(`  ERROR: ${r.error}\n`); continue; }
    const dead = r.buttons.filter((b) => b.status.startsWith('DEAD'));
    const errs = r.buttons.filter((b) => b.status.startsWith('CLICK_ERR'));
    console.log(`  total=${r.buttons.length}  dead?=${dead.length}  clickErr=${errs.length}`);
    for (const b of r.buttons) {
      const mark = b.status.startsWith('DEAD') ? ' <<< DEAD' : b.status.startsWith('CLICK_ERR') ? ' <<< ERR' : '';
      console.log(`    [${b.status}] "${b.label}"${mark}`);
    }
    console.log('');
  }
  console.log('========== CONSOLE ERRORS ==========');
  console.log(consoleErrors.length ? consoleErrors.slice(0, 40).join('\n') : '(none)');
} catch (error) {
  console.error('Sweep failed:', error);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
