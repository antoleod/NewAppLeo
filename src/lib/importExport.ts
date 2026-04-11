import { AppDataContextType } from '@/context/AppDataContext';

export interface ImporterConfig {
  onSuccess: (data: any) => void;
  onError: (error: Error) => void;
  importType?: 'feeds' | 'diapers' | 'sleeps' | 'custom';
}

/**
 * Parse and validate JSON import data
 */
export function parseImportData(jsonString: string): any {
  try {
    const data = JSON.parse(jsonString);
    if (!data) throw new Error('Invalid JSON data');
    return data;
  } catch (error: any) {
    throw new Error(`Failed to parse JSON: ${error.message}`);
  }
}

/**
 * Convert imported feed entries to app format
 */
export function importFeeds(rawFeeds: any[]) {
  if (!Array.isArray(rawFeeds)) {
    throw new Error('Expected an array of feed entries');
  }

  return rawFeeds.map((feed: any) => ({
    id: String(feed.id || `feed_${Date.now()}_${Math.random()}`),
    type: 'feeding' as const,
    dateISO: feed.dateISO || new Date().toISOString(),
    amountMl: Number(feed.amountMl) || 0,
    source: feed.source || 'bottle',
    bottleStartISO: feed.bottleStartISO,
    bottleEndISO: feed.bottleEndISO,
    durationSec: Number(feed.durationSec) || 0,
    notes: feed.notes || '',
    babyId: undefined, // Will be set by app
  }));
}

/**
 * Convert imported diaper entries to app format
 */
export function importDiapers(rawDiapers: any[]) {
  if (!Array.isArray(rawDiapers)) {
    throw new Error('Expected an array of diaper entries');
  }

  return rawDiapers.map((diaper: any) => ({
    id: String(diaper.id || `diaper_${Date.now()}_${Math.random()}`),
    type: 'diaper' as const,
    dateISO: diaper.dateISO || new Date().toISOString(),
    kind: diaper.kind || 'pee', // pee, poo, pee+poo
    notes: diaper.notes || '',
    babyId: undefined,
  }));
}

/**
 * Convert imported sleep entries to app format
 */
export function importSleeps(rawSleeps: any[]) {
  if (!Array.isArray(rawSleeps)) {
    throw new Error('Expected an array of sleep entries');
  }

  return rawSleeps.map((sleep: any) => ({
    id: String(sleep.id || `sleep_${Date.now()}_${Math.random()}`),
    type: 'sleep' as const,
    dateISO: sleep.dateISO || new Date().toISOString(),
    startISO: sleep.startISO || sleep.dateISO,
    endISO: sleep.endISO,
    durationSec: Number(sleep.durationSec) || 0,
    location: sleep.location,
    notes: sleep.notes || '',
    babyId: undefined,
  }));
}

/**
 * Generic import handler that detects data type and imports accordingly
 */
export function importJsonData(data: any) {
  const entries: any[] = [];

  // Try to detect feeds
  if (data.feeds && Array.isArray(data.feeds)) {
    entries.push(...importFeeds(data.feeds));
  }

  // Try to detect diapers
  if (data.diapers && Array.isArray(data.diapers)) {
    entries.push(...importDiapers(data.diapers));
  }

  // Try to detect sleeps
  if (data.sleeps && Array.isArray(data.sleeps)) {
    entries.push(...importSleeps(data.sleeps));
  }

  // Try to detect single entry type in root array
  if (Array.isArray(data) && data.length > 0) {
    const firstEntry = data[0];
    if (firstEntry.amountMl !== undefined) {
      // Looks like feeds
      entries.push(...importFeeds(data));
    } else if (firstEntry.kind !== undefined || firstEntry.poo !== undefined) {
      // Looks like diapers
      entries.push(...importDiapers(data));
    } else if (firstEntry.durationSec !== undefined && firstEntry.startISO) {
      // Looks like sleeps
      entries.push(...importSleeps(data));
    }
  }

  if (entries.length === 0) {
    throw new Error('No recognized entry types found in import data');
  }

  return entries;
}

/**
 * Batch add imported entries to app storage
 */
export async function batchImportEntries(
  entries: any[],
  addEntry: AppDataContextType['addEntry']
) {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const entry of entries) {
    try {
      await addEntry(entry);
      results.success++;
    } catch (error: any) {
      results.failed++;
      results.errors.push(`Failed to import ${entry.id}: ${error.message}`);
    }
  }

  return results;
}

/**
 * Export entries to JSON
 */
export function exportEntriesToJson(entries: any[], filename: string = 'leo-export.json') {
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
  static validateFeeds(feeds: any[]): boolean {
    return Array.isArray(feeds) && feeds.every(f => 
      typeof f.amountMl === 'number' && 
      typeof f.dateISO === 'string'
    );
  }

  static validateDiapers(diapers: any[]): boolean {
    return Array.isArray(diapers) && diapers.every(d =>
      (d.kind || d.poo || d.pee) &&
      typeof d.dateISO === 'string'
    );
  }

  static validateSleeps(sleeps: any[]): boolean {
    return Array.isArray(sleeps) && sleeps.every(s =>
      typeof s.durationSec === 'number' &&
      typeof s.dateISO === 'string'
    );
  }

  static getImportSummary(entries: any[]) {
    const summary = {
      feeds: entries.filter(e => e.type === 'feeding').length,
      diapers: entries.filter(e => e.type === 'diaper').length,
      sleeps: entries.filter(e => e.type === 'sleep').length,
      total: entries.length,
    };
    return summary;
  }
}
