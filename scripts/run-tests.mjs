#!/usr/bin/env node
/**
 * Test runner: discovers every `tests/*.test.ts` file and executes it with
 * tsx. Exits non-zero if any file fails, so it works as a CI gate.
 */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const testsDir = join(root, 'tests');

const files = readdirSync(testsDir)
  .filter((f) => f.endsWith('.test.ts'))
  .sort();

if (files.length === 0) {
  console.error('No test files found in tests/');
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  console.log(`\n▶ ${file}`);
  const result = spawnSync('npx', ['tsx', join(testsDir, file)], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) failed += 1;
}

console.log(`\n${failed === 0 ? '✅ all test files passed' : `❌ ${failed} test file(s) failed`}`);
process.exit(failed === 0 ? 0 : 1);
