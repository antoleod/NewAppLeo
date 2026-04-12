import { collection, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EntryRecord } from '@/types';

type SyncOperation =
  | { kind: 'upsert'; entry: EntryRecord }
  | { kind: 'delete'; id: string; occurredAt: string; updatedAt: string };

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function entriesCollection(scopeId: string) {
  return collection(db, 'users', scopeId, 'entries');
}

function queueKeyFor(operation: SyncOperation) {
  return operation.kind === 'upsert' ? operation.entry.id : operation.id;
}

export function mergeEntries(local: EntryRecord[], remote: EntryRecord[]) {
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

function mergeQueue(current: SyncOperation[], incoming: SyncOperation[]) {
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

export async function queueUpserts(entries: EntryRecord[]) {
  return { queued: entries.length };
}

export async function queueDeletes(ids: Array<{ id: string; occurredAt: string; updatedAt: string }>) {
  return { queued: ids.length };
}

export async function flushQueuedOperations(scopeId: string) {
  return { flushed: 0 };
}

export async function pullEntries() {
  return [];
}

export async function clearSyncQueue() {
  return;
}
