import { EntryRecord, EntryType, UserProfile } from '@/types';
import { AppSettings } from '@/lib/storage';
import { dateKey, formatDuration, formatLongDate, formatTime, isSameDay, startOfDay, subtractDays } from './date';

export interface TimelineSection {
  title: string;
  key: string;
  entries: EntryRecord[];
}

export interface DashboardSummary {
  today: {
    feedCount: number;
    foodCount: number;
    bottleMl: number;
    sleepMinutes: number;
    diaperCount: number;
    pumpMinutes: number;
  };
  cards: Array<{ label: string; value: string; detail: string; tone: 'primary' | 'secondary' | 'success' | 'warning' }>;
  recent: EntryRecord[];
  trend: Array<{ label: string; feedCount: number; bottleMl: number; sleepMinutes: number }>;
}

export interface MedicationTimelineStatus {
  lastMedicine: EntryRecord | null;
  nextAllowedAt: string | null;
  nextAllowedLabel: string | null;
  otherMedicineAvailable: boolean | null;
  otherMedicineLabel: string | null;
  planActive: boolean;
  suggestedNextName: string | null;
}

function payloadOf(entry: EntryRecord) {
  return entry.payload ?? {};
}

function normalizeMedicineName(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

export function getEntryTitle(entry: EntryRecord) {
  const payload = payloadOf(entry);
  switch (entry.type) {
    case 'feed':
      return payload.mode === 'bottle' ? 'Bottle feed' : 'Breast feed';
    case 'food':
      return payload.foodName ?? 'Food log';
    case 'sleep':
      return 'Sleep session';
    case 'diaper':
      return 'Diaper log';
    case 'pump':
      return 'Pump session';
    case 'measurement':
      return 'Measurement';
    case 'medication':
      return payload.name ?? entry.title;
    case 'milestone':
      return payload.title ?? entry.title;
    case 'symptom':
      return 'Symptom log';
    default:
      return entry.title;
  }
}

export function getEntrySubtitle(entry: EntryRecord) {
  const time = formatTime(entry.occurredAt);
  const payload = payloadOf(entry);

  switch (entry.type) {
    case 'feed':
      return payload.mode === 'bottle'
        ? `${payload.amountMl ?? 0} ml · ${time}`
        : `${payload.durationMin ?? 0} min · ${payload.side ?? 'side'} · ${time}`;
    case 'food':
      return [payload.foodName ?? 'Food', payload.quantity, time].filter(Boolean).join(' · ');
    case 'sleep':
      return `${formatDuration(payload.durationMin ?? 0)} · ${time}`;
    case 'diaper':
      return `P ${payload.pee ?? 0} · C ${payload.poop ?? 0} · V ${payload.vomit ?? 0}`;
    case 'pump':
      return `${formatDuration(payload.durationMin ?? 0)} · ${payload.amountMl ?? 0} ml`;
    case 'measurement':
      return [
        payload.weightKg ? `${payload.weightKg} kg` : null,
        payload.heightCm ? `${payload.heightCm} cm` : null,
        payload.headCircCm ? `${payload.headCircCm} cm HC` : null,
        payload.tempC ? `${payload.tempC} C` : null,
      ]
        .filter(Boolean)
        .join(' · ') || time;
    case 'medication':
      return [payload.dosage ?? 'Dose recorded', time].filter(Boolean).join(' · ');
    case 'milestone':
      return [payload.icon ?? 'Milestone', time].filter(Boolean).join(' · ');
    case 'symptom':
      return [payload.notes ?? 'Symptom log', time].filter(Boolean).join(' · ');
    default:
      return time;
  }
}

export function getTimelineSections(entries: EntryRecord[], filter: EntryType | 'all' = 'all'): TimelineSection[] {
  const sorted = [...entries]
    .filter((entry) => filter === 'all' || entry.type === filter)
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

  const map = new Map<string, EntryRecord[]>();
  sorted.forEach((entry) => {
    const key = dateKey(entry.occurredAt);
    const list = map.get(key) ?? [];
    list.push(entry);
    map.set(key, list);
  });

  return [...map.entries()].map(([key, items]) => ({
    key,
    title: formatLongDate(key),
    entries: items,
  }));
}

export function getTimelineItems(entries: EntryRecord[], filter: EntryType | 'all' = 'all') {
  return [...entries]
    .filter((entry) => filter === 'all' || entry.type === filter)
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

export function getWeeklyTrend(entries: EntryRecord[]) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = subtractDays(startOfDay(new Date()), 6 - index);
    const items = entries.filter((entry) => isSameDay(entry.occurredAt, day));
    const feedCount = items.filter((entry) => entry.type === 'feed').length;
    const bottleMl = items
      .filter((entry) => entry.type === 'feed' && payloadOf(entry).mode === 'bottle')
      .reduce((sum, entry) => sum + (payloadOf(entry).amountMl ?? 0), 0);
    const sleepMinutes = items
      .filter((entry) => entry.type === 'sleep' || entry.type === 'pump')
      .reduce((sum, entry) => sum + (payloadOf(entry).durationMin ?? 0), 0);

    return {
      key: dateKey(day),
      label: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(day),
      feedCount,
      bottleMl,
      sleepMinutes,
    };
  });
}

