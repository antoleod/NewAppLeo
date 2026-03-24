import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EntryPayload, EntryRecord, EntryType } from '@/types';
import { useAuth } from './AuthContext';
import { getTodaySummary } from '@/utils/entries';
import { deleteLocalEntry, getLocalEntries, setLocalEntries, upsertLocalEntry } from '@/services/localStore';
import { flushQueuedOperations, queueDeletes, queueUpserts } from '@/lib/sync';

interface AppDataContextValue {
  entries: EntryRecord[];
  loading: boolean;
  summary: ReturnType<typeof getTodaySummary>;
  addEntry: (input: { type: EntryType; title?: string; payload: EntryPayload; occurredAt?: string; notes?: string }) => Promise<void>;
  updateEntry: (id: string, patch: Partial<EntryRecord>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  seedDemoData: () => Promise<void>;
  entryById: (id: string) => EntryRecord | undefined;
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
  const [remoteAvailable, setRemoteAvailable] = useState(true);

  useEffect(() => {
    if (!user || guestMode) {
      if (guestMode && user) {
        setEntries(getLocalEntries(user.uid));
        setLoading(false);
        setRemoteAvailable(false);
        return;
      }
      setEntries([]);
      setLoading(false);
      setRemoteAvailable(true);
      return;
    }

    setLoading(true);
    setRemoteAvailable(true);
    const q = query(entriesRef(user.uid), orderBy('occurredAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        setEntries(snapshot.docs.map((item) => normalizeEntry(item.id, item.data())));
        setLoading(false);
      },
      (error) => {
        if (isPermissionDenied(error)) {
          setRemoteAvailable(false);
          setEntries(getLocalEntries(user.uid));
          return;
        }
        console.error('Entry listener error:', error);
        setLoading(false);
      },
    );
  }, [guestMode, user]);

  useEffect(() => {
    if (!profile?.uid) {
      return;
    }

    let inFlight = false;
    const flushQueue = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        await flushQueuedOperations(profile.uid);
      } catch (error) {
        console.warn('Background sync flush failed:', error);
      } finally {
        inFlight = false;
      }
    };

    void flushQueue();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void flushQueue();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [profile?.uid]);

  const summary = useMemo(() => getTodaySummary(entries, profile), [entries, profile]);

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

    if (remoteAvailable && !guestMode) {
      try {
        const ref = await addDoc(entriesRef(user.uid), {
          type: input.type,
          title: input.title ?? input.type,
          notes: input.notes ?? '',
          payload: input.payload,
          occurredAt: timestamp,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        nextEntry.id = ref.id;
      } catch (error) {
        if (!isPermissionDenied(error)) {
          throw error;
        }
        setRemoteAvailable(false);
      }
    }

    setLocalEntries(user.uid, [nextEntry, ...getLocalEntries(user.uid).filter((entry) => entry.id !== nextEntry.id)]);
    if (!guestMode) {
      void queueUpserts([nextEntry]);
    }
    setEntries((current) => [nextEntry, ...current.filter((entry) => entry.id !== nextEntry.id)].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)));
  }

  async function updateEntry(id: string, patch: Partial<EntryRecord>) {
    if (!user) throw new Error('You must be signed in.');
    const current = entries.find((entry) => entry.id === id);
    const next = current ? { ...current, ...patch, updatedAt: new Date().toISOString() } : null;

    if (remoteAvailable && !guestMode) {
      try {
        await updateDoc(doc(entriesRef(user.uid), id), {
          ...patch,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        if (!isPermissionDenied(error)) {
          throw error;
        }
        setRemoteAvailable(false);
      }
    }

    if (next) {
      upsertLocalEntry(user.uid, next);
      if (!guestMode) {
        void queueUpserts([next]);
      }
      setEntries((currentEntries) =>
        currentEntries
          .map((entry) => (entry.id === id ? next : entry))
          .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)),
      );
    }
  }

  async function deleteEntry(id: string) {
    if (!user) throw new Error('You must be signed in.');
    const current = entries.find((entry) => entry.id === id);
    if (remoteAvailable && !guestMode) {
      try {
        await deleteDoc(doc(entriesRef(user.uid), id));
      } catch (error) {
        if (!isPermissionDenied(error)) {
          throw error;
        }
        setRemoteAvailable(false);
      }
    }

    deleteLocalEntry(user.uid, id);
    if (!guestMode) {
      void queueDeletes([{ id, occurredAt: current?.occurredAt ?? new Date().toISOString(), updatedAt: current?.updatedAt ?? new Date().toISOString() }]);
    }
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  async function seedDemoData() {
    if (!user) throw new Error('You must be signed in.');
    const seeded = DEMO_ENTRIES.map((entry) => ({
      ...entry,
      id: createLocalId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    if (remoteAvailable && !guestMode) {
      try {
        for (const entry of DEMO_ENTRIES) {
          await addDoc(entriesRef(user.uid), {
            ...entry,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        if (!isPermissionDenied(error)) {
          throw error;
        }
        setRemoteAvailable(false);
      }
    }

    const nextEntries = [...seeded, ...getLocalEntries(user.uid)]
      .filter((entry, index, array) => array.findIndex((candidate) => candidate.id === entry.id) === index)
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
    setLocalEntries(user.uid, nextEntries);
    if (!guestMode) {
      void queueUpserts(nextEntries);
    }
    setEntries(nextEntries);
  }

  function entryById(id: string) {
    return entries.find((entry) => entry.id === id);
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
    }),
    [entries, loading, summary],
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
