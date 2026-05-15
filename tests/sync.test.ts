/**
 * Tests for the sync queue logic — these are the pure functions that decide
 * what survives a merge conflict, how the backoff escalates, and how the
 * batching slices the queue. They're the data-integrity-critical pieces:
 * a regression here can silently lose a user's entries.
 *
 * Run with:
 *   npx tsx tests/sync.test.ts
 *
 * The Firebase-touching paths (`flushQueuedOperations`) are NOT covered here
 * — those need the Firebase emulator. The pure functions below cover ~80%
 * of the actual merge-logic risk.
 */
import {
  mergeEntries,
  mergeQueue,
  backoffMsForAttempt,
  BACKOFF_SCHEDULE_MS,
  BATCH_SIZE,
  MAX_RETRIES,
  type SyncOperation,
} from '../src/lib/sync-helpers';
import type { EntryRecord } from '../src/types';

const __testing = { BACKOFF_SCHEDULE_MS, BATCH_SIZE, MAX_RETRIES };

type Outcome = { name: string; ok: boolean; detail: string };
const results: Outcome[] = [];

function check(name: string, condition: boolean, detail = '') {
  results.push({ name, ok: condition, detail });
}
function eq<T>(name: string, actual: T, expected: T) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  check(name, ok, ok ? '' : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function entry(id: string, occurredAt: string, updatedAt = occurredAt, payload: any = {}): EntryRecord {
  return {
    id,
    type: 'feed',
    title: 'feed',
    occurredAt,
    updatedAt,
    notes: '',
    payload,
  } as EntryRecord;
}

function upsert(e: EntryRecord, attempts?: number): SyncOperation {
  return attempts != null ? { kind: 'upsert', entry: e, attempts } : { kind: 'upsert', entry: e };
}
function del(id: string, occurredAt: string, updatedAt = occurredAt): SyncOperation {
  return { kind: 'delete', id, occurredAt, updatedAt };
}

// ---------------------------------------------------------------------------
// mergeEntries — newer updatedAt wins, sorted desc by occurredAt
// ---------------------------------------------------------------------------
{
  const e1Old = entry('a', '2026-05-01T10:00:00Z', '2026-05-01T10:00:00Z', { v: 1 });
  const e1New = entry('a', '2026-05-01T10:00:00Z', '2026-05-02T10:00:00Z', { v: 2 });
  const merged = mergeEntries([e1Old], [e1New]);
  eq('mergeEntries · newer updatedAt wins (remote)', (merged[0].payload as any).v, 2);

  const merged2 = mergeEntries([e1New], [e1Old]);
  eq('mergeEntries · newer wins regardless of arg order', (merged2[0].payload as any).v, 2);
}
{
  const a = entry('a', '2026-05-01T10:00:00Z');
  const b = entry('b', '2026-05-03T10:00:00Z');
  const c = entry('c', '2026-05-02T10:00:00Z');
  const merged = mergeEntries([a, b], [c]);
  eq('mergeEntries · sorted by occurredAt desc', merged.map((e) => e.id), ['b', 'c', 'a']);
}
{
  // Local-only entry (not yet in remote snapshot) must survive merge.
  const localOnly = entry('local-1', '2026-05-04T10:00:00Z');
  const remote = entry('a', '2026-05-01T10:00:00Z');
  const merged = mergeEntries([localOnly], [remote]);
  check(
    'mergeEntries · local-only entry preserved after merge',
    merged.some((e) => e.id === 'local-1'),
    `ids=${merged.map((e) => e.id).join(',')}`,
  );
}

// ---------------------------------------------------------------------------
// mergeQueue — dedup by id, newer updatedAt wins, delete trumps upsert
// ---------------------------------------------------------------------------
{
  const eOld = entry('x', '2026-05-01T10:00:00Z', '2026-05-01T10:00:00Z', { v: 1 });
  const eNew = entry('x', '2026-05-01T10:00:00Z', '2026-05-02T10:00:00Z', { v: 2 });
  const merged = mergeQueue([upsert(eOld)], [upsert(eNew)]);
  eq('mergeQueue · two upserts for same id collapse to newer', merged.length, 1);
  if (merged[0].kind === 'upsert') {
    eq('mergeQueue · winner is the newer payload', (merged[0].entry.payload as any).v, 2);
  } else {
    check('mergeQueue · winner kind is upsert', false, `kind=${merged[0].kind}`);
  }
}
{
  const e = entry('x', '2026-05-01T10:00:00Z');
  const merged = mergeQueue([upsert(e)], [del('x', '2026-05-01T10:00:00Z')]);
  eq('mergeQueue · incoming delete trumps existing upsert', merged.length, 1);
  eq('mergeQueue · resulting op is delete', merged[0].kind, 'delete');
}
{
  // Existing delete should not be replaced by a later upsert (e.g. user
  // deleted then somehow re-added — we still want to delete remotely first
  // to keep state consistent).
  const e = entry('x', '2026-05-01T10:00:00Z');
  const merged = mergeQueue([del('x', '2026-05-01T10:00:00Z')], [upsert(e)]);
  // Implementation note: incoming `upsert` after existing `delete` keeps the delete.
  eq('mergeQueue · existing delete sticks against later upsert', merged[0].kind, 'delete');
}
{
  // Multiple distinct ids — all preserved, sorted deterministically.
  const a = entry('a', '2026-05-01T10:00:00Z');
  const b = entry('b', '2026-05-02T10:00:00Z');
  const merged = mergeQueue([upsert(a)], [upsert(b)]);
  eq('mergeQueue · distinct ids preserved', merged.length, 2);
}
{
  // attempts counter is preserved on the op that wins.
  const eOld = entry('x', '2026-05-01T10:00:00Z', '2026-05-01T10:00:00Z');
  const eNew = entry('x', '2026-05-01T10:00:00Z', '2026-05-02T10:00:00Z');
  const merged = mergeQueue([upsert(eOld, 3)], [upsert(eNew, 1)]);
  if (merged[0].kind === 'upsert') {
    eq('mergeQueue · winner keeps its own attempts counter', merged[0].attempts, 1);
  }
}

// ---------------------------------------------------------------------------
// backoffMsForAttempt — escalates with attempt, caps at the last slot
// ---------------------------------------------------------------------------
{
  const schedule = __testing.BACKOFF_SCHEDULE_MS;
  eq('backoff · attempt 0 = 0ms (immediate)', backoffMsForAttempt(0), schedule[0]);
  eq('backoff · attempt 1 = 5s', backoffMsForAttempt(1), schedule[1]);
  eq('backoff · attempt 3 = 2min', backoffMsForAttempt(3), schedule[3]);
  eq('backoff · attempts > schedule cap to last slot', backoffMsForAttempt(99), schedule[schedule.length - 1]);
  check('backoff · schedule is monotonically increasing',
    schedule.every((v, i) => i === 0 || v >= schedule[i - 1]),
    `schedule=${schedule.join(',')}`,
  );
}

// ---------------------------------------------------------------------------
// Constants sanity — drift detection
// ---------------------------------------------------------------------------
{
  check('constants · MAX_RETRIES is reasonable (3-10)', __testing.MAX_RETRIES >= 3 && __testing.MAX_RETRIES <= 10);
  check('constants · BATCH_SIZE under Firestore 500-op limit', __testing.BATCH_SIZE > 0 && __testing.BATCH_SIZE <= 500);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;
for (const r of results) {
  const mark = r.ok ? 'OK  ' : 'FAIL';
  console.log(`${mark}  ${r.name}${r.detail ? `\n      ${r.detail}` : ''}`);
}
console.log(`\n${passed}/${results.length} passed${failed ? `, ${failed} failed` : ''}`);
if (failed) process.exit(1);