export function getNextFeedSuggestion(entries: EntryRecord[]) {
  const feedTimes = entries
    .filter((entry) => entry.type === 'feed')
    .map((entry) => new Date(entry.occurredAt).getTime())
    .filter((value) => Number.isFinite(value))
    .slice(0, 8)
    .sort((left, right) => left - right);

  if (feedTimes.length < 2) {
    return 'Log two feeds to estimate the next one.';
  }

  const intervals = feedTimes.slice(1).map((value, index) => value - feedTimes[index]);
  const average = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  return `Suggested around ${formatTime(new Date(feedTimes[feedTimes.length - 1] + average))}`;
}

export function getTodaySummary(entries: EntryRecord[], profile?: UserProfile | null): DashboardSummary {
  const today = startOfDay(new Date());
  const todaysEntries = entries.filter((entry) => isSameDay(entry.occurredAt, today));

  const feedEntries = todaysEntries.filter((entry) => entry.type === 'feed');
  const foodEntries = todaysEntries.filter((entry) => entry.type === 'food');
  const bottleMl = feedEntries
    .filter((entry) => payloadOf(entry).mode === 'bottle')
    .reduce((sum, entry) => sum + (payloadOf(entry).amountMl ?? 0), 0);
  const feedCount = feedEntries.length;
  const sleepMinutes = todaysEntries
    .filter((entry) => entry.type === 'sleep')
    .reduce((sum, entry) => sum + (payloadOf(entry).durationMin ?? 0), 0);
  const diaperCount = todaysEntries.filter((entry) => entry.type === 'diaper').length;
  const pumpMinutes = todaysEntries
    .filter((entry) => entry.type === 'pump')
    .reduce((sum, entry) => sum + (payloadOf(entry).durationMin ?? 0), 0);

  const recent = [...entries].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)).slice(0, 6);
  const trend = getWeeklyTrend(entries);

  return {
    today: {
      feedCount,
      foodCount: foodEntries.length,
      bottleMl,
      sleepMinutes,
      diaperCount,
      pumpMinutes,
    },
    cards: [
      {
        label: 'Feeds',
        value: String(feedCount),
        detail: `${profile?.goalFeedingsPerDay ?? 8} daily goal`,
        tone: 'primary',
      },
      {
        label: 'Bottle',
        value: `${bottleMl} ml`,
        detail: "Today's bottle total",
        tone: 'secondary',
      },
      {
        label: 'Sleep',
        value: formatDuration(sleepMinutes),
        detail: `${profile?.goalSleepHoursPerDay ?? 14}h goal`,
        tone: 'success',
      },
      {
        label: 'Diapers',
        value: String(diaperCount),
        detail: `${profile?.goalDiapersPerDay ?? 6} daily goal`,
        tone: 'warning',
      },
      {
        label: 'Food',
        value: String(foodEntries.length),
        detail: 'Meals logged today',
        tone: 'secondary',
      },
    ],
    recent,
    trend,
  };
}

