/**
 * Pure helpers for the sync queue. Kept separate from `sync.ts` (which pulls
 * in firebase + AsyncStorage) so the merge / backoff / chunking logic can be
 * unit-tested without booting Firebase. See tests/sync.test.ts.
 */
import type { EntryRecord } from '@/types';

// ---------------------------------------------------------------------------
// Tunable constants
// ---------------------------------------------------------------------------

/** Firestore writeBatch chunk size. Capped well under the 500-op SDK limit
 *  so a single failed batch only re-queues this many ops, not hundreds. */
export const BATCH_SIZE = 25;

/** Per-operation retry cap. After this many failed flushes, the operation
 *  is dropped to prevent a single corrupt entry from blocking the queue. */
export const MAX_RETRIES = 6;

/** Exponential backoff schedule for the next-flush wait time (ms).
 *  0 → 5s → 30s → 2min → 5min → 15min (capped). */
export const BACKOFF_SCHEDULE_MS = [0, 5_000, 30_000, 120_000, 300_000, 900_000];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyncOperation =
  | { kind: 'upsert'; entry: EntryRecord; attempts?: number }
  | { kind: 'delete'; id: string; occurredAt: string; updatedAt: string; attempts?: number };

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

export function backoffMsForAttempt(attempt: number): number {
  const idx = Math.min(attempt, BACKOFF_SCHEDULE_MS.length - 1);
  return BACKOFF_SCHEDULE_MS[Math.max(0, idx)];
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function queueKeyFor(operation: SyncOperation) {
  return operation.kind === 'upsert' ? operation.entry.id : operation.id;
}

/**
 * Last-write-wins by `updatedAt`, with one exception: an existing `delete`
 * sticks against any later `upsert`. This prevents a deleted-then-restored
 * scenario from silently un-deleting on the server.
 */
export function mergeQueue(current: SyncOperation[], incoming: SyncOperation[]): SyncOperation[] {
  const map = new Map<string, SyncOperation>();
  [...current, ...incoming].forEach((operation) => {
    const key = queueKeyFor(operation);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, operation);
      return;
    }

    if (existing.kind === 'delete') {
      map.set(key, operation.kind === 'delete' ? operation : existing);
      return;
    }

    if (operation.kind === 'delete') {
      map.set(key, operation);
      return;
    }

    const existingUpdatedAt = new Date(existing.entry.updatedAt ?? existing.entry.occurredAt).getTime();
    const incomingUpdatedAt = new Date(operation.entry.updatedAt ?? operation.entry.occurredAt).getTime();
    if (incomingUpdatedAt >= existingUpdatedAt) {
      map.set(key, operation);
    }
  });

  return [...map.values()].sort((left, right) => queueKeyFor(left).localeCompare(queueKeyFor(right)));
}

/**
 * Merge two entry lists. Newer `updatedAt` (or `occurredAt` as fallback)
 * wins. Result is sorted by `occurredAt` descending.
 */
export function mergeEntries(local: EntryRecord[], remote: EntryRecord[]): EntryRecord[] {
  const map = new Map<string, EntryRecord>();
  [...local, ...remote].forEach((entry) => {
    const current = map.get(entry.id);
    if (!current) {
      map.set(entry.id, entry);
      return;
    }

    const currentUpdatedAt = new Date(current.updatedAt ?? current.occurredAt).getTime();
    const nextUpdatedAt = new Date(entry.updatedAt ?? entry.occurredAt).getTime();
    if (nextUpdatedAt >= currentUpdatedAt) {
      map.set(entry.id, entry);
    }
  });

  return [...map.values()].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}
