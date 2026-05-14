/**
 * Tests for getSmartFoodQuantitySuggestions.
 *
 * Run with:
 *   node --experimental-strip-types tests/food-suggestions.test.ts
 *
 * (Node 22+ understands TypeScript syntax natively with --experimental-strip-types.)
 */
import { getSmartFoodQuantitySuggestions } from '../src/lib/food-suggestions';
import type { EntryRecord } from '../src/types';

type Outcome = { name: string; ok: boolean; detail: string };
const results: Outcome[] = [];

function check(name: string, condition: boolean, detail = '') {
  results.push({ name, ok: condition, detail });
}

function eq<T>(name: string, actual: T, expected: T) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  check(name, ok, ok ? '' : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function approx(name: string, actual: number, expected: number, tolerance = 0) {
  const ok = Math.abs(actual - expected) <= tolerance;
  check(name, ok, ok ? '' : `expected ~${expected} (±${tolerance}), got ${actual}`);
}

function entry(opts: {
  id: string;
  daysAgo: number;
  foodName: string;
  category?: string;
  grams?: number;
  ml?: number;
  mealTime?: string;
}): EntryRecord {
  const ts = new Date(Date.now() - opts.daysAgo * 86400000).toISOString();
  return {
    id: opts.id,
    type: 'food',
    title: opts.foodName,
    occurredAt: ts,
    notes: '',
    payload: {
      foodName: opts.foodName,
      foodCategory: opts.category,
      quantityGrams: opts.grams,
      amountMl: opts.ml,
      mealTime: opts.mealTime,
    },
  } as unknown as EntryRecord;
}

// Pretend Leo is 7 months old.
const birthDate = new Date(Date.now() - 7 * 30.4375 * 86400000).toISOString();

// ---------------------------------------------------------------------------
// 1. The headline scenario from the spec:
//    Leo, 7mo. Fruit history 80g, 100g, 120g (newest first 120 → 80).
//    Expected chips: less ≈ 100, usual ≈ 120, more ≈ 140.
// ---------------------------------------------------------------------------
{
  const entries: EntryRecord[] = [
    entry({ id: 'f1', daysAgo: 1, foodName: 'pomme', category: 'fruit', grams: 120 }),
    entry({ id: 'f2', daysAgo: 3, foodName: 'pomme', category: 'fruit', grams: 100 }),
    entry({ id: 'f3', daysAgo: 5, foodName: 'pomme', category: 'fruit', grams: 80 }),
  ];

  const s = getSmartFoodQuantitySuggestions({
    entries,
    babyBirthDate: birthDate,
    category: 'fruit',
    foodName: 'pomme',
  });

  const values = s.chips.map((c) => c.value).sort((a, b) => a - b);
  eq('headline · source = foodName', s.source, 'foodName');
  eq('headline · trend detected as increasing', s.trend, 'increasing');
  check('headline · chips include 100', values.includes(100), `values=${values.join(',')}`);
  check('headline · chips include 120', values.includes(120), `values=${values.join(',')}`);
  check('headline · chips include 140', values.includes(140), `values=${values.join(',')}`);
  check(
    'headline · no tiny chip (<60g) for 7mo with 100g+ history',
    values.every((v) => v >= 60),
    `values=${values.join(',')}`,
  );
}

// ---------------------------------------------------------------------------
// 2. Stable habit at 90g → chips 70 / 90 / 110.
// ---------------------------------------------------------------------------
{
  const entries: EntryRecord[] = [
    entry({ id: 'y1', daysAgo: 1, foodName: 'yaourt', category: 'yogurt', grams: 90 }),
    entry({ id: 'y2', daysAgo: 3, foodName: 'yaourt', category: 'yogurt', grams: 90 }),
    entry({ id: 'y3', daysAgo: 5, foodName: 'yaourt', category: 'yogurt', grams: 90 }),
  ];
  const s = getSmartFoodQuantitySuggestions({
    entries,
    babyBirthDate: birthDate,
    category: 'yogurt',
    foodName: 'yaourt',
  });
  const v = s.chips.map((c) => c.value).sort((a, b) => a - b);
  eq('stable90 · trend', s.trend, 'stable');
  check('stable90 · chips include 70', v.includes(70), `v=${v.join(',')}`);
  check('stable90 · chips include 90', v.includes(90), `v=${v.join(',')}`);
  check('stable90 · chips include 110', v.includes(110), `v=${v.join(',')}`);
}

// ---------------------------------------------------------------------------
// 3. New food in a known category → "discovery" suggestion.
//    Leo has eaten lots of fruit (apple, pear) at 100-120g.
//    Today: mango (new). Should suggest a moderate quantity, not full 120g.
// ---------------------------------------------------------------------------
{
  const entries: EntryRecord[] = [
    entry({ id: 'a1', daysAgo: 1, foodName: 'pomme', category: 'fruit', grams: 120 }),
    entry({ id: 'a2', daysAgo: 3, foodName: 'pomme', category: 'fruit', grams: 100 }),
    entry({ id: 'a3', daysAgo: 5, foodName: 'poire', category: 'fruit', grams: 110 }),
  ];
  const s = getSmartFoodQuantitySuggestions({
    entries,
    babyBirthDate: birthDate,
    category: 'fruit',
    foodName: 'mango', // never seen before
  });
  eq('newFood · source = categoryNewFood', s.source, 'categoryNewFood');
  check(
    'newFood · contains a discovery chip',
    s.chips.some((c) => c.kind === 'discovery'),
    JSON.stringify(s.chips),
  );
  const smallest = Math.min(...s.chips.map((c) => c.value));
  check(
    'newFood · smallest chip is meaningfully below habitual (≤70g)',
    smallest <= 70,
    `smallest=${smallest}`,
  );
}

// ---------------------------------------------------------------------------
// 4. Age fallback only when there is NO history.
//    Leo is 7 months, no food entries at all → vegetables baseline ≈ 50g
//    (interpolated between 6mo bucket 20g and 7-8mo bucket 50g, biased toward 50).
// ---------------------------------------------------------------------------
{
  const s = getSmartFoodQuantitySuggestions({
    entries: [],
    babyBirthDate: birthDate,
    category: 'vegetables',
    foodName: '',
  });
  eq('ageFallback · source = age', s.source, 'age');
  const v = s.chips.map((c) => c.value);
  check(
    'ageFallback · no absurd tiny chip (<25g) for 7mo vegetables',
    v.every((x) => x >= 25),
    `v=${v.join(',')}`,
  );
}

// ---------------------------------------------------------------------------
// 5. The bug the user reported: Leo just past 6 months, has been eating 120g
//    fruit. The OLD logic showed 15/20/25/35g. The NEW logic must NOT show
//    anything below 60g once 2+ history entries say 100g+.
// ---------------------------------------------------------------------------
{
  const birth6mo = new Date(Date.now() - 6.1 * 30.4375 * 86400000).toISOString();
  const entries: EntryRecord[] = [
    entry({ id: 'r1', daysAgo: 0.5, foodName: 'compote', category: 'fruit', grams: 120 }),
    entry({ id: 'r2', daysAgo: 1.5, foodName: 'pomme', category: 'fruit', grams: 100 }),
  ];
  const s = getSmartFoodQuantitySuggestions({
    entries,
    babyBirthDate: birth6mo,
    category: 'fruit',
    foodName: 'compote',
  });
  const v = s.chips.map((c) => c.value);
  check(
    'noRegression · category history beats age baseline',
    s.source === 'category' || s.source === 'foodName',
    `source=${s.source}`,
  );
  check(
    'noRegression · no <50g chip when habitual ≥100g',
    v.every((x) => x >= 50),
    `v=${v.join(',')}`,
  );
}

// ---------------------------------------------------------------------------
// 6. Decreasing trend lowers the suggestion.
// ---------------------------------------------------------------------------
{
  const entries: EntryRecord[] = [
    entry({ id: 'd1', daysAgo: 1, foodName: 'légumes', category: 'vegetables', grams: 60 }),
    entry({ id: 'd2', daysAgo: 2, foodName: 'légumes', category: 'vegetables', grams: 80 }),
    entry({ id: 'd3', daysAgo: 4, foodName: 'légumes', category: 'vegetables', grams: 120 }),
    entry({ id: 'd4', daysAgo: 6, foodName: 'légumes', category: 'vegetables', grams: 130 }),
  ];
  const s = getSmartFoodQuantitySuggestions({
    entries,
    babyBirthDate: birthDate,
    category: 'vegetables',
    foodName: 'légumes',
  });
  eq('decreasing · trend', s.trend, 'decreasing');
  check(
    'decreasing · usualAmount below max history',
    (s.usualAmount ?? 0) <= 100,
    `usualAmount=${s.usualAmount}`,
  );
}

// ---------------------------------------------------------------------------
// 7. Single sample → falls through to age baseline (not history).
// ---------------------------------------------------------------------------
{
  const entries: EntryRecord[] = [
    entry({ id: 's1', daysAgo: 1, foodName: 'mango', category: 'fruit', grams: 200 }),
  ];
  const s = getSmartFoodQuantitySuggestions({
    entries,
    babyBirthDate: birthDate,
    category: 'fruit',
    foodName: 'mango',
  });
  check(
    'singleSample · not foodName/category (needs ≥2)',
    s.source !== 'foodName' && s.source !== 'category',
    `source=${s.source}`,
  );
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;
for (const r of results) {
  const mark = r.ok ? 'OK  ' : 'FAIL';
  console.log(`${mark}  ${r.name}${r.detail ? `\n      ${r.detail}` : ''}`);
}
console.log(`\n${passed}/${results.length} passed${failed ? `, ${failed} failed` : ''}`);
if (failed) process.exit(1);
