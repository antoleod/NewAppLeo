import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

const ENTRIES_PAGE_LIMIT = 500;
import { db } from '@/lib/firebase';
import { EntryPayload, EntryRecord, EntryType } from '@/types';
import { useAuth } from './AuthContext';
import { getTodaySummary } from '@/utils/entries';
import { deleteLocalEntry, getLocalEntries, setLocalEntries, upsertLocalEntry } from '@/services/localStore';
import { flushQueuedOperations, loadQueuedOperations, mergeEntries, pullEntries, queueDeletes, queueUpserts } from '@/lib/sync';
import { buildLeoProfilePatch, importLeoEntries } from '@/lib/leoData';
import { getAppSettings, saveBaby, setAppSettings } from '@/lib/storage';
import { setGuestProfile } from '@/lib/storage';

function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(stripUndefined) as unknown as T;
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as object)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)]),
    ) as T;
  }
  return obj;
}

export type SyncState = 'synced' | 'syncing' | 'offline' | 'queued';

export interface AppDataContextValue {
  entries: EntryRecord[];
  loading: boolean;
  summary: ReturnType<typeof getTodaySummary>;
  syncState: SyncState;
  pendingSyncCount: number;
  addEntry: (input: { type: EntryType; title?: string; payload: EntryPayload; occurredAt?: string; notes?: string }) => Promise<string>;
  updateEntry: (id: string, patch: Partial<EntryRecord>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  seedDemoData: () => Promise<void>;
  entryById: (id: string) => EntryRecord | undefined;
  forceReconnect: () => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function entriesRef(uid: string) {
  return collection(db, 'users', uid, 'entries');
}

function isPermissionDenied(error: unknown) {
  return Boolean((error as any)?.code === 'permission-denied' || /permission/i.test((error as any)?.message ?? ''));
}

function createLocalId() {
  return globalThis.crypto?.randomUUID?.() ?? `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function sameEntryList(a: EntryRecord[], b: EntryRecord[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x.id !== y.id) return false;
    if ((x.updatedAt ?? x.occurredAt) !== (y.updatedAt ?? y.occurredAt)) return false;
  }
  return true;
}

function normalizeEntry(id: string, data: Record<string, any>): EntryRecord {
  return {
    id,
    type: data.type,
    title: data.title ?? data.type,
    notes: data.notes ?? undefined,
    occurredAt: data.occurredAt ?? new Date().toISOString(),
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt ?? undefined,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt ?? undefined,
    payload: data.payload ?? {},
  } as EntryRecord;
}

const DEMO_ENTRIES: Array<Omit<EntryRecord, 'id'>> = [
  {
    type: 'feed',
    title: 'Bottle feed',
    occurredAt: new Date(Date.now() - 45 * 60000).toISOString(),
    payload: { mode: 'bottle', amountMl: 150, notes: 'Demo feed' },
  },
  {
    type: 'sleep',
    title: 'Nap',
    occurredAt: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    payload: { durationMin: 80, notes: 'Demo nap' },
  },
  {
    type: 'diaper',
    title: 'Diaper log',
    occurredAt: new Date(Date.now() - 4 * 60 * 60000).toISOString(),
    payload: { pee: 1, poop: 0, vomit: 0, notes: 'Demo diaper' },
  },
  {
    type: 'milestone',
    title: 'First smile',
    occurredAt: new Date().toISOString(),
    payload: { title: 'First smile', icon: 'sparkles', notes: 'Demo milestone' },
  },
];

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, guestMode } = useAuth();
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>('synced');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const refreshPendingCount = React.useCallback(async () => {
    try {
      const queue = await loadQueuedOperations();
      setPendingSyncCount(queue.length);
      // Auto-update visible state so the indicator self-clears when the
      // queue drains in the background.
      setSyncState((current) => {
        if (queue.length === 0 && current === 'queued') return 'synced';
        if (queue.length > 0 && current === 'synced') return 'queued';
        return current;
      });
    } catch {}
  }, []);

  // Tracks whether Firestore is reachable. Resets to true on each auth change or
  // foreground transition so we always retry online first.
  const remoteAvailableRef = useRef(true);

  // Permanently true once a permission-denied error is received for this session.
  // Prevents infinite reconnect loops when the user truly lacks access.
  const permissionDeniedRef = useRef(false);

  // Holds the current onSnapshot unsubscribe function so AppState handler can
  // tear down the dead listener before re-attaching.
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Guards against state updates after component unmount or auth change.
  const cancelledRef = useRef(false);

  // Ref to the attach-listener function so the AppState handler can call it
  // without capturing a stale closure.
  const attachListenerRef = useRef<((uid: string) => void) | null>(null);

  // Ref to the current uid so AppState handler always reads latest value.
  const uidRef = useRef<string | null>(null);

  useEffect(() => {
    uidRef.current = user?.uid ?? null;
  }, [user?.uid]);

  // ── Leo demo-data bootstrap (guest only) ─────────────────────────────────
  useEffect(() => {
    if (!user || !guestMode || loading || entries.length) return;

    let cancelled = false;

    const bootstrapLeoData = async () => {
      const settings = await getAppSettings();
      if (settings.hasImportedLeoData || cancelled) return;

      const importedEntries = importLeoEntries();
      if (!importedEntries.length) return;

      await setLocalEntries(user.uid, importedEntries);
      if (profile) {
        const nextProfile = {
          ...profile,
          ...buildLeoProfilePatch(profile),
          hasCompletedOnboarding: true,
          updatedAt: new Date().toISOString(),
        };
        await setGuestProfile(nextProfile);
        await saveBaby({
          id: 'leo-import',
          name: nextProfile.babyName,
          birthDate: nextProfile.babyBirthDate,
          sex: nextProfile.babySex ?? 'unspecified',
          birthWeightKg: nextProfile.birthWeightKg,
          currentWeightKg: nextProfile.currentWeightKg,
          heightCm: nextProfile.heightCm,
          notes: nextProfile.babyNotes,
          photoUri: nextProfile.babyPhotoUri,
          language: nextProfile.language,
          createdAt: new Date().toISOString(),
        });
      }
      await setAppSettings({ ...settings, hasImportedLeoData: true });
      if (!cancelled) {
        setEntries(importedEntries);
      }
    };

    void bootstrapLeoData();
    return () => {
      cancelled = true;
    };
  }, [entries.length, guestMode, loading, profile, user]);

  // ── Main data subscription ────────────────────────────────────────────────
  useEffect(() => {
    cancelledRef.current = false;
    permissionDeniedRef.current = false;
    remoteAvailableRef.current = true;

    // Tear down any previous subscription
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;

    if (!user || guestMode) {
      if (guestMode && user) {
        void getLocalEntries(user.uid).then((localEntries) => {
          if (!cancelledRef.current) {
            setEntries(localEntries);
            setLoading(false);
          }
        });
        remoteAvailableRef.current = false;
      } else {
        setEntries([]);
        setLoading(false);
      }
      return () => {
        cancelledRef.current = true;
      };
    }

    const attachListener = (uid: string) => {
      if (cancelledRef.current || permissionDeniedRef.current) return;

      // Tear down dead subscription before re-attaching
      unsubscribeRef.current?.();

      // Only show the full loading skeleton on the FIRST attach. On
      // re-attach (foreground reconnect, etc.) keep the cached entries
      // visible so cards don't flash to a skeleton and back.
      setEntries((current) => {
        if (current.length === 0) setLoading(true);
        return current;
      });
      const q = query(entriesRef(uid), orderBy('occurredAt', 'desc'), limit(ENTRIES_PAGE_LIMIT));

      // If Firestore doesn't respond within 8 seconds (e.g. reconnecting after
      // a long browser suspension), fall back to local cache so the app never
      // hangs forever on a loading screen.
      let settled = false;
      const fallbackTimer = setTimeout(async () => {
        if (settled || cancelledRef.current) return;
        settled = true;
        remoteAvailableRef.current = false;
        setSyncState('offline');
        const localEntries = await getLocalEntries(uid);
        if (!cancelledRef.current) {
          setEntries(localEntries);
          setLoading(false);
        }
        void refreshPendingCount();
      }, 8000);

      unsubscribeRef.current = onSnapshot(
        q,
        async (snapshot) => {
          if (cancelledRef.current) return;
          settled = true;
          clearTimeout(fallbackTimer);
          remoteAvailableRef.current = true;
          const remote = snapshot.docs.map((item) => normalizeEntry(item.id, item.data()));
          // Pull any local writes that are still waiting in the sync queue
          // (offline writes, failed batches) and merge them in by updatedAt.
          // Without this, an entry the user just added vanishes from the UI
          // for the moment between optimistic add and successful flush, then
          // reappears — a textbook blink.
          let queuedLocals: EntryRecord[] = [];
          try { queuedLocals = await pullEntries(); } catch {}
          if (cancelledRef.current) return;
          const next = queuedLocals.length > 0 ? mergeEntries(queuedLocals, remote) : remote;
          // Skip the state update when the result is byte-identical to what
          // we already have. Prevents downstream useMemos / re-renders / and
          // the FadeInDown re-fires that look like "blinking" after every
          // foreground reconnect.
          setEntries((current) => (sameEntryList(current, next) ? current : next));
          setLoading(false);
          void refreshPendingCount();
        },
        async (error) => {
          if (cancelledRef.current) return;
          settled = true;
          clearTimeout(fallbackTimer);

          remoteAvailableRef.current = false;
          setSyncState('offline');

          if (isPermissionDenied(error)) {
            // Permanent — do not retry until next sign-in
            permissionDeniedRef.current = true;
          }

          // Always serve local cache as fallback
          const localEntries = await getLocalEntries(uid);
          if (!cancelledRef.current) {
            setEntries(localEntries);
            setLoading(false);
          }
          void refreshPendingCount();
        },
      );
    };

    attachListenerRef.current = attachListener;
    attachListener(user.uid);

    return () => {
      cancelledRef.current = true;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [guestMode, user]);

  // ── Foreground sync: flush queue + reconnect Firestore if it went down ────
  useEffect(() => {
    if (!profile?.uid) return;

    let inFlight = false;
    const flushQueue = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const queue = await loadQueuedOperations();
        if (queue.length > 0) setSyncState('syncing');
        const result = await flushQueuedOperations(profile.uid);
        await refreshPendingCount();
        // Only flip back to 'synced' / 'queued' if we're not currently in
        // an offline state that the snapshot listener detected separately.
        setSyncState((current) => {
          if (current === 'offline') return current;
          if (result.flushed && (result.requeued ?? 0) === 0) return 'synced';
          if ((result.requeued ?? 0) > 0) return 'queued';
          return current;
        });
      } catch (error) {
        console.warn('Background sync flush failed:', error);
        setSyncState('offline');
      } finally {
        inFlight = false;
      }
    };

    void flushQueue();

    // Debounce: some platforms fire 'active' multiple times in quick
    // succession (lock screen, notification overlay, app-switcher peek).
    // Only honour the first one within a 1.5 s window.
    let lastActiveAt = 0;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const now = Date.now();
      if (now - lastActiveAt < 1500) return;
      lastActiveAt = now;

      void flushQueue();

      // Re-attach Firestore listener if it died from a transient error
      const uid = uidRef.current;
      if (!remoteAvailableRef.current && !permissionDeniedRef.current && uid) {
        attachListenerRef.current?.(uid);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [profile?.uid]);

  const forceReconnect = React.useCallback(() => {
    const uid = uidRef.current;
    if (!uid) return;
    permissionDeniedRef.current = false;
    remoteAvailableRef.current = true;
    attachListenerRef.current?.(uid);
  }, []);

  const summary = useMemo(() => getTodaySummary(entries, profile), [entries, profile]);

  // ── Mutations: always try Firestore first (online-first) ─────────────────

  async function addEntry(input: { type: EntryType; title?: string; payload: EntryPayload; occurredAt?: string; notes?: string }) {
    if (!user) throw new Error('You must be signed in.');
    const timestamp = input.occurredAt ?? new Date().toISOString();
    const nextEntry: EntryRecord = {
      id: createLocalId(),
      type: input.type,
      title: input.title ?? input.type,
      notes: input.notes ?? '',
      payload: input.payload,
      occurredAt: timestamp,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!guestMode) {
      try {
        const ref = await addDoc(entriesRef(user.uid), stripUndefined({
          type: input.type,
          title: input.title ?? input.type,
          notes: input.notes ?? '',
          payload: input.payload,
          occurredAt: timestamp,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }));
        nextEntry.id = ref.id;
        remoteAvailableRef.current = true;
      } catch (error) {
        if (isPermissionDenied(error)) {
          permissionDeniedRef.current = true;
        }
        remoteAvailableRef.current = false;
        setSyncState('queued');
        void queueUpserts([nextEntry]).then(refreshPendingCount);
      }
    }

    const currentLocal = await getLocalEntries(user.uid);
    await setLocalEntries(user.uid, [nextEntry, ...currentLocal.filter((e) => e.id !== nextEntry.id)]);
    setEntries((current) =>
      [nextEntry, ...current.filter((e) => e.id !== nextEntry.id)].sort((a, b) =>
        b.occurredAt.localeCompare(a.occurredAt),
      ),
    );
    return nextEntry.id;
  }

  async function updateEntry(id: string, patch: Partial<EntryRecord>) {
    if (!user) throw new Error('You must be signed in.');
    const current = entries.find((e) => e.id === id);
    const next = current ? { ...current, ...patch, updatedAt: new Date().toISOString() } : null;

    if (!guestMode) {
      try {
        await updateDoc(doc(entriesRef(user.uid), id), stripUndefined({
          ...patch,
          updatedAt: serverTimestamp(),
        }));
        remoteAvailableRef.current = true;
      } catch (error) {
        if (isPermissionDenied(error)) {
          permissionDeniedRef.current = true;
        }
        remoteAvailableRef.current = false;
        setSyncState('queued');
        if (next) void queueUpserts([next]).then(refreshPendingCount);
      }
    }

    if (next) {
      await upsertLocalEntry(user.uid, next);
      setEntries((currentEntries) =>
        currentEntries
          .map((e) => (e.id === id ? next : e))
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
      );
    }
  }

  async function deleteEntry(id: string) {
    if (!user) throw new Error('You must be signed in.');
    const current = entries.find((e) => e.id === id);

    if (!guestMode) {
      try {
        await deleteDoc(doc(entriesRef(user.uid), id));
        remoteAvailableRef.current = true;
      } catch (error) {
        if (isPermissionDenied(error)) {
          permissionDeniedRef.current = true;
        }
        remoteAvailableRef.current = false;
        setSyncState('queued');
        void queueDeletes([{
          id,
          occurredAt: current?.occurredAt ?? new Date().toISOString(),
          updatedAt: current?.updatedAt ?? new Date().toISOString(),
        }]).then(refreshPendingCount);
      }
    }

    await deleteLocalEntry(user.uid, id);
    setEntries((c) => c.filter((e) => e.id !== id));
  }

  async function seedDemoData() {
    if (!user) throw new Error('You must be signed in.');
    const seeded = DEMO_ENTRIES.map((entry) => ({
      ...entry,
      id: createLocalId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    if (!guestMode) {
      try {
        for (const entry of DEMO_ENTRIES) {
          await addDoc(entriesRef(user.uid), {
            ...entry,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        remoteAvailableRef.current = true;
      } catch (error) {
        if (isPermissionDenied(error)) {
          permissionDeniedRef.current = true;
        }
        remoteAvailableRef.current = false;
        void queueUpserts(seeded);
      }
    }

    const currentLocal = await getLocalEntries(user.uid);
    const nextEntries = [...seeded, ...currentLocal]
      .filter((e, i, arr) => arr.findIndex((c) => c.id === e.id) === i)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    await setLocalEntries(user.uid, nextEntries);
    setEntries(nextEntries);
  }

  function entryById(id: string) {
    return entries.find((e) => e.id === id);
  }

  const value = useMemo<AppDataContextValue>(
    () => ({
      entries,
      loading,
      summary,
      addEntry,
      updateEntry,
      deleteEntry,
      seedDemoData,
      entryById,
      forceReconnect,
      syncState,
      pendingSyncCount,
    }),
    [entries, loading, summary, forceReconnect, syncState, pendingSyncCount],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used inside AppDataProvider');
  }
  return context;
}
