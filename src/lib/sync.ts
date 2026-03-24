import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EntryRecord } from '@/types';

const SYNC_QUEUE_KEY = 'appleo.syncQueue';

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

function entriesCollection(uid: string) {
  return collection(db, 'users', uid, 'entries');
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

export async function loadQueuedOperations() {
  return safeParse<SyncOperation[]>(await AsyncStorage.getItem(SYNC_QUEUE_KEY), []);
}

async function saveQueuedOperations(operations: SyncOperation[]) {
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(operations));
}

export async function queueUpserts(entries: EntryRecord[]) {
  const queue = mergeQueue(await loadQueuedOperations(), entries.map((entry) => ({ kind: 'upsert' as const, entry })));
  await saveQueuedOperations(queue);
  return { queued: queue.length };
}

export async function queueDeletes(ids: Array<{ id: string; occurredAt: string; updatedAt: string }>) {
  const queue = mergeQueue(await loadQueuedOperations(), ids.map((item) => ({ kind: 'delete' as const, ...item })));
  await saveQueuedOperations(queue);
  return { queued: queue.length };
}

export async function flushQueuedOperations(uid: string) {
  const queue = await loadQueuedOperations();
  for (const operation of queue) {
    if (operation.kind === 'upsert') {
      await setDoc(
        doc(entriesCollection(uid), operation.entry.id),
        {
          ...operation.entry,
          createdAt: operation.entry.createdAt ?? serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      continue;
    }

    await deleteDoc(doc(entriesCollection(uid), operation.id));
  }

  await saveQueuedOperations([]);
  return { flushed: queue.length };
}

export async function pullEntries() {
  const queue = await loadQueuedOperations();
  return queue.filter((operation): operation is Extract<SyncOperation, { kind: 'upsert' }> => operation.kind === 'upsert').map((operation) => operation.entry);
}

export async function clearSyncQueue() {
  await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
}
