import { EntryRecord } from '@/types';
import { mealTones } from '@/lib/entryComposer';

// ── Locale / formatting ──────────────────────────────────────────────────────

export function getHourPeriod(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export function localeTag(language: string): string {
  if (language === 'es') return 'es-ES';
  if (language === 'en') return 'en-US';
  if (language === 'nl') return 'nl-BE';
  return 'fr-FR';
}

export function hoursSince(timestamp?: string): number | null {
  if (!timestamp) return null;
  return Math.max(0, (Date.now() - new Date(timestamp).getTime()) / 36e5);
}

export function formatRelative(timestamp: string | undefined, locale: string): string {
  const hours = hoursSince(timestamp);
  if (hours === null) return '--';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${String(m).padStart(2, '0')}`;
  }
  const dayAbbr = locale.startsWith('fr') ? 'j' : 'd';
  return `${Math.round(hours / 24)} ${dayAbbr}`;
}

export function formatClock(timestamp: string | undefined, locale: string): string {
  if (!timestamp) return '--:--';
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
}

export function calculateBabyAge(birthDate: string): { months: number; days: number } {
  const birth = new Date(birthDate);
  const today = new Date();
  let months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
  let days = today.getDate() - birth.getDate();
  if (days < 0) {
    months--;
    const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += lastMonth.getDate();
  }
  return { months, days };
}

// ── Entry display ────────────────────────────────────────────────────────────

export function getEntryDisplayLabel(entry: EntryRecord, t: (key: string) => string): string {
  switch (entry.type) {
    case 'feed':
      return entry.payload?.mode === 'breast' ? t('entry.titleFeedBreast') : t('entry.titleFeedBottle');
    case 'sleep': return t('entry.titleSleep');
    case 'diaper': return t('entry.diaper');
    case 'food': return entry.payload?.foodName || t('entry.titleFoodDefault');
    case 'temperature': return t('entry.titleTemperatureReading');
    case 'medication': return entry.payload?.name || t('entry.medicine');
    case 'vaccine': return entry.payload?.vaccineName || t('entry.vaccine');
    case 'measurement': return t('entry.measurement');
    case 'symptom': return t('entry.symptoms');
    default: return entry.title;
  }
}

export function getEntryDetail(entry: EntryRecord, t: (key: string) => string, _locale: string): string {
  switch (entry.type) {
    case 'feed':
      if (entry.payload?.mode === 'bottle' && entry.payload?.amountMl) return `${entry.payload.amountMl} ml`;
      if (entry.payload?.mode === 'breast') {
        const parts: string[] = [];
        if (entry.payload?.durationMin) parts.push(`${entry.payload.durationMin} min`);
        return parts.join(' · ');
      }
      return '';
    case 'sleep':
      if (!entry.payload?.durationMin) return '';
      return entry.payload.durationMin >= 60
        ? `${Math.floor(entry.payload.durationMin / 60)}h${String(entry.payload.durationMin % 60).padStart(2, '0')}`
        : `${entry.payload.durationMin} min`;
    case 'food': return entry.payload?.quantityGrams ? `${entry.payload.quantityGrams}g` : '';
    case 'temperature': return entry.payload?.tempC ? `${entry.payload.tempC}°C` : '';
    case 'medication': return entry.payload?.dosage || '';
    case 'vaccine': return entry.payload?.vaccineDose ? `${t('vaccine.dose')}${entry.payload.vaccineDose}` : '';
    case 'measurement':
      return [
        entry.payload?.weightKg ? `${entry.payload.weightKg} kg` : '',
        entry.payload?.heightCm ? `${entry.payload.heightCm} cm` : '',
      ].filter(Boolean).join(' · ');
    default: return entry.notes || '';
  }
}

// ── Data derivation ──────────────────────────────────────────────────────────

export function getWeightMeasurements(entries: EntryRecord[]) {
  return entries
    .filter((e) => e.type === 'measurement' && e.payload?.weightKg)
    .slice(0, 5)
    .map((e) => ({ weight: e.payload.weightKg, date: new Date(e.occurredAt) }))
    .reverse();
}

export function getPinnedVaccines(entries: EntryRecord[]) {
  return entries
    .filter((e) => e.type === 'vaccine' && e.payload?.hasReminder)
    .sort((a, b) => {
      const dateA = new Date(a.payload?.vaccineNextDueDate ?? '').getTime();
      const dateB = new Date(b.payload?.vaccineNextDueDate ?? '').getTime();
      return dateA - dateB;
    })
    .slice(0, 3);
}

export function getLastFood(entries: EntryRecord[]) {
  return entries.find((e) => e.type === 'food');
}

export function getFoodTodayCount(entries: EntryRecord[]): number {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return entries.filter((e) => e.type === 'food' && new Date(e.occurredAt).getTime() >= startOfDay).length;
}

export function getFoodAllergyAlerts(entries: EntryRecord[]): { food: string; count: number }[] {
  const foodEntries = entries.filter((e) => e.type === 'food');
  if (foodEntries.length === 0) return [];
  const allergyFoods = new Map<string, number>();
  foodEntries.slice(0, 20).forEach((entry) => {
    const food = entry.payload?.foodName?.toLowerCase() || '';
    if ((entry.payload?.foodAllergies?.length ?? 0) > 0) {
      allergyFoods.set(food, (allergyFoods.get(food) ?? 0) + 1);
    }
  });
  const alerts: { food: string; count: number }[] = [];
  allergyFoods.forEach((count, food) => { if (count >= 2) alerts.push({ food, count }); });
  return alerts;
}

export type DiaperAlert =
  | { kind: 'liquidStreak'; count: number }
  | { kind: 'colorAlert'; color: 'red' | 'dark' };

export function getDiaperHealthAlerts(entries: EntryRecord[]): DiaperAlert[] {
  const now = Date.now();
  const last24h = now - 24 * 3600000;
  const last48h = now - 48 * 3600000;
  const alerts: DiaperAlert[] = [];
  let liquidCount = 0;
  let colorAlert: 'red' | 'dark' | null = null;
  for (const e of entries) {
    if (e.type !== 'diaper') continue;
    const ts = new Date(e.occurredAt).getTime();
    if (!Number.isFinite(ts)) continue;
    const poop = Number(e.payload?.poop) || 0;
    if (poop === 0) continue;
    if (ts >= last24h && e.payload?.poopConsistency === 'liquid') liquidCount++;
    if (!colorAlert && ts >= last48h) {
      const c = e.payload?.poopColor;
      if (c === 'red' || c === 'dark') colorAlert = c;
    }
  }
  if (liquidCount >= 2) alerts.push({ kind: 'liquidStreak', count: liquidCount });
  if (colorAlert) alerts.push({ kind: 'colorAlert', color: colorAlert });
  return alerts;
}

export type FoodSummary = {
  recent: EntryRecord[];
  mostCommon: { name: string; count: number } | null;
  totalUnique: number;
  totalGramsToday: number;
  mealsToday: number;
};

export function getFoodSummary(entries: EntryRecord[]): FoodSummary {
  const empty: FoodSummary = { recent: [], mostCommon: null, totalUnique: 0, totalGramsToday: 0, mealsToday: 0 };
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const foodEntries: EntryRecord[] = [];
  const counts = new Map<string, number>();
  let totalGramsToday = 0;
  let mealsToday = 0;
  for (const entry of entries) {
    if (entry.type !== 'food') continue;
    foodEntries.push(entry);
    const name = entry.payload?.foodName?.toLowerCase();
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    if (new Date(entry.occurredAt).getTime() >= startOfDay) {
      mealsToday++;
      totalGramsToday += entry.payload?.quantityGrams ?? 0;
    }
  }
  if (foodEntries.length === 0) return empty;
  foodEntries.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  let mostCommonName: string | null = null;
  let maxCount = 0;
  counts.forEach((count, name) => { if (count > maxCount) { maxCount = count; mostCommonName = name; } });
  return {
    recent: foodEntries.slice(0, 8),
    mostCommon: mostCommonName ? { name: mostCommonName, count: maxCount } : null,
    totalUnique: counts.size,
    totalGramsToday,
    mealsToday,
  };
}

export type MealKind = 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'other';

export function getMealKind(value?: string): MealKind {
  if (value === 'breakfast' || value === 'lunch' || value === 'snack' || value === 'dinner') return value;
  return 'other';
}

export const MEAL_TONE: Record<MealKind, string> = mealTones;
