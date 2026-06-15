/**
 * Cross-device sync for active timer sessions.
 *
 * Stores the currently-running timer at users/{uid}/activeSessions/current
 * so a second device signed in to the same account can mirror it in real time
 * via onSnapshot. Writes happen on start/minimize/expand; the document is
 * deleted on stop. AsyncStorage stays as the offline-first source of truth —
 * Firestore acts as the cross-device fan-out layer.
 */
import { doc, deleteDoc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { ActiveTimer, TimerKind } from '@/context/TimerContext';

const VALID_KINDS: ReadonlySet<TimerKind> = new Set(['breast', 'bottle', 'sleep', 'pump']);

const SLOT_ID = 'current';

function docRef(uid: string) {
  return doc(db, 'users', uid, 'activeSessions', SLOT_ID);
}

/** Push the active timer to Firestore. Idempotent. */
export async function pushActiveSession(uid: string, timer: ActiveTimer): Promise<void> {
  try {
    await setDoc(docRef(uid), {
      kind: timer.kind,
      startedAt: timer.startedAt,
      minimized: timer.minimized,
      meta: timer.meta ?? null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    // Network/permission failures are non-fatal — AsyncStorage still has the truth.
    console.warn('[activeSession] push failed:', error);
  }
}

/** Remove the active timer from Firestore (when the user stops it). */
export async function clearActiveSession(uid: string): Promise<void> {
  try {
    await deleteDoc(docRef(uid));
  } catch (error) {
    console.warn('[activeSession] clear failed:', error);
  }
}

export type RemoteActiveSession = ActiveTimer & { updatedAt: number };

/**
 * Subscribe to the user's active session.
 *
 * The callback fires with `null` when no remote session exists. Returns an
 * unsubscribe function. Errors (offline, permission) are reported via
 * onError and the subscription stays active for retry.
 */
export function subscribeActiveSession(
  uid: string,
  onChange: (session: RemoteActiveSession | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    docRef(uid),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      const data = snap.data();
      if (typeof data?.kind !== 'string' || !VALID_KINDS.has(data.kind as TimerKind) || typeof data?.startedAt !== 'number') {
        onChange(null);
        return;
      }
      onChange({
        kind: data.kind as TimerKind,
        startedAt: data.startedAt,
        minimized: Boolean(data.minimized),
        meta: data.meta ?? undefined,
        updatedAt: (data.updatedAt?.toMillis?.() as number | undefined) ?? Date.now(),
      });
    },
    (error) => {
      console.warn('[activeSession] subscribe error:', error);
      onError?.(error);
    },
  );
}
