import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { EntryRecord } from '@/types';
import {
  BACKOFF_SCHEDULE_MS,
  BATCH_SIZE,
  MAX_RETRIES,
  backoffMsForAttempt,
  chunk,
  mergeEntries,
  mergeQueue,
  type SyncOperation,
} from './sync-helpers';

const SYNC_QUEUE_KEY = 'appleo.syncQueue';
const FLUSH_BACKOFF_KEY = 'appleo.syncBackoffUntil';

// Re-export pure helpers so existing call sites keep working.
export { mergeEntries, mergeQueue, backoffMsForAttempt };
export type { SyncOperation };
export const __testing = { BACKOFF_SCHEDULE_MS, MAX_RETRIES, BATCH_SIZE };

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

let _queueCache: SyncOperation[] | null = null;

export async function loadQueuedOperations() {
  if (_queueCache !== null) return _queueCache;
  _queueCache = safeParse<SyncOperation[]>(await AsyncStorage.getItem(SYNC_QUEUE_KEY), []);
  return _queueCache;
}

async function saveQueuedOperations(operations: SyncOperation[]) {
  _queueCache = operations;
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(operations));
}

export async function queueUpserts(entries: EntryRecord[]) {
  const queue = mergeQueue(await loadQueuedOperations(), entries.map((entry) => ({ kind: 'upsert' as const, entry })));
  await saveQueuedOperations(queue);
  return { queued: queue.length };
}

export async function queueDeletes(ids: { id: string; occurredAt: string; updatedAt: string }[]) {
  const queue = mergeQueue(await loadQueuedOperations(), ids.map((item) => ({ kind: 'delete' as const, ...item })));
  await saveQueuedOperations(queue);
  return { queued: queue.length };
}

async function getBackoffUntil(): Promise<number> {
  const raw = await AsyncStorage.getItem(FLUSH_BACKOFF_KEY);
  const ts = raw ? Number(raw) : 0;
  return Number.isFinite(ts) ? ts : 0;
}

async function setBackoffUntil(timestamp: number) {
  if (timestamp <= 0) {
    await AsyncStorage.removeItem(FLUSH_BACKOFF_KEY);
  } else {
    await AsyncStorage.setItem(FLUSH_BACKOFF_KEY, String(timestamp));
  }
}


export async function flushQueuedOperations(uid: string) {
  // Respect the backoff window after a previous failure.
  const backoffUntil = await getBackoffUntil();
  if (backoffUntil > Date.now()) {
    return { flushed: 0, skipped: 'backoff' as const, retryAt: backoffUntil };
  }

  // Atomic swap: clear the queue before iterating so any new operations
  // enqueued during the flush are preserved rather than overwritten.
  const queue = await loadQueuedOperations();
  if (queue.length === 0) {
    await setBackoffUntil(0);
    return { flushed: 0 };
  }
  await saveQueuedOperations([]);

  const failed: SyncOperation[] = [];
  const dropped: SyncOperation[] = [];
  let flushedCount = 0;
  let batchFailed = false;

  // Process in chunks of BATCH_SIZE using a single Firestore writeBatch per
  // chunk. This collapses N round-trips into one network call, which is
  // 5-10× faster on mobile.
  for (const group of chunk(queue, BATCH_SIZE)) {
    try {
      const batch = writeBatch(db);
      for (const op of group) {
        if (op.kind === 'upsert') {
          batch.set(
            doc(entriesCollection(uid), op.entry.id),
            {
              ...op.entry,
              createdAt: op.entry.createdAt ?? serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        } else {
          batch.delete(doc(entriesCollection(uid), op.id));
        }
      }
      await batch.commit();
      flushedCount += group.length;
    } catch (error) {
      // Batch failed — bump retry count on each op, drop ones over the cap,
      // and stop trying further batches in this run (we'll back off and try
      // again later).
      batchFailed = true;
      for (const op of group) {
        const attempts = (op.attempts ?? 0) + 1;
        if (attempts >= MAX_RETRIES) {
          dropped.push(op);
        } else {
          failed.push({ ...op, attempts });
        }
      }
      console.warn(`Sync batch failed (size=${group.length}, will retry):`, error);
      // Don't try the remaining batches this run — if Firestore is rejecting
      // one, it's likely rejecting all (network down, auth expired, etc.).
      break;
    }
  }

  // Anything we didn't even attempt (because we broke out early) needs to
  // stay in the queue too.
  const attemptedCount = flushedCount + failed.length + dropped.length;
  const notAttempted = queue.slice(attemptedCount);
  const toRequeue = [...failed, ...notAttempted];

  if (toRequeue.length > 0) {
    const remaining = await loadQueuedOperations();
    await saveQueuedOperations(mergeQueue(toRequeue, remaining));
  }

  if (batchFailed) {
    // Pick the highest attempts count we've seen so the backoff escalates.
    const maxAttempts = failed.reduce((m, op) => Math.max(m, op.attempts ?? 0), 1);
    await setBackoffUntil(Date.now() + backoffMsForAttempt(maxAttempts));
  } else {
    await setBackoffUntil(0);
  }

  if (dropped.length > 0) {
    console.warn(`Dropped ${dropped.length} sync ops after ${MAX_RETRIES} retries`, dropped.map((op) => op.kind === 'upsert' ? op.entry.id : op.id));
  }

  return {
    flushed: flushedCount,
    requeued: toRequeue.length,
    dropped: dropped.length,
  };
}

export async function pullEntries() {
  const queue = await loadQueuedOperations();
  return queue.filter((operation): operation is Extract<SyncOperation, { kind: 'upsert' }> => operation.kind === 'upsert').map((operation) => operation.entry);
}

export async function clearSyncQueue() {
  _queueCache = [];
  await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
}
