import { AppDataContextType } from '@/context/AppDataContext';
import { EntryPayload, EntryType } from '@/types';

type ImportableEntry = {
  type: EntryType;
  title?: string;
  occurredAt?: string;
  notes?: string;
  payload: EntryPayload;
};

export interface ImportSummary {
  feeds: number;
  diapers: number;
  sleeps: number;
  pumps: number;
  measurements: number;
  medications: number;
  milestones: number;
  symptoms: number;
  total: number;
}

export function parseImportData(jsonString: string): any {
  try {
    const data = JSON.parse(jsonString);
    if (!data) throw new Error('Invalid JSON data');
    return data;
  } catch (error: any) {
    throw new Error(`Failed to parse JSON: ${error.message}`);
  }
}

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function iso(value: any) {
  return typeof value === 'string' && value.trim() ? value : new Date().toISOString();
}

function numberOrUndefined(value: any) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function importFeeds(rawFeeds: any[]): ImportableEntry[] {
  return rawFeeds.map((feed: any) => ({
    type: 'feed',
    title: feed.source === 'breast' ? 'Imported breastfeed' : 'Imported bottle',
    occurredAt: iso(feed.dateISO ?? feed.bottleEndISO ?? feed.bottleStartISO),
    notes: feed.notes || '',
    payload: {
      mode: feed.source === 'breast' ? 'breast' : 'bottle',
      amountMl: numberOrUndefined(feed.amountMl),
      durationMin: feed.durationSec ? Math.max(1, Math.round(Number(feed.durationSec) / 60)) : undefined,
      side: feed.side,
      notes: feed.notes || '',
    },
  }));
}

function importDiapers(rawDiapers: any[]): ImportableEntry[] {
  return rawDiapers.map((diaper: any) => {
    const kind = String(diaper.kind ?? '').toLowerCase();
    const pee = numberOrUndefined(diaper.pee) ?? (kind.includes('pee') || kind.includes('pipi') ? 1 : 0);
    const poop = numberOrUndefined(diaper.poop) ?? (kind.includes('poo') || kind.includes('caca') ? 1 : 0);
    const vomit = numberOrUndefined(diaper.vomit) ?? 0;
    return {
      type: 'diaper',
      title: 'Imported diaper',
      occurredAt: iso(diaper.dateISO),
      notes: diaper.notes || '',
      payload: {
        pee,
        poop,
        vomit,
        notes: diaper.notes || '',
      },
    };
  });
}

function importSleeps(rawSleeps: any[]): ImportableEntry[] {
  return rawSleeps.map((sleep: any) => ({
    type: 'sleep',
    title: 'Imported sleep',
    occurredAt: iso(sleep.endISO ?? sleep.dateISO ?? sleep.startISO),
    notes: sleep.notes || '',
    payload: {
      durationMin: sleep.durationSec ? Math.max(1, Math.round(Number(sleep.durationSec) / 60)) : undefined,
      notes: sleep.notes || '',
    },
  }));
}

function importPumps(rawPumps: any[]): ImportableEntry[] {
  return rawPumps.map((pump: any) => ({
    type: 'pump',
    title: 'Imported pump',
    occurredAt: iso(pump.dateISO ?? pump.endISO ?? pump.startISO),
    notes: pump.notes || '',
    payload: {
      amountMl: numberOrUndefined(pump.amountMl),
      durationMin: pump.durationSec ? Math.max(1, Math.round(Number(pump.durationSec) / 60)) : undefined,
      notes: pump.notes || '',
    },
  }));
}

function importMeasurements(rawMeasurements: any[]): ImportableEntry[] {
  return rawMeasurements.map((measurement: any) => ({
    type: 'measurement',
    title: 'Imported measurement',
    occurredAt: iso(measurement.dateISO),
    notes: measurement.notes || '',
    payload: {
      weightKg: numberOrUndefined(measurement.weightKg ?? measurement.weight),
      heightCm: numberOrUndefined(measurement.heightCm ?? measurement.height),
      headCircCm: numberOrUndefined(measurement.headCircCm ?? measurement.headCircumferenceCm),
      tempC: numberOrUndefined(measurement.tempC ?? measurement.temperatureC),
      notes: measurement.notes || '',
    },
  }));
}

function importMedications(rawMeds: any[]): ImportableEntry[] {
  return rawMeds.map((med: any) => ({
    type: 'medication',
    title: med.name || 'Imported medication',
    occurredAt: iso(med.dateISO),
    notes: med.notes || '',
    payload: {
      name: med.name,
      dosage: med.dosage ?? med.dose,
      intervalHours: numberOrUndefined(med.intervalHours),
      intervalLabel: med.intervalLabel,
      notes: med.notes || '',
    },
  }));
}

