import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  addEntry: (input: { type: EntryType; title?: string; payload: EntryPayload; occurredAt?: string; notes?: string; slug?: string }) => Promise<void>;
  importEntries: (items: Array<{ type: EntryType; title?: string; payload: EntryPayload; occurredAt?: string; notes?: string; slug?: string }>) => Promise<{ imported: number }>;
  updateEntry: (id: string, patch: Partial<EntryRecord>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  seedDemoData: () => Promise<void>;
  clearDemoData: () => Promise<{ removed: number }>;
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

function entriesCacheKey(scopeId: string) {
  return `babyflow.entries:${scopeId}`;
}

async function readEntriesCache(scopeId: string) {
  const raw = await AsyncStorage.getItem(entriesCacheKey(scopeId));
  if (!raw) return [] as EntryRecord[];
  try {
    const parsed = JSON.parse(raw) as EntryRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeEntriesCache(scopeId: string, items: EntryRecord[]) {
  await AsyncStorage.setItem(entriesCacheKey(scopeId), JSON.stringify(items));
}

function normalizeEntry(id: string, data: Record<string, any>): EntryRecord {
  return {
    id,
    slug: data.slug ?? id,
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
  const entriesRefState = useRef<EntryRecord[]>([]);

  useEffect(() => {
    entriesRefState.current = entries;
  }, [entries]);

  function commitEntries(scopeId: string, nextOrUpdater: EntryRecord[] | ((current: EntryRecord[]) => EntryRecord[])) {
    setEntries((current) => {
      const next = typeof nextOrUpdater === 'function' ? nextOrUpdater(current) : nextOrUpdater;
      entriesRefState.current = next;
      void writeEntriesCache(scopeId, next);
      return next;
    });
  }

  useEffect(() => {
    if (!user || guestMode) return;
    const scopeId = syncScope ?? user.uid;
    let active = true;
    void readEntriesCache(scopeId).then((cached) => {
      if (!active || !cached.length) return;
      setEntries((current) => (current.length ? current : cached));
    });
    return () => {
      active = false;
    };
  }, [guestMode, syncScope, user]);

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
    if (!user || loading) return;

    let cancelled = false;

    const bootstrapLeoData = async () => {
      const settings = await getAppSettings();
      const importedEntries = importLeoEntries();
      if (!importedEntries.length) return;
      const existingSlugs = new Set(entriesRefState.current.map((entry) => entry.slug).filter(Boolean));
      const missingEntries = importedEntries.filter((entry) => !entry.slug || !existingSlugs.has(entry.slug));
      if (!missingEntries.length || cancelled) return;
      await importEntries(
        missingEntries.map((entry) => ({
          type: entry.type,
          title: entry.title,
          payload: entry.payload,
          occurredAt: entry.occurredAt,
          notes: entry.notes,
          slug: entry.slug,
        })),
      );
      await setAppSettings({ ...settings, hasImportedLeoData: true });
    };

    void bootstrapLeoData();
    return () => {
      cancelled = true;
    };
  }, [entries.length, importEntries, loading, user]);

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
        const nextEntries = snapshot.docs.map((item) => normalizeEntry(item.id, item.data()));
        commitEntries(scopeId, nextEntries);
        setLoading(false);
      },
      (error) => {
        if (isPermissionDenied(error)) {
          setRemoteAvailable(false);
          setLoading(false);
          void readEntriesCache(scopeId).then((cached) => {
            commitEntries(scopeId, cached);
          });
          return;
        }
        console.error('Entry listener error:', error);
        setLoading(false);
      },
    );
  }, [guestMode, syncScope, user]);

  const summary = useMemo(() => getTodaySummary(entries, profile), [entries, profile]);

  async function addEntry(input: { type: EntryType; title?: string; payload: EntryPayload; occurredAt?: string; notes?: string; slug?: string }) {
    if (!user) throw new Error('You must be signed in.');
    const timestamp = input.occurredAt ?? new Date().toISOString();
    const nextEntry: EntryRecord = {
      id: createLocalId(),
      slug: input.slug ?? createLocalId(),
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
          slug: input.slug ?? null,
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

    commitEntries(scopeId, (current) =>
      [nextEntry, ...current.filter((entry) => entry.id !== nextEntry.id)].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)),
    );
  }

  async function importEntries(items: Array<{ type: EntryType; title?: string; payload: EntryPayload; occurredAt?: string; notes?: string; slug?: string }>) {
    if (!user) throw new Error('You must be signed in to import and sync entries.');
    if (!items.length) return { imported: 0 };

    const scopeId = syncScope ?? user.uid;
    const normalized = items.map((item) => ({
      type: item.type,
      title: item.title ?? item.type,
      notes: item.notes ?? '',
      payload: item.payload,
      occurredAt: item.occurredAt ?? new Date().toISOString(),
      slug: item.slug,
    }));

    if (remoteAvailable) {
      try {
        const existingSnapshot = await getDocs(query(entriesRef(scopeId), orderBy('occurredAt', 'desc'), limit(500)));
        const existingKeys = new Set(
          existingSnapshot.docs.map((docItem) => {
            const data = docItem.data();
            return data.slug
              ? `slug:${data.slug}`
              : JSON.stringify({
                type: data.type,
                occurredAt: data.occurredAt,
                payload: data.payload ?? {},
              });
          }),
        );

        const toCreate = normalized.filter((item) => {
          if (item.slug && existingKeys.has(`slug:${item.slug}`)) return false;
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

        const cachedExisting = await readEntriesCache(scopeId);
        const cachedNext = [
          ...toCreate.map((item) => ({
            id: createLocalId(),
            ...item,
            slug: item.slug ?? createLocalId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })),
          ...cachedExisting,
        ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
        commitEntries(scopeId, cachedNext);

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
      commitEntries(scopeId, (currentEntries) =>
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

    commitEntries(scopeId, (current) => current.filter((entry) => entry.id !== id));
  }

  async function seedDemoData() {
    if (!user) throw new Error('You must be signed in.');
    const seeded = DEMO_ENTRIES.map((entry) => ({
      ...entry,
      id: createLocalId(),
      slug: createLocalId(),
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

    commitEntries(scopeId, seeded.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)));
  }

  async function clearDemoData() {
    if (!user) throw new Error('You must be signed in.');
    const scopeId = syncScope ?? user.uid;
    const demoEntries = entriesRefState.current.filter((entry) => entry.slug?.startsWith('demo_'));

    if (remoteAvailable && demoEntries.length) {
      try {
        for (let index = 0; index < demoEntries.length; index += 250) {
          const chunk = demoEntries.slice(index, index + 250);
          const batch = writeBatch(db);
          for (const entry of chunk) {
            batch.delete(doc(entriesRef(scopeId), entry.id));
          }
          await batch.commit();
        }
      } catch (error) {
        if (!isPermissionDenied(error)) throw error;
        setRemoteAvailable(false);
      }
    }

    const nextEntries = entriesRefState.current.filter((entry) => !entry.slug?.startsWith('demo_'));
    commitEntries(scopeId, nextEntries);
    const settings = await getAppSettings();
    await setAppSettings({ ...settings, hasImportedLeoData: false });
    return { removed: demoEntries.length };
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
      clearDemoData,
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
