import { EntryRecord, UserProfile } from '@/types';

type LeoFeed = {
  id: string;
  source: 'bottle' | 'breast';
  dateISO: string;
  amountMl?: number;
  durationSec?: number;
  breastSide?: 'left' | 'right' | 'both';
};

type LeoElim = {
  id: string;
  dateISO: string;
  pee?: boolean | number;
  poop?: boolean | number;
  vomit?: boolean | number;
  notes?: string;
};

type LeoMedication = {
  id: string;
  dateISO: string;
  name?: string;
  dosage?: string;
  notes?: string;
};

type LeoMeasurement = {
  id: string;
  dateISO: string;
  weight?: number;
  height?: number;
  temp?: number;
  notes?: string;
};

type LeoSleep = {
  id: string;
  startISO: string;
  endISO?: string;
  durationSec?: number;
  notes?: string;
};

type LeoPump = {
  id: string;
  startISO?: string;
  endISO?: string;
  dateISO: string;
  amountMl?: number;
  durationSec?: number;
  notes?: string;
};

type LeoDataset = {
  feeds?: LeoFeed[];
  elims?: LeoElim[];
  meds?: LeoMedication[];
  measurements?: LeoMeasurement[];
  sleepSessions?: LeoSleep[];
  pumpSessions?: LeoPump[];
};

function getLeoDataset(): LeoDataset {
  return require('../../leodata.json') as LeoDataset;
}

function toDurationMin(durationSec?: number) {
  if (!durationSec || durationSec <= 0) return undefined;
  return Math.max(1, Math.round(durationSec / 60));
}

function sortEntries(entries: EntryRecord[]) {
  return [...entries].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

function normalizeBreastSide(value?: string) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'gauche' || normalized === 'left') return 'left';
  if (normalized === 'droite' || normalized === 'right') return 'right';
  if (normalized === 'both' || normalized === 'deux' || normalized === 'both breasts') return 'both';
  return undefined;
}

export function importLeoEntries(): EntryRecord[] {
  const data = getLeoDataset();
  const mapped: EntryRecord[] = [];

  for (const feed of data.feeds ?? []) {
    mapped.push({
      id: `leo_feed_${feed.id}`,
      slug: `demo_feed_${feed.id}`,
      type: 'feed',
      title: feed.source === 'bottle' ? 'Biberon' : 'Sein',
      occurredAt: feed.dateISO,
      createdAt: feed.dateISO,
      updatedAt: feed.dateISO,
      payload: {
        mode: feed.source,
        side: normalizeBreastSide(feed.breastSide),
        amountMl: feed.amountMl,
        durationMin: toDurationMin(feed.durationSec),
      },
    });
  }

  for (const diaper of data.elims ?? []) {
    mapped.push({
      id: `leo_diaper_${diaper.id}`,
      slug: `demo_diaper_${diaper.id}`,
      type: 'diaper',
      title: 'Couche',
      notes: diaper.notes,
      occurredAt: diaper.dateISO,
      createdAt: diaper.dateISO,
      updatedAt: diaper.dateISO,
      payload: {
        pee: diaper.pee ? 1 : 0,
        poop: diaper.poop ? 1 : 0,
        vomit: diaper.vomit ? 1 : 0,
      },
    });
  }

  for (const medication of data.meds ?? []) {
    mapped.push({
      id: `leo_med_${medication.id}`,
      slug: `demo_med_${medication.id}`,
      type: 'medication',
      title: medication.name || 'Medicament',
      notes: medication.notes,
      occurredAt: medication.dateISO,
      createdAt: medication.dateISO,
      updatedAt: medication.dateISO,
      payload: {
        name: medication.name,
        dosage: medication.dosage,
      },
    });
  }

  for (const measurement of data.measurements ?? []) {
    mapped.push({
      id: `leo_measure_${measurement.id}`,
      slug: `demo_measure_${measurement.id}`,
      type: 'measurement',
      title: 'Mesure',
      notes: measurement.notes,
      occurredAt: measurement.dateISO,
      createdAt: measurement.dateISO,
      updatedAt: measurement.dateISO,
      payload: {
        weightKg: measurement.weight,
        heightCm: measurement.height,
        tempC: measurement.temp,
      },
    });
  }

  for (const sleep of data.sleepSessions ?? []) {
    mapped.push({
      id: `leo_sleep_${sleep.id}`,
      slug: `demo_sleep_${sleep.id}`,
      type: 'sleep',
      title: 'Sommeil',
      notes: sleep.notes,
      occurredAt: sleep.endISO ?? sleep.startISO,
      createdAt: sleep.startISO,
      updatedAt: sleep.endISO ?? sleep.startISO,
      payload: {
        durationMin: toDurationMin(sleep.durationSec),
      },
    });
  }

  for (const pump of data.pumpSessions ?? []) {
    mapped.push({
      id: `leo_pump_${pump.id}`,
      slug: `demo_pump_${pump.id}`,
      type: 'pump',
      title: 'Tire-lait',
      notes: pump.notes,
      occurredAt: pump.dateISO,
      createdAt: pump.startISO ?? pump.dateISO,
      updatedAt: pump.endISO ?? pump.dateISO,
      payload: {
        amountMl: pump.amountMl,
        durationMin: toDurationMin(pump.durationSec),
      },
    });
  }

  return sortEntries(mapped);
}

export function buildLeoProfilePatch(current?: UserProfile | null): Partial<UserProfile> {
  const data = getLeoDataset();
  const latestMeasurement = [...(data.measurements ?? [])]
    .sort((left, right) => right.dateISO.localeCompare(left.dateISO))[0];

  return {
    babyName: current?.babyName || 'Leo',
    babyBirthDate: current?.babyBirthDate || '2025-10-21',
    currentWeightKg: latestMeasurement?.weight ?? current?.currentWeightKg,
    heightCm: latestMeasurement?.height ?? current?.heightCm,
    birthWeightKg: current?.birthWeightKg ?? latestMeasurement?.weight,
    babyNotes: current?.babyNotes ?? 'Imported from Leo local dataset.',
  };
}
