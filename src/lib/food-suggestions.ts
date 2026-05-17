import { EntryRecord, FoodCategory } from '@/types';
import foodPortionsData from '@/data/food-portions.json';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type ChipKind = 'last' | 'usual' | 'less' | 'more' | 'baseline' | 'discovery';
export type TrendDirection = 'increasing' | 'decreasing' | 'stable';

export type SuggestionSource =
  | 'foodName'       // ≥2 entries of the exact same food
  | 'category'       // ≥2 entries in same category (e.g. fruit, vegetables)
  | 'categoryMeal'   // category restricted to same mealTime (breakfast/lunch/…)
  | 'categoryNewFood'// known category, but this specific food is new → discovery quantity
  | 'age'            // no history → fall back to WHO/age baseline
  | 'fallback';      // no birthdate either

export interface QuantityChip {
  value: number;
  unit: 'g' | 'ml';
  kind: ChipKind;
}

export interface QuantitySuggestion {
  chips: QuantityChip[];
  unit: 'g' | 'ml';
  source: SuggestionSource;
  sampleCount: number;
  lastAmount: number | null;
  usualAmount: number | null;
  /** Habitual quantity computed from history (null when source is age/fallback). */
  habitualAmount?: number | null;
  /** Detected eating trend across the most recent samples. */
  trend?: TrendDirection;
}

interface PortionRow {
  ageRange: string;
  maxMonths: number;
  food_recommendations: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Constants / helpers
// ---------------------------------------------------------------------------

const PRESET_VALUES: ReadonlySet<string> = new Set([
  'puree',
  'fruit',
  'cereals',
  'yogurt',
  'vegetables',
  'water',
]);

const CATEGORY_KEYWORDS: Record<FoodCategory, string[]> = {
  puree: ['puree', 'purée', 'puré', 'compote'],
  fruit: ['fruit', 'fruta', 'pomme', 'apple', 'banana', 'banane', 'plátano', 'pear', 'poire', 'peach', 'pêche', 'mango'],
  cereals: ['cereal', 'céréale', 'cereales', 'granen', 'porridge', 'oatmeal', 'rice', 'riz'],
  yogurt: ['yogurt', 'yaourt', 'yogur', 'yoghurt'],
  vegetables: ['vegetable', 'legume', 'légume', 'verdura', 'groente', 'carotte', 'carrot', 'zanahoria', 'broccoli', 'brócoli'],
  water: ['water', 'eau', 'agua'],
  other: [],
};

export function normalizeFoodName(value: string): string {
  return value.trim().toLowerCase();
}

export function inferCategoryFromName(rawName: string): FoodCategory {
  const name = normalizeFoodName(rawName);
  if (!name) return 'other';
  if (PRESET_VALUES.has(name)) return name as FoodCategory;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [FoodCategory, string[]][]) {
    if (keywords.some((kw) => name.includes(kw))) return cat;
  }
  return 'other';
}

