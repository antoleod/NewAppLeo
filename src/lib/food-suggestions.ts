import { EntryRecord, FoodCategory } from '@/types';
import { getAgeInMonths } from './who-recommendations';
import foodPortionsData from '@/data/food-portions.json';

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type ChipKind = 'last' | 'usual' | 'less' | 'more' | 'baseline';
export type SuggestionSource = 'foodName' | 'category' | 'categoryMeal' | 'age' | 'fallback';

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
}

interface PortionRow {
  ageRange: string;
  maxMonths: number;
  food_recommendations: Record<string, number>;
}

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
  fruit: ['fruit', 'fruta', 'pomme', 'apple', 'banana', 'banane', 'plátano', 'pear', 'poire', 'peach', 'pêche'],
  cereals: ['cereal', 'céréale', 'cereales', 'granen', 'porridge', 'oatmeal', 'rice', 'riz'],
  yogurt: ['yogurt', 'yaourt', 'yogur', 'yoghurt'],
  vegetables: ['vegetable', 'legume', 'légume', 'verdura', 'groente', 'carotte', 'carrot', 'zanahoria', 'broccoli', 'brócoli'],
  water: ['water', 'eau', 'agua', 'water'],
  other: [],
};

export function normalizeFoodName(value: string): string {
  return value.trim().toLowerCase();
}

export function inferCategoryFromName(rawName: string): FoodCategory {
  const name = normalizeFoodName(rawName);
  if (!name) return 'other';
  if (PRESET_VALUES.has(name)) return name as FoodCategory;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<[FoodCategory, string[]]>) {
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

function roundToStep(value: number, step = 5): number {
  if (value <= 0) return 0;
  return Math.max(step, Math.round(value / step) * step);
}

function getAgeBaseline(ageMonths: number, category: FoodCategory): number {
  const rows = (foodPortionsData as { portions: PortionRow[] }).portions;
  if (ageMonths < 6) {
    return category === 'water' ? 30 : 20;
  }
  // Find the row whose maxMonths is the smallest one ≥ ageMonths.
  // Rows are age buckets (≤6mo, 7-8mo, 9-11mo, 12-18mo, 19-24mo, 2-3y) so
  // a 10mo baby belongs to the 9-11mo bucket (maxMonths=11), NOT the 7-8mo
  // one. The previous logic chose the largest maxMonths ≤ ageMonths which
  // returned the bucket "one age group too young" for every non-edge case.
  let chosen: PortionRow | null = null;
  for (const row of rows) {
    if (row.maxMonths >= ageMonths) {
      if (!chosen || row.maxMonths < chosen.maxMonths) chosen = row;
    }
  }
  // Older than the last bucket: use the highest one.
  if (!chosen) chosen = rows[rows.length - 1];
  const key = category === 'other' ? 'puree' : category;
  return chosen.food_recommendations[key] ?? 50;
}

interface FoodEntryShape {
  occurredAt: string;
  quantityGrams?: number;
  amountMl?: number;
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
      quantityGrams: grams,
      amountMl: ml,
      foodNameNorm: normalizeFoodName(rawName),
      category,
      mealTime: payload.mealTime as MealType | undefined,
    });
  }
  return result;
}

function amountOf(entry: FoodEntryShape, unit: 'g' | 'ml'): number {
  if (unit === 'ml') return entry.amountMl || entry.quantityGrams || 0;
  return entry.quantityGrams || entry.amountMl || 0;
}

