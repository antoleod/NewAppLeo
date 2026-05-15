import { EntryRecord } from '@/types';

// ---------------------------------------------------------------------------
// Sleep period buckets — derived from the start hour of the sleep entry.
// ---------------------------------------------------------------------------

export type SleepPeriod = 'morningNap' | 'afternoonNap' | 'eveningNap' | 'night';

export type SleepSource = 'periodHistory' | 'anyHistory' | 'age' | 'fallback';
export type SleepChipKind = 'shorter' | 'usual' | 'longer' | 'last';

export interface SleepChip {
  minutes: number;
  kind: SleepChipKind;
}

export interface SleepSuggestion {
  chips: SleepChip[];
  period: SleepPeriod;
  source: SleepSource;
  habitualMin: number;
  lastMin: number | null;
  sampleCount: number;
}

export function detectSleepPeriod(date: Date): SleepPeriod {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'morningNap';
  if (h >= 11 && h < 16) return 'afternoonNap';
  if (h >= 16 && h < 20) return 'eveningNap';
  return 'night';
}

// ---------------------------------------------------------------------------
// Age-based fallback durations (minutes). Loosely aligned with AAP / NSF
// ranges for daytime naps + total night sleep.
// ---------------------------------------------------------------------------

interface AgeDefaults {
  morningNap: number;
  afternoonNap: number;
  eveningNap: number;
  night: number;
}

function ageDefaultsFor(ageMonths: number): AgeDefaults {
  if (ageMonths < 3)  return { morningNap: 60,  afternoonNap: 90,  eveningNap: 45, night: 480 };
  if (ageMonths < 6)  return { morningNap: 60,  afternoonNap: 90,  eveningNap: 45, night: 540 };
  if (ageMonths < 9)  return { morningNap: 45,  afternoonNap: 90,  eveningNap: 30, night: 600 };
  if (ageMonths < 12) return { morningNap: 45,  afternoonNap: 75,  eveningNap: 30, night: 660 };
  if (ageMonths < 18) return { morningNap: 30,  afternoonNap: 90,  eveningNap: 0,  night: 660 };
  if (ageMonths < 36) return { morningNap: 0,   afternoonNap: 90,  eveningNap: 0,  night: 660 };
  return { morningNap: 0, afternoonNap: 60, eveningNap: 0, night: 600 };
}

function ageInMonths(birthDate?: string | null): number {
  if (!birthDate) return 0;
  const ms = Date.now() - new Date(birthDate).getTime();
  return Math.max(0, ms / (1000 * 60 * 60 * 24 * 30.4375));
}

// ---------------------------------------------------------------------------
// Stats helpers (same shape as food-suggestions for consistency).
// ---------------------------------------------------------------------------

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function weightedAvg(values: number[]): number {
  if (values.length === 0) return 0;
  const weights = [5, 4, 3, 2, 1];
  let sum = 0; let w = 0;
  for (let i = 0; i < values.length && i < weights.length; i++) {
    sum += values[i] * weights[i];
    w += weights[i];
  }
  return sum / w;
}

function chipStep(minutes: number): number {
  if (minutes >= 240) return 30;   // long night sleep → 30-min steps
  if (minutes >= 60)  return 15;
  return 5;
}

function roundToStep(value: number, step: number): number {
  if (value <= 0) return 0;
  return Math.max(step, Math.round(value / step) * step);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SleepSuggestionInput {
  entries: EntryRecord[];
  babyBirthDate?: string | null;
  /** Reference time used to detect the period (defaults to "now"). */
  at?: Date;
}

export function getSmartSleepSuggestions(input: SleepSuggestionInput): SleepSuggestion {
  const ref = input.at ?? new Date();
  const period = detectSleepPeriod(ref);
  const ageMonths = ageInMonths(input.babyBirthDate);

  // Recent sleeps in the last 21 days, newest first, with positive durations.
  const cutoff = ref.getTime() - 21 * 86400000;
  const recent = input.entries
    .filter((e) => e.type === 'sleep')
    .map((e) => {
      const ts = Date.parse(e.occurredAt);
      const dur = Number(e.payload?.durationMin) || 0;
      return { ts, dur, period: detectSleepPeriod(new Date(ts)) };
    })
    .filter((r) => Number.isFinite(r.ts) && r.ts >= cutoff && r.dur > 5)
    .sort((a, b) => b.ts - a.ts);

  // 1. Same-period history ≥2 → habitual for this part of the day.
  const samePeriod = recent.filter((r) => r.period === period).slice(0, 5);
  if (samePeriod.length >= 2) {
    const values = samePeriod.map((r) => r.dur);
    const habitual = Math.max(median(values), weightedAvg(values));
    return buildSuggestion(habitual, samePeriod[0].dur, samePeriod.length, period, 'periodHistory');
  }

  // 2. Any sleep history ≥3 → at least the cadence is known, even if the
  // period bucket is empty (e.g. first morning nap of the week).
  if (recent.length >= 3) {
    const values = recent.slice(0, 5).map((r) => r.dur);
    const habitual = median(values);
    // Bias toward the age default for this period so a "night" suggestion
    // doesn't show up as 60 min just because the parent only logs naps.
    const defaults = ageDefaultsFor(ageMonths);
    const periodDefault = defaults[period];
    const blended = periodDefault > 0 ? (habitual + periodDefault) / 2 : habitual;
    return buildSuggestion(blended, recent[0].dur, recent.length, period, 'anyHistory');
  }

  // 3. Age fallback.
  if (input.babyBirthDate) {
    const defaults = ageDefaultsFor(ageMonths);
    const minutes = defaults[period] || defaults.afternoonNap;
    return buildSuggestion(minutes, null, 0, period, 'age');
  }

  // 4. Hard fallback.
  return buildSuggestion(period === 'night' ? 540 : 60, null, 0, period, 'fallback');
}

function buildSuggestion(
  habitual: number,
  last: number | null,
  sampleCount: number,
  period: SleepPeriod,
  source: SleepSource,
): SleepSuggestion {
  const step = chipStep(habitual);
  const usual = roundToStep(habitual, step);
  const shorter = roundToStep(Math.max(step, usual * 0.75), step);
  const longer = roundToStep(usual * 1.25, step);
  const lastRounded = last && last > 0 ? roundToStep(last, step) : null;

  const chips: SleepChip[] = [];
  const seen = new Set<number>();
  const push = (chip: SleepChip) => {
    if (chip.minutes <= 0 || seen.has(chip.minutes)) return;
    seen.add(chip.minutes);
    chips.push(chip);
  };
  if (lastRounded != null && Math.abs(lastRounded - usual) >= step * 2) {
    push({ minutes: lastRounded, kind: 'last' });
  }
  push({ minutes: shorter, kind: 'shorter' });
  push({ minutes: usual, kind: 'usual' });
  push({ minutes: longer, kind: 'longer' });

  return {
    chips: chips.slice(0, 4).sort((a, b) => a.minutes - b.minutes),
    period,
    source,
    habitualMin: usual,
    lastMin: last,
    sampleCount,
  };
}

export function formatSleepDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}