function importMilestones(rawMilestones: any[]): ImportableEntry[] {
  return rawMilestones.map((milestone: any) => ({
    type: 'milestone',
    title: milestone.title || 'Imported milestone',
    occurredAt: iso(milestone.dateISO),
    notes: milestone.notes || '',
    payload: {
      title: milestone.title,
      icon: milestone.icon,
      photoUri: milestone.photoUri,
      notes: milestone.notes || '',
    },
  }));
}

function importSymptoms(rawSymptoms: any[]): ImportableEntry[] {
  return rawSymptoms.map((symptom: any) => ({
    type: 'symptom',
    title: symptom.title || 'Imported symptom',
    occurredAt: iso(symptom.dateISO),
    notes: symptom.notes || '',
    payload: {
      tags: asArray<string>(symptom.tags),
      tempC: numberOrUndefined(symptom.tempC ?? symptom.temperatureC),
      notes: symptom.notes || '',
    },
  }));
}

export function importJsonData(data: any): ImportableEntry[] {
  const entries: ImportableEntry[] = [];

  entries.push(...importFeeds(asArray(data.feeds)));
  entries.push(...importDiapers(asArray(data.diapers)));
  entries.push(...importDiapers(asArray(data.elims)));
  entries.push(...importSleeps(asArray(data.sleeps)));
  entries.push(...importSleeps(asArray(data.sleepSessions)));
  entries.push(...importPumps(asArray(data.pumps)));
  entries.push(...importPumps(asArray(data.pumpSessions)));
  entries.push(...importMeasurements(asArray(data.measurements)));
  entries.push(...importMedications(asArray(data.meds)));
  entries.push(...importMilestones(asArray(data.milestones)));
  entries.push(...importSymptoms(asArray(data.symptoms)));

  if (Array.isArray(data.entries)) {
    return importJsonData(groupEntriesByType(data.entries));
  }

  if (Array.isArray(data) && data.length) {
    const first = data[0] ?? {};
    if (first.amountMl !== undefined || first.source !== undefined) return importFeeds(data);
    if (first.kind !== undefined || first.pee !== undefined || first.poop !== undefined) return importDiapers(data);
    if (first.durationSec !== undefined && (first.startISO || first.endISO || first.location)) return importSleeps(data);
    if (first.weightKg !== undefined || first.heightCm !== undefined || first.headCircCm !== undefined) return importMeasurements(data);
    if (first.name !== undefined && (first.dosage !== undefined || first.dose !== undefined)) return importMedications(data);
  }

  if (!entries.length) {
    throw new Error('No recognized entry types found in import data.');
  }

  return entries.filter((entry) => entry.occurredAt);
}

function groupEntriesByType(entries: any[]) {
  return entries.reduce(
    (acc, entry) => {
      const key = `${entry?.type ?? ''}`;
      if (key === 'feed') acc.feeds.push(entry);
      else if (key === 'diaper') acc.elims.push(entry);
      else if (key === 'sleep') acc.sleepSessions.push(entry);
      else if (key === 'pump') acc.pumpSessions.push(entry);
      else if (key === 'measurement') acc.measurements.push(entry);
      else if (key === 'medication') acc.meds.push(entry);
      else if (key === 'milestone') acc.milestones.push(entry);
      else if (key === 'symptom') acc.symptoms.push(entry);
      return acc;
    },
    {
      feeds: [] as any[],
      elims: [] as any[],
      sleepSessions: [] as any[],
      pumpSessions: [] as any[],
      measurements: [] as any[],
      meds: [] as any[],
      milestones: [] as any[],
      symptoms: [] as any[],
    },
  );
}

export async function batchImportEntries(entries: ImportableEntry[], addEntry: AppDataContextType['addEntry']) {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const entry of entries) {
    try {
      await addEntry(entry);
      results.success++;
    } catch (error: any) {
      results.failed++;
      results.errors.push(`Failed to import ${entry.title ?? entry.type}: ${error.message}`);
    }
  }

  return results;
}

export function exportEntriesToJson(entries: any[], filename: string = 'babyflow-export.json') {
  const json = JSON.stringify({ entries }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  if (typeof window !== 'undefined' && window.URL) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  return json;
}

export class ImportValidator {
  static getImportSummary(entries: ImportableEntry[]): ImportSummary {
    return {
      feeds: entries.filter((entry) => entry.type === 'feed').length,
      diapers: entries.filter((entry) => entry.type === 'diaper').length,
      sleeps: entries.filter((entry) => entry.type === 'sleep').length,
      pumps: entries.filter((entry) => entry.type === 'pump').length,
      measurements: entries.filter((entry) => entry.type === 'measurement').length,
      medications: entries.filter((entry) => entry.type === 'medication').length,
      milestones: entries.filter((entry) => entry.type === 'milestone').length,
      symptoms: entries.filter((entry) => entry.type === 'symptom').length,
      total: entries.length,
    };
  }
}
