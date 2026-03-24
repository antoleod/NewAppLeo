import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(rootDir, '..');
const distDir = path.join(projectRoot, 'dist');
const port = 4173;

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.ico':
      return 'image/x-icon';
    case '.svg':
      return 'image/svg+xml';
    case '.ttf':
      return 'font/ttf';
    default:
      return 'application/octet-stream';
  }
}

const server = createServer(async (req, res) => {
  try {
    const rawPath = decodeURIComponent(req.url?.split('?')[0] ?? '/');
    let filePath = path.join(distDir, rawPath);
    const exists = await stat(filePath).then(() => true).catch(() => false);
    if (!exists || rawPath.endsWith('/')) {
      filePath = path.join(distDir, 'index.html');
    }
    const data = await readFile(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', mimeType(filePath));
    res.end(data);
  } catch (error) {
    res.statusCode = 404;
    res.end('Not found');
  }
});

await new Promise((resolve) => server.listen(port, resolve));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });
page.on('console', (message) => {
  console.log(`PAGE ${message.type()}: ${message.text()}`);
});
page.on('pageerror', (error) => {
  console.error('PAGE ERROR:', error);
});
page.on('dialog', async (dialog) => {
  console.log('DIALOG:', dialog.message());
  await dialog.accept().catch(() => undefined);
});
const baseUrl = `http://127.0.0.1:${port}`;
const now = Date.now();
const testAccount = {
  displayName: `Test ${now}`,
  username: `leo${String(now).slice(-8)}`,
  email: `appleo.${now}@example.com`,
  password: 'Passw0rd!23',
  pin: '123456',
};

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByText('Welcome back').waitFor({ timeout: 20000 });
  console.log('Login page loaded');

  await page.goto(`${baseUrl}/register`, { waitUntil: 'networkidle' });
  await page.getByText('Create an account').waitFor({ timeout: 10000 });

  const registerInputs = page.locator('input');
  await registerInputs.nth(0).fill(testAccount.displayName);
  await registerInputs.nth(1).fill(testAccount.username);
  await registerInputs.nth(2).fill(testAccount.email);
  await registerInputs.nth(3).fill(testAccount.password);
  await registerInputs.nth(4).fill(testAccount.pin);
  await page.getByRole('button', { name: 'Create account' }).click();

  try {
    await page.waitForURL(/\/onboarding$/, { timeout: 30000 });
  } catch (error) {
    console.error('Post-register URL:', page.url());
    console.error('Post-register text:', await page.locator('body').innerText().catch(() => 'unavailable'));
    throw error;
  }
  await page.getByText('Finish your workspace').waitFor({ timeout: 30000 });
  console.log('Onboarding page loaded');

  let inputs = page.locator('input');
  await inputs.nth(0).fill('Test Caregiver');
  await inputs.nth(1).fill('Leo');
  await inputs.nth(2).fill('2025-10-21');
  await page.getByText('Continue', { exact: true }).click();
  await page.waitForTimeout(500);

  inputs = page.locator('input');
  await inputs.nth(0).fill('8');
  await inputs.nth(1).fill('14');
  await inputs.nth(2).fill('6');
  await page.getByText('Continue', { exact: true }).click();
  await page.waitForTimeout(500);

  await page.getByText('Theme mode').waitFor({ timeout: 10000 });
  await page.getByText('Enter app', { exact: true }).click();
  await page.waitForURL(/\/home$/, { timeout: 20000 });
  await page.getByText('Dashboard', { exact: true }).waitFor({ timeout: 20000 });
  console.log('Home screen loaded');

  await page.reload({ waitUntil: 'load' });
  await page.getByText('Dashboard', { exact: true }).waitFor({ timeout: 20000 });
  console.log('Session persisted after reload');

  await page.goto(`${baseUrl}/profile`, { waitUntil: 'load' });
  await page.getByText('Settings').waitFor({ timeout: 20000 });
  await page.getByText('Log out', { exact: true }).click();
  await page.waitForURL(/\/login$/, { timeout: 20000 });
  await page.getByText('Welcome back').waitFor({ timeout: 20000 });
  console.log('Logout flow works');

  const loginInputs = page.locator('input');
  await loginInputs.nth(0).fill(testAccount.email);
  await loginInputs.nth(1).fill(testAccount.password);
  await page.getByText('Sign in', { exact: true }).click();
  await page.waitForURL(/\/home$/, { timeout: 30000 });
  await page.getByText('Dashboard', { exact: true }).waitFor({ timeout: 30000 });
  console.log('Email/password login works');

  await page.goto(`${baseUrl}/profile`, { waitUntil: 'load' });
  await page.getByText('Log out', { exact: true }).click();
  await page.waitForURL(/\/login$/, { timeout: 20000 });
  await page.getByText('Welcome back').waitFor({ timeout: 20000 });

  await page.getByText('Username + PIN', { exact: true }).click();
  const pinInputs = page.locator('input');
  await pinInputs.nth(0).fill(testAccount.username);
  await pinInputs.nth(1).fill(testAccount.pin);
  await page.getByText('Sign in', { exact: true }).click();
  await page.waitForURL(/\/home$/, { timeout: 30000 });
  await page.getByText('Dashboard', { exact: true }).waitFor({ timeout: 30000 });
  console.log('Username + PIN login works');

  console.log('Smoke test completed successfully');
} catch (error) {
  console.error('Smoke test failed:', error);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