function unitForCategory(category: FoodCategory): 'g' | 'ml' {
  return category === 'water' ? 'ml' : 'g';
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function roundToStep(value: number, step = 5): number {
  if (value <= 0) return 0;
  return Math.max(step, Math.round(value / step) * step);
}

function chipStep(habitual: number, unit: 'g' | 'ml'): number {
  // For quantities ≥50 g (or ≥100 ml) step to the next clean 10-unit so
  // chips read "100 / 120 / 140" instead of "100 / 120 / 145".
  if (unit === 'ml') return habitual >= 100 ? 10 : 5;
  return habitual >= 50 ? 10 : 5;
}

function getAgeInMonthsFractional(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  const days = Math.max(0, (now.getTime() - birth.getTime()) / 86400000);
  return days / 30.4375;
}

function bucketCenterMonths(row: PortionRow): number {
  const parsed = Number((row as any).ageMonths);
  return Number.isFinite(parsed) ? parsed : row.maxMonths;
}

function getAgeBaseline(ageMonths: number, category: FoodCategory): number {
  const rows = (foodPortionsData as { portions: PortionRow[] }).portions;
  const key = category === 'other' ? 'puree' : category;
  if (ageMonths < 6) return category === 'water' ? 30 : 20;

  const sorted = [...rows]
    .map((row) => ({ row, center: bucketCenterMonths(row) }))
    .sort((a, b) => a.center - b.center);

  if (ageMonths <= sorted[0].center) return sorted[0].row.food_recommendations[key] ?? 50;
  if (ageMonths >= sorted[sorted.length - 1].center) {
    return sorted[sorted.length - 1].row.food_recommendations[key] ?? 50;
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = sorted[i];
    const hi = sorted[i + 1];
    if (ageMonths >= lo.center && ageMonths <= hi.center) {
      const loVal = lo.row.food_recommendations[key] ?? 50;
      const hiVal = hi.row.food_recommendations[key] ?? loVal;
      const t = (ageMonths - lo.center) / Math.max(0.0001, hi.center - lo.center);
      return loVal + (hiVal - loVal) * t;
    }
  }
  return sorted[sorted.length - 1].row.food_recommendations[key] ?? 50;
}

/**
 * Soft upper safety cap, used ONLY when there is no real history to lean on.
 * When the baby's own history says they eat 120g, we trust the baby — not the
 * generic WHO bucket. History always wins (that's the whole point of this
 * module). The cap exists purely to keep age-baseline fallbacks reasonable.
 */
function softCeiling(habitual: number, unit: 'g' | 'ml'): number {
  // Allow the habitual to drive the ceiling. +50% headroom for the "more" chip
  // is plenty; anything larger is the parent typing directly into the input.
  const fromHabitual = habitual > 0 ? habitual * 1.5 : 0;
  const absoluteMax = unit === 'ml' ? 400 : 350;
  return Math.min(absoluteMax, Math.max(fromHabitual, unit === 'ml' ? 200 : 200));
}

// ---------------------------------------------------------------------------
// History extraction
// ---------------------------------------------------------------------------

interface FoodEntryShape {
  occurredAt: string;
  occurredAtMs: number;
  quantityGrams: number;
  amountMl: number;
  foodNameNorm: string;
  category: FoodCategory;
  mealTime?: MealType;
}

function extractFoodEntries(entries: EntryRecord[], now: number, windowDays = 30): FoodEntryShape[] {
  const cutoff = now - windowDays * 24 * 60 * 60 * 1000;
  const seen = new Set<string>();
  const result: FoodEntryShape[] = [];
  for (const entry of entries) {
    if (entry.type !== 'food') continue;
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    const ts = Date.parse(entry.occurredAt);
    if (!Number.isFinite(ts) || ts < cutoff) continue;
    const payload = entry.payload ?? {};
    const rawName = typeof payload.foodName === 'string' ? payload.foodName : '';
    const grams = typeof payload.quantityGrams === 'number' ? payload.quantityGrams : 0;
    const ml = typeof payload.amountMl === 'number' ? payload.amountMl : 0;
    if (grams <= 0 && ml <= 0) continue;
    const category: FoodCategory =
      (payload.foodCategory as FoodCategory | undefined) ?? inferCategoryFromName(rawName);
    result.push({
      occurredAt: entry.occurredAt,
      occurredAtMs: ts,
      quantityGrams: grams,
      amountMl: ml,
      foodNameNorm: normalizeFoodName(rawName),
      category,
      mealTime: payload.mealTime as MealType | undefined,
    });
  }
  // Newest first.
  return result.sort((a, b) => b.occurredAtMs - a.occurredAtMs);
}

function amountOf(entry: FoodEntryShape, unit: 'g' | 'ml'): number {
  if (unit === 'ml') return entry.amountMl || entry.quantityGrams || 0;
  return entry.quantityGrams || entry.amountMl || 0;
}

// ---------------------------------------------------------------------------
// Smart core: habitual + trend + chips
// ---------------------------------------------------------------------------

interface HabitualResult {
  habitual: number;
  last: number;
  trend: TrendDirection;
  sampleCount: number;
}

/**
 * Compute the "habitual" quantity from a recency-sorted history (newest first).
 *
 * - Weighted average: most recent meal counts 5×, then 4×, 3×, 2×, 1×.
 * - Trend detection: compare avg of last 2 vs avg of the 3 before them.
 *   • +10% → "increasing" → habitual biases toward `max(last, median)`.
 *   • −10% → "decreasing" → habitual biases toward `min(last, median)`.
 * - Otherwise habitual = weighted average.
 */
function computeHabitual(values: number[]): HabitualResult {
  // Limit to 5 most recent samples (newest first input).
  const samples = values.slice(0, 5).filter((v) => v > 0);
  const sampleCount = samples.length;
  if (sampleCount === 0) {
    return { habitual: 0, last: 0, trend: 'stable', sampleCount: 0 };
  }
  const last = samples[0];
  const med = median(samples);

  const weights = [5, 4, 3, 2, 1];
  let wSum = 0;
  let totalW = 0;
  for (let i = 0; i < samples.length; i++) {
    wSum += samples[i] * weights[i];
    totalW += weights[i];
  }
  const weightedAvg = wSum / totalW;

  let trend: TrendDirection = 'stable';
  if (sampleCount >= 3) {
    const recent2 = mean(samples.slice(0, 2));
    const older = mean(samples.slice(2));
    if (recent2 > older * 1.1) trend = 'increasing';
    else if (recent2 < older * 0.9) trend = 'decreasing';
  } else if (sampleCount === 2) {
    if (samples[0] > samples[1] * 1.15) trend = 'increasing';
    else if (samples[0] < samples[1] * 0.85) trend = 'decreasing';
  }

  let habitual: number;
  if (trend === 'increasing') habitual = Math.max(last, med, weightedAvg);
  else if (trend === 'decreasing') habitual = Math.min(last, med, weightedAvg);
  else habitual = weightedAvg;

  return { habitual, last, trend, sampleCount };
}

/**
 * Build the chip row around `habitual`.
 *
 * For habitual=120g:  100 / 120 / 140  (less / usual / more, +/−20%)
 * For habitual=90g:    70 /  90 / 110
 * For habitual=40g:    30 /  40 /  50
 *
 * A 4th chip is added when "last" differs notably from "usual" so the
 * parent can re-tap exactly what was logged before.
 */
function buildChipsAroundHabitual(
  habitual: number,
  last: number | null,
  unit: 'g' | 'ml',
): QuantityChip[] {
  const step = chipStep(habitual, unit);
  const usual = roundToStep(habitual, step);
  const ceiling = softCeiling(habitual, unit);
  const less = roundToStep(Math.max(step, usual * 0.8), step);
  const more = roundToStep(Math.min(ceiling, usual * 1.2), step);
  const lastRounded = last != null && last > 0 ? roundToStep(last, step) : null;

  const chips: QuantityChip[] = [];
  const pushed = new Set<number>();
  const push = (chip: QuantityChip) => {
    if (chip.value <= 0 || pushed.has(chip.value)) return;
    pushed.add(chip.value);
    chips.push(chip);
  };

  if (lastRounded != null && lastRounded !== usual && Math.abs(lastRounded - usual) >= step * 2) {
    push({ value: lastRounded, unit, kind: 'last' });
  }
  push({ value: less, unit, kind: 'less' });
  push({ value: usual, unit, kind: 'usual' });
  push({ value: more, unit, kind: 'more' });

  // Pad to 4 chips with a larger "more" step (still capped at ceiling).
  let pad = more + step * 2;
  while (chips.length < 4 && pad <= ceiling * 1.05) {
    if (!pushed.has(pad)) {
      pushed.add(pad);
      chips.push({ value: pad, unit, kind: 'more' });
    }
    pad += step * 2;
  }

  return chips.slice(0, 4).sort((a, b) => a.value - b.value);
}

/**
 * Discovery chips for a NEW food in a known category. Use category history but
 * suggest a smaller amount (the parent should try a little of the new food
 * first to watch for allergies).
 */
function buildDiscoveryChips(
  habitual: number,
  unit: 'g' | 'ml',
  ageMonths: number,
  category: FoodCategory,
): QuantityChip[] {
  const step = chipStep(habitual, unit);
  // Discovery starts at ~half the habitual or the age intro size, whichever is larger.
  const introFloor = roundToStep(Math.max(step, getAgeBaseline(Math.min(ageMonths, 6.5), category) * 0.7), step);
  const small = roundToStep(Math.max(introFloor, habitual * 0.4), step);
  const medium = roundToStep(habitual * 0.65, step);
  const usual = roundToStep(habitual, step);
  const chips: QuantityChip[] = [
    { value: small, unit, kind: 'discovery' },
    { value: medium, unit, kind: 'less' },
    { value: usual, unit, kind: 'usual' },
  ];
  const more = roundToStep(habitual * 1.2, step);
  if (more > usual) chips.push({ value: more, unit, kind: 'more' });

  // Dedup + sort.
  const seen = new Set<number>();
  return chips
    .filter((c) => (seen.has(c.value) ? false : (seen.add(c.value), true)))
    .sort((a, b) => a.value - b.value)
    .slice(0, 4);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SuggestionInput {
  entries: EntryRecord[];
  babyBirthDate?: string | null;
  category: FoodCategory;
  foodName: string;
  mealTime?: MealType | '';
  now?: number;
}

/**
 * Smart food quantity suggestions.
 *
 * Priority:
 *  1. Exact food name (≥2 prior meals of the same food)            → "habitual for Leo"
 *  2. Same category + same meal time (≥2 prior meals at this time) → "habitual at this time of day"
 *  3. Same category (≥2 prior meals)                                → "based on Leo's recent meals"
 *     • If foodName is new to this category → discovery quantities
 *  4. Age baseline (interpolated WHO bucket)                        → "suggested for this age"
 *  5. Hard fallback
 */
export function getSmartFoodQuantitySuggestions(input: SuggestionInput): QuantitySuggestion {
  const now = input.now ?? Date.now();
  const unit = unitForCategory(input.category);
  const ageMonths = input.babyBirthDate ? getAgeInMonthsFractional(input.babyBirthDate) : 0;
  const nameNorm = normalizeFoodName(input.foodName);
  const history = extractFoodEntries(input.entries, now); // newest first

  // ---- 1. Exact food name ------------------------------------------------
  if (nameNorm) {
    const byName = history.filter((e) => e.foodNameNorm === nameNorm);
    if (byName.length >= 2) {
      const values = byName.map((e) => amountOf(e, unit)).filter((v) => v > 0);
      if (values.length >= 2) {
        const h = computeHabitual(values);
        return {
          chips: buildChipsAroundHabitual(h.habitual, h.last, unit),
          unit,
          source: 'foodName',
          sampleCount: h.sampleCount,
          lastAmount: h.last || null,
          usualAmount: roundToStep(h.habitual, chipStep(h.habitual, unit)),
          habitualAmount: h.habitual,
          trend: h.trend,
        };
      }
    }
  }

  // ---- 2 & 3. Same category ---------------------------------------------
  if (input.category !== 'other') {
    const byCategory = history.filter((e) => e.category === input.category);

    // 2. Meal-time refinement.
    if (input.mealTime) {
      const byMeal = byCategory.filter((e) => e.mealTime === input.mealTime);
      if (byMeal.length >= 2) {
        const values = byMeal.map((e) => amountOf(e, unit)).filter((v) => v > 0);
        if (values.length >= 2) {
          const h = computeHabitual(values);
          return {
            chips: buildChipsAroundHabitual(h.habitual, h.last, unit),
            unit,
            source: 'categoryMeal',
            sampleCount: h.sampleCount,
            lastAmount: h.last || null,
            usualAmount: roundToStep(h.habitual, chipStep(h.habitual, unit)),
            habitualAmount: h.habitual,
            trend: h.trend,
          };
        }
      }
    }

    // 3b. Single-sample rescue: only ONE prior entry in this category but
    // still better than ignoring it. Blend it with the age baseline so a
    // 100 g log doesn't get drowned by a 40 g WHO bucket suggestion.
    if (byCategory.length === 1) {
      const sample = amountOf(byCategory[0], unit);
      if (sample > 0) {
        const baseline = getAgeBaseline(ageMonths, input.category);
        // Weight the actual eaten amount 2× the age baseline — the parent's
        // real observation is more informative than the generic table.
        const habitual = (sample * 2 + baseline) / 3;
        return {
          chips: buildChipsAroundHabitual(habitual, sample, unit),
          unit,
          source: 'category',
          sampleCount: 1,
          lastAmount: sample,
          usualAmount: roundToStep(habitual, chipStep(habitual, unit)),
          habitualAmount: habitual,
          trend: 'stable',
        };
      }
    }

    // 3. Whole category.
    if (byCategory.length >= 2) {
      const values = byCategory.map((e) => amountOf(e, unit)).filter((v) => v > 0);
      if (values.length >= 2) {
        const h = computeHabitual(values);
        // Is this specific food new to the parent? (no prior entries by name)
        const isNewFood = nameNorm && !byCategory.some((e) => e.foodNameNorm === nameNorm);
        if (isNewFood) {
          return {
            chips: buildDiscoveryChips(h.habitual, unit, ageMonths, input.category),
            unit,
            source: 'categoryNewFood',
            sampleCount: h.sampleCount,
            lastAmount: h.last || null,
            usualAmount: roundToStep(h.habitual * 0.65, chipStep(h.habitual, unit)),
            habitualAmount: h.habitual,
            trend: h.trend,
          };
        }
        return {
          chips: buildChipsAroundHabitual(h.habitual, h.last, unit),
          unit,
          source: 'category',
          sampleCount: h.sampleCount,
          lastAmount: h.last || null,
          usualAmount: roundToStep(h.habitual, chipStep(h.habitual, unit)),
          habitualAmount: h.habitual,
          trend: h.trend,
        };
      }
    }
  }

  // ---- 4. Age baseline ---------------------------------------------------
  if (input.babyBirthDate && input.category !== 'other') {
    const raw = getAgeBaseline(ageMonths, input.category);
    const step = chipStep(raw, unit);
    const baseline = roundToStep(raw, step);
    return {
      chips: buildChipsAroundHabitual(baseline, null, unit),
      unit,
      source: 'age',
      sampleCount: 0,
      lastAmount: null,
      usualAmount: baseline,
      habitualAmount: null,
      trend: 'stable',
    };
  }

  // ---- 5. Hard fallback --------------------------------------------------
  const fallbackBase = unit === 'ml' ? 100 : 50;
  return {
    chips: buildChipsAroundHabitual(fallbackBase, null, unit),
    unit,
    source: 'fallback',
    sampleCount: 0,
    lastAmount: null,
    usualAmount: fallbackBase,
    habitualAmount: null,
    trend: 'stable',
  };
}

// Back-compat alias (older imports).
export const suggestFoodQuantities = getSmartFoodQuantitySuggestions;
