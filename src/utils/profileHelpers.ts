import type { UnitSystem } from '@/types';
import { getAgeInMonths } from '@/lib/who-recommendations';

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

const WEIGHT_MIN_KG = 1.5;
const WEIGHT_MAX_KG = 25;
const HEIGHT_MIN_CM = 35;
const HEIGHT_MAX_CM = 115;
const HEAD_MIN_CM = 28;
const HEAD_MAX_CM = 55;

// ── Unit conversions ─────────────────────────────────────────────────────────

export function kgToLb(kg: number): number { return kg / KG_PER_LB; }
export function lbToKg(lb: number): number { return lb * KG_PER_LB; }
export function cmToIn(cm: number): number { return cm / CM_PER_IN; }
export function inToCm(inches: number): number { return inches * CM_PER_IN; }

export function formatWeightDisplay(kg: string | number, units: UnitSystem): string {
  const n = Number(kg);
  if (!Number.isFinite(n) || n <= 0) return '';
  return units === 'imperial' ? kgToLb(n).toFixed(1) : String(n);
}

export function formatHeightDisplay(cm: string | number, units: UnitSystem): string {
  const n = Number(cm);
  if (!Number.isFinite(n) || n <= 0) return '';
  return units === 'imperial' ? cmToIn(n).toFixed(1) : String(n);
}

export function parseWeightInput(value: string, units: UnitSystem): number | undefined {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return units === 'imperial' ? lbToKg(n) : n;
}

export function parseHeightInput(value: string, units: UnitSystem): number | undefined {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return units === 'imperial' ? inToCm(n) : n;
}

// ── Range validation ─────────────────────────────────────────────────────────

export function checkWeightRange(input: string, units: UnitSystem): { key: string } | null {
  if (!input) return null;
  const kg = parseWeightInput(input, units);
  if (kg === undefined || !Number.isFinite(kg) || kg <= 0) return null;
  if (kg < WEIGHT_MIN_KG || kg > WEIGHT_MAX_KG) {
    if (units === 'imperial' && kg > WEIGHT_MAX_KG) return { key: 'profile.outOfRangeMaybeKg' };
    return { key: 'profile.outOfRangeWeight' };
  }
  return null;
}

export function checkHeightRange(input: string, units: UnitSystem): { key: string } | null {
  if (!input) return null;
  const cm = parseHeightInput(input, units);
  if (cm === undefined || !Number.isFinite(cm) || cm <= 0) return null;
  if (cm < HEIGHT_MIN_CM || cm > HEIGHT_MAX_CM) {
    if (units === 'imperial' && cm > HEIGHT_MAX_CM) return { key: 'profile.outOfRangeMaybeCm' };
    return { key: 'profile.outOfRangeHeight' };
  }
  return null;
}

export function checkHeadCircRange(input: string, units: UnitSystem): { key: string } | null {
  if (!input) return null;
  const cm = parseHeightInput(input, units);
  if (cm === undefined || !Number.isFinite(cm) || cm <= 0) return null;
  if (cm < HEAD_MIN_CM || cm > HEAD_MAX_CM) return { key: 'profile.outOfRangeHead' };
  return null;
}

// ── Display helpers ──────────────────────────────────────────────────────────

export function getCorrectedAgeLabel(birthDate: string, prematureWeeks: number, t: (key: string) => string): string | null {
  if (!birthDate || !prematureWeeks || prematureWeeks <= 0) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const corrected = new Date(birth.getTime() + prematureWeeks * 7 * 24 * 60 * 60 * 1000);
  const months = getAgeInMonths(corrected.toISOString());
  return `${t('profile.correctedAge')}: ~${months} ${t('profile.monthsShort')}`;
}

export function formatDateForDisplay(iso: string, locale: string): string {
  if (!iso) return '';
  const date = new Date(iso + 'T00:00:00.000Z');
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString(
    locale === 'es' ? 'es-ES' : locale === 'en' ? 'en-US' : locale === 'nl' ? 'nl-NL' : 'fr-FR',
    options,
  );
}

export function clampGoal(value: string, min: number, max: number): string {
  if (value === '') return '';
  const digits = value.replace(/[^0-9]/g, '');
  if (digits === '') return '';
  return String(Math.max(min, Math.min(max, Number(digits))));
}

export function generateBabyId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `baby_${Date.now()}`;
}

export function dateToIsoString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function isoStringToDate(iso: string): Date {
  if (!iso) return new Date();
  return new Date(iso + 'T00:00:00.000Z');
}

/** Strip auth/credential fields before exporting the profile. */
export function sanitizeProfileForExport(profile: any) {
  if (!profile) return null;
  const { encryptedPassword: _ep, pinHash: _ph, pinSalt: _ps, ...safe } = profile;
  return safe;
}