export function getMedicationTimelineStatus(entries: EntryRecord[], settings?: AppSettings | null): MedicationTimelineStatus {
  const medicationEntries = [...entries]
    .filter((entry) => entry.type === 'medication' && payloadOf(entry).name)
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

  const lastMedicine = medicationEntries[0] ?? null;
  const plan = settings?.medicationAlternatingPlan;
  const isPlanEnabled = Boolean(plan?.enabled && plan?.medicines && plan.medicines.length >= 2);

  if (!lastMedicine) {
    return {
      lastMedicine: null,
      nextAllowedAt: null,
      nextAllowedLabel: null,
      otherMedicineAvailable: null,
      otherMedicineLabel: null,
      planActive: isPlanEnabled,
      suggestedNextName: isPlanEnabled ? plan!.medicines[0].name : null,
    };
  }

  const lastMedName = normalizeMedicineName(payloadOf(lastMedicine).name);
  const lastMedInterval = payloadOf(lastMedicine).intervalHours || 6;
  const nextAllowedForLast = new Date(new Date(lastMedicine.occurredAt).getTime() + lastMedInterval * 3600000);

  if (!isPlanEnabled) {
    return {
      lastMedicine,
      nextAllowedAt: nextAllowedForLast.toISOString(),
      nextAllowedLabel: `Next ${payloadOf(lastMedicine).name} allowed`,
      otherMedicineAvailable: null,
      otherMedicineLabel: null,
      planActive: false,
      suggestedNextName: payloadOf(lastMedicine).name ?? null,
    };
  }

  // Alternating Logic
  const medicineA = plan!.medicines[0];
  const medicineB = plan!.medicines[1];
  
  const lastEntryA = medicationEntries.find(e => normalizeMedicineName(payloadOf(e).name) === normalizeMedicineName(medicineA.name));
  const lastEntryB = medicationEntries.find(e => normalizeMedicineName(payloadOf(e).name) === normalizeMedicineName(medicineB.name));

  const nextAllowedA = lastEntryA 
    ? new Date(new Date(lastEntryA.occurredAt).getTime() + medicineA.intervalHours * 3600000)
    : new Date(0);
  const nextAllowedB = lastEntryB 
    ? new Date(new Date(lastEntryB.occurredAt).getTime() + medicineB.intervalHours * 3600000)
    : new Date(0);

  const now = Date.now();
  const aAvailable = nextAllowedA.getTime() <= now;
  const bAvailable = nextAllowedB.getTime() <= now;

  // If we just gave A, suggest B next, and vice versa
  let suggestedNext = lastMedName === normalizeMedicineName(medicineA.name) ? medicineB.name : medicineA.name;
  let nextAllowedAt = lastMedName === normalizeMedicineName(medicineA.name) ? nextAllowedB : nextAllowedA;

  // But if the "other" one is not due yet, the absolute next allowed is the minimum of both
  const absoluteNextAllowed = new Date(Math.min(nextAllowedA.getTime(), nextAllowedB.getTime()));

  return {
    lastMedicine,
    nextAllowedAt: absoluteNextAllowed.toISOString(),
    nextAllowedLabel: aAvailable || bAvailable ? 'Medicine due now' : 'Waiting for next interval',
    otherMedicineAvailable: lastMedName === normalizeMedicineName(medicineA.name) ? bAvailable : aAvailable,
    otherMedicineLabel: lastMedName === normalizeMedicineName(medicineA.name) ? medicineB.name : medicineA.name,
    planActive: true,
    suggestedNextName: suggestedNext,
  };
}
