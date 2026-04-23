import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(rootDir, '..');
const distDir = path.join(projectRoot, 'dist');
const port = 4173;
const appBasePath = '/BabyFlow';

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
    const normalizedPath =
      rawPath === appBasePath || rawPath === `${appBasePath}/`
        ? '/'
        : rawPath.startsWith(`${appBasePath}/`)
          ? rawPath.slice(appBasePath.length)
          : rawPath;
    const candidates = [
      path.join(distDir, normalizedPath),
      path.join(distDir, `${normalizedPath.replace(/^\/+/, '')}.html`),
      path.join(distDir, normalizedPath.replace(/^\/+/, ''), 'index.html'),
      path.join(distDir, 'index.html'),
    ];

    let filePath = path.join(distDir, 'index.html');
    for (const candidate of candidates) {
      const isFile = await stat(candidate)
        .then((entry) => entry.isFile())
        .catch(() => false);
      if (isFile) {
        filePath = candidate;
        break;
      }
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
const baseUrl = `http://127.0.0.1:${port}${appBasePath}`;
const now = Date.now();
const testAccount = {
  displayName: `Test ${now}`,
  username: `leo${String(now).slice(-8)}`,
  email: `babyflow.${now}@example.com`,
  password: 'Passw0rd!23',
  pin: '123456',
};

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByText('Welcome back').waitFor({ timeout: 20000 });
  console.log('Login page loaded');

  await page.goto(`${baseUrl}/register`, { waitUntil: 'networkidle' });
  await page.getByText('Create your account in one step').waitFor({ timeout: 10000 });

  const registerInputs = page.locator('input');
  await registerInputs.nth(0).fill(testAccount.email);
  await registerInputs.nth(1).fill(testAccount.password);
  await registerInputs.nth(2).fill(testAccount.password);
  await page.getByRole('button', { name: 'Create account' }).click();

  try {
    await page.waitForURL(/\/onboarding$/, { timeout: 30000 });
  } catch (error) {
    console.error('Post-register URL:', page.url());
    console.error('Post-register text:', await page.locator('body').innerText().catch(() => 'unavailable'));
    throw error;
  }
  await page.getByText('BabyFlow setup').waitFor({ timeout: 30000 });
  console.log('Onboarding page loaded');

  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(500);

  let inputs = page.locator('input');
  await inputs.nth(0).fill('Test Caregiver');
  await inputs.nth(1).fill('Leo');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(500);

  inputs = page.locator('input');
  await inputs.nth(0).fill('8');
  await inputs.nth(1).fill('14');
  await inputs.nth(2).fill('6');
  await page.getByRole('button', { name: 'Complete Setup' }).click();
  await page.waitForURL(/\/home$/, { timeout: 20000 });
  await page.getByText(/Accueil|Home/).first().waitFor({ timeout: 20000 });
  console.log('Home screen loaded');

  await page.goto(`${baseUrl}/history`, { waitUntil: 'load' });
  await page.getByText('Historique').first().waitFor({ timeout: 20000 });
  await page.getByText('Amoxicilline').first().waitFor({ timeout: 20000 });
  console.log('Demo history data is visible');

  await page.reload({ waitUntil: 'load' });
  await page.getByText('Amoxicilline').first().waitFor({ timeout: 20000 });
  console.log('Session persisted after reload');

  await page.goto(`${baseUrl}/profile`, { waitUntil: 'load' });
  await page.getByText(/Family and preferences|Famille et préférences|Familia y preferencias|Familie en voorkeuren/).first().waitFor({ timeout: 20000 });
  await page.getByText('Log out', { exact: true }).click();
  await page.waitForURL(/\/login$/, { timeout: 20000 });
  await page.getByText('Welcome back').waitFor({ timeout: 20000 });
  console.log('Logout flow works');

  const loginInputs = page.locator('input');
  await loginInputs.nth(0).fill(testAccount.email);
  await loginInputs.nth(1).fill(testAccount.password);
  await page.getByText('Sign in', { exact: true }).click();
  await page.waitForURL(/\/home$/, { timeout: 30000 });
  await page.getByText(/Accueil|Home/).first().waitFor({ timeout: 30000 });
  console.log('Email/password login works');

  console.log('Smoke test completed successfully');
} catch (error) {
  console.error('Smoke test failed:', error);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
