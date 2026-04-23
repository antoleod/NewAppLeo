import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  getDocs,
  limit,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EntryPayload, EntryRecord, EntryType } from '@/types';
import { useAuth } from './AuthContext';
import { getTodaySummary } from '@/utils/entries';
import { buildLeoProfilePatch, importLeoEntries } from '@/lib/leoData';
import { getAppSettings, saveBaby, setAppSettings } from '@/lib/storage';
import { getActivePairingScope, getLocalPairingSession, subscribeToPairingSessionChanges } from '@/services/pairingService';

export interface AppDataContextValue {
  entries: EntryRecord[];
  loading: boolean;
  summary: ReturnType<typeof getTodaySummary>;
  addEntry: (input: { type: EntryType; title?: string; payload: EntryPayload; occurredAt?: string; notes?: string }) => Promise<void>;
  importEntries: (items: Array<{ type: EntryType; title?: string; payload: EntryPayload; occurredAt?: string; notes?: string }>) => Promise<{ imported: number }>;
  updateEntry: (id: string, patch: Partial<EntryRecord>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  seedDemoData: () => Promise<void>;
  entryById: (id: string) => EntryRecord | undefined;
}

export type AppDataContextType = AppDataContextValue;

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
  const [syncScope, setSyncScope] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refreshScope = async () => {
      if (!profile?.uid) {
        setSyncScope(null);
        return;
      }
      const localSession = await getLocalPairingSession();
      if (cancelled) return;
      setSyncScope(localSession?.code ?? profile.uid);
      if (!localSession) {
        const fallbackScope = await getActivePairingScope(profile.uid);
        if (!cancelled) setSyncScope(fallbackScope);
      }
    };

    void refreshScope();
    const unsubscribe = subscribeToPairingSessionChanges(() => {
      void refreshScope();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [profile?.uid]);

  useEffect(() => {
    if (!user || !guestMode || loading || entries.length) return;

    let cancelled = false;

    const bootstrapLeoData = async () => {
      const settings = await getAppSettings();
      if (settings.hasImportedLeoData || cancelled) return;
      const importedEntries = importLeoEntries();
      if (!importedEntries.length) return;
      await setAppSettings({ ...settings, hasImportedLeoData: true });
      if (!cancelled) setEntries(importedEntries);
    };

    void bootstrapLeoData();
    return () => {
      cancelled = true;
    };
  }, [entries.length, guestMode, loading, profile, user]);

  useEffect(() => {
    if (!user || guestMode) {
      setEntries([]);
      setLoading(false);
      setRemoteAvailable(true);
      return;
    }

    setLoading(true);
    setRemoteAvailable(true);
    const scopeId = syncScope ?? user.uid;
    const q = query(entriesRef(scopeId), orderBy('occurredAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        setEntries(snapshot.docs.map((item) => normalizeEntry(item.id, item.data())));
        setLoading(false);
      },
      (error) => {
        if (isPermissionDenied(error)) {
          setRemoteAvailable(false);
          setEntries([]);
          return;
        }
        console.error('Entry listener error:', error);
        setLoading(false);
      },
    );
  }, [guestMode, syncScope, user]);

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

    const scopeId = syncScope ?? user.uid;

    if (remoteAvailable) {
      try {
        const ref = await addDoc(entriesRef(scopeId), {
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

    setEntries((current) => [nextEntry, ...current.filter((entry) => entry.id !== nextEntry.id)].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)));
  }

  async function importEntries(items: Array<{ type: EntryType; title?: string; payload: EntryPayload; occurredAt?: string; notes?: string }>) {
    if (!user) throw new Error('You must be signed in to import and sync entries.');
    if (!items.length) return { imported: 0 };

    const scopeId = syncScope ?? user.uid;
    const normalized = items.map((item) => ({
      type: item.type,
      title: item.title ?? item.type,
      notes: item.notes ?? '',
      payload: item.payload,
      occurredAt: item.occurredAt ?? new Date().toISOString(),
    }));

    if (remoteAvailable) {
      try {
        const existingSnapshot = await getDocs(query(entriesRef(scopeId), orderBy('occurredAt', 'desc'), limit(500)));
        const existingKeys = new Set(
          existingSnapshot.docs.map((docItem) => {
            const data = docItem.data();
            return JSON.stringify({
              type: data.type,
              occurredAt: data.occurredAt,
              payload: data.payload ?? {},
            });
          }),
        );

        const toCreate = normalized.filter((item) => {
          const key = JSON.stringify({ type: item.type, occurredAt: item.occurredAt, payload: item.payload ?? {} });
          return !existingKeys.has(key);
        });

        if (!toCreate.length) return { imported: 0 };

        for (let index = 0; index < toCreate.length; index += 250) {
          const chunk = toCreate.slice(index, index + 250);
          const batch = writeBatch(db);
          for (const item of chunk) {
            const ref = doc(entriesRef(scopeId));
            batch.set(ref, {
              ...item,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          await batch.commit();
        }

        return { imported: toCreate.length };
      } catch (error) {
        if (!isPermissionDenied(error)) throw error;
        setRemoteAvailable(false);
      }
    }

    let imported = 0;
    for (const item of normalized) {
      await addEntry(item);
      imported += 1;
    }
    return { imported };
  }

  async function updateEntry(id: string, patch: Partial<EntryRecord>) {
    if (!user) throw new Error('You must be signed in.');
    const current = entries.find((entry) => entry.id === id);
    const next = current ? { ...current, ...patch, updatedAt: new Date().toISOString() } : null;

    const scopeId = syncScope ?? user.uid;

    if (remoteAvailable) {
      try {
        await updateDoc(doc(entriesRef(scopeId), id), {
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
    const scopeId = syncScope ?? user.uid;

    if (remoteAvailable) {
      try {
        await deleteDoc(doc(entriesRef(scopeId), id));
      } catch (error) {
        if (!isPermissionDenied(error)) {
          throw error;
        }
        setRemoteAvailable(false);
      }
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

    const scopeId = syncScope ?? user.uid;

    if (remoteAvailable) {
      try {
        for (const entry of DEMO_ENTRIES) {
          await addDoc(entriesRef(scopeId), {
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

    setEntries(seeded.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)));
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
      importEntries,
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
