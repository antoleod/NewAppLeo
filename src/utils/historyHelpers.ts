import { EntryRecord, EntryType } from '@/types';
import { dateKey, toDate } from '@/utils/date';

type TFn = (key: string, defaultValue?: string) => string;

export function getDetail(entry: EntryRecord, t: TFn): string {
  switch (entry.type) {
    case 'feed':
      return entry.payload.mode === 'bottle'
        ? `${entry.payload.amountMl ?? 0} ml`
        : `${entry.payload.durationMin ?? 0} min · ${entry.payload.side ?? 'left'}`;
    case 'food':
      return [entry.payload.foodName, entry.payload.quantity].filter(Boolean).join(' · ') || t('history.entryFood');
    case 'sleep':
      return `${entry.payload.durationMin ?? 0} min`;
    case 'diaper': {
      const parts = [`P ${entry.payload.pee ?? 0}`, `C ${entry.payload.poop ?? 0}`, `V ${entry.payload.vomit ?? 0}`];
      const colorEmoji: Record<string, string> = { yellow: '🟡', brown: '🟤', green: '🟢', dark: '⚫', red: '🔴' };
      const consistencyEmoji: Record<string, string> = { liquid: '🌊', soft: '💧', normal: '🟫', hard: '🥜' };
      const extras: string[] = [];
      if (entry.payload.poopColor && colorEmoji[entry.payload.poopColor]) extras.push(colorEmoji[entry.payload.poopColor]);
      if (entry.payload.poopConsistency && consistencyEmoji[entry.payload.poopConsistency]) extras.push(consistencyEmoji[entry.payload.poopConsistency]);
      if (entry.payload.diaperLeaked) extras.push('⚠️');
      return extras.length ? `${parts.join(' · ')}  ${extras.join(' ')}` : parts.join(' · ');
    }
    case 'pump':
      return `${entry.payload.amountMl ?? 0} ml · ${entry.payload.durationMin ?? 0} min`;
    case 'measurement':
      return [
        entry.payload?.weightKg ? `${entry.payload.weightKg} kg` : null,
        entry.payload?.heightCm ? `${entry.payload.heightCm} cm` : null,
        (entry.payload as any)?.headCircCm ? `${(entry.payload as any).headCircCm} cm ${t('history.headCircAbbr')}` : null,
      ].filter(Boolean).join(' · ');
    case 'medication':
      return [entry.payload.name, entry.payload.dosage].filter(Boolean).join(' · ');
    case 'milestone':
      return entry.payload.title ?? entry.title;
    case 'symptom':
      return entry.payload.tags?.join(', ') ?? entry.notes ?? t('history.entrySymptom');
    default:
      return entry.title;
  }
}

export function groupByDay(entries: EntryRecord[]): [string, EntryRecord[]][] {
  const map = new Map<string, EntryRecord[]>();
  for (const entry of entries) {
    const key = dateKey(entry.occurredAt);
    const current = map.get(key) ?? [];
    current.push(entry);
    map.set(key, current);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

export function monthsAndDaysSince(birthDate?: string): { monthsFloat: number; months: number; days: number } {
  const birth = toDate(birthDate);
  if (!birth) return { monthsFloat: 0, months: 0, days: 0 };
  const now = new Date();
  const totalDays = Math.max(0, Math.floor((now.getTime() - birth.getTime()) / 86400000));
  return {
    monthsFloat: totalDays / 30.4375,
    months: Math.floor(totalDays / 30.4375),
    days: totalDays % 30,
  };
}

export function buildCsv(entries: EntryRecord[], t: TFn): string {
  return [
    'id,type,title,timestamp,detail,notes',
    ...entries.map((entry) =>
      [entry.id, entry.type, entry.title, entry.occurredAt, getDetail(entry, t), entry.notes ?? '']
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    ),
  ].join('\n');
}

const TYPE_LABEL_KEY: Record<string, string> = {
  feed: 'history.filterFeed',
  food: 'history.filterFood',
  sleep: 'history.filterSleep',
  diaper: 'history.filterDiaper',
  pump: 'history.filterPump',
  medication: 'history.filterMedicine',
  measurement: 'history.filterMeasurement',
  vaccine: 'history.filterVaccine',
  symptom: 'history.filterSymptom',
  temperature: 'history.filterTemperature',
  milestone: 'history.filterMilestone',
};

export function getTypeLabel(type: EntryType, t: TFn): string {
  const key = TYPE_LABEL_KEY[type];
  return key ? t(key) : type;
}

export function progressPercent(value: number | null | undefined, min: number, max: number): number {
  if (!value || max <= min) return 0;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}