function buildChips(usual: number, last: number | null, unit: 'g' | 'ml'): QuantityChip[] {
  const step = unit === 'ml' ? 10 : 5;
  const usualRounded = roundToStep(usual, step);
  const lessVal = roundToStep(Math.max(step, usualRounded * 0.7), step);
  const moreVal = roundToStep(usualRounded * 1.3, step);
  const lastRounded = last != null && last > 0 ? roundToStep(last, step) : null;

  const chips: QuantityChip[] = [];
  const pushed = new Set<number>();
  const push = (chip: QuantityChip) => {
    if (chip.value <= 0 || pushed.has(chip.value)) return;
    pushed.add(chip.value);
    chips.push(chip);
  };

  if (lastRounded != null && lastRounded !== usualRounded) {
    push({ value: lastRounded, unit, kind: 'last' });
  }
  push({ value: usualRounded, unit, kind: 'usual' });
  push({ value: lessVal, unit, kind: 'less' });
  push({ value: moreVal, unit, kind: 'more' });

  // Always present 4 chips: pad with a "more+" step if we deduped too aggressively.
  let pad = moreVal + step * 2;
  while (chips.length < 4) {
    if (!pushed.has(pad)) {
      pushed.add(pad);
      chips.push({ value: pad, unit, kind: 'more' });
    }
    pad += step * 2;
  }
  return chips.slice(0, 4).sort((a, b) => a.value - b.value);
}

export interface SuggestionInput {
  entries: EntryRecord[];
  babyBirthDate?: string | null;
  category: FoodCategory;
  foodName: string;
  mealTime?: MealType | '';
  now?: number;
}

export function suggestFoodQuantities(input: SuggestionInput): QuantitySuggestion {
  const now = input.now ?? Date.now();
  const unit = unitForCategory(input.category);
  const ageMonths = input.babyBirthDate ? getAgeInMonths(input.babyBirthDate) : 0;
  const nameNorm = normalizeFoodName(input.foodName);

  const recent = extractFoodEntries(input.entries, now);

  // 1. By food name
  if (nameNorm) {
    const byName = recent.filter((e) => e.foodNameNorm === nameNorm);
    if (byName.length >= 3) {
      const values = byName.map((e) => amountOf(e, unit)).filter((v) => v > 0);
      if (values.length >= 3) {
        const usual = median(values);
        const last = amountOf(byName[0], unit);
        return {
          chips: buildChips(usual, last, unit),
          unit,
          source: 'foodName',
          sampleCount: values.length,
          lastAmount: last || null,
          usualAmount: usual,
        };
      }
    }
  }

  // 2. By category
  const byCategory = recent.filter((e) => e.category === input.category && input.category !== 'other');
  if (byCategory.length >= 3) {
    // 2b. Try mealType refinement first
    if (input.mealTime) {
      const byMeal = byCategory.filter((e) => e.mealTime === input.mealTime);
      if (byMeal.length >= 2) {
        const values = byMeal.map((e) => amountOf(e, unit)).filter((v) => v > 0);
        if (values.length >= 2) {
          const usual = median(values);
          const last = amountOf(byMeal[0], unit);
          return {
            chips: buildChips(usual, last, unit),
            unit,
            source: 'categoryMeal',
            sampleCount: values.length,
            lastAmount: last || null,
            usualAmount: usual,
          };
        }
      }
    }
    const values = byCategory.map((e) => amountOf(e, unit)).filter((v) => v > 0);
    if (values.length >= 3) {
      const usual = median(values);
      const last = amountOf(byCategory[0], unit);
      return {
        chips: buildChips(usual, last, unit),
        unit,
        source: 'category',
        sampleCount: values.length,
        lastAmount: last || null,
        usualAmount: usual,
      };
    }
  }

  // 3. Age + category baseline
  if (input.babyBirthDate && input.category !== 'other') {
    const baseline = getAgeBaseline(ageMonths, input.category);
    return {
      chips: buildChips(baseline, null, unit),
      unit,
      source: 'age',
      sampleCount: 0,
      lastAmount: null,
      usualAmount: baseline,
    };
  }

  // 4. Hard fallback
  const fallbackBase = unit === 'ml' ? 100 : 50;
  return {
    chips: buildChips(fallbackBase, null, unit),
    unit,
    source: 'fallback',
    sampleCount: 0,
    lastAmount: null,
    usualAmount: fallbackBase,
  };
}
