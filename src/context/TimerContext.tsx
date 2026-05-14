import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { clearActiveSession, pushActiveSession, subscribeActiveSession } from '@/lib/activeSessionSync';

export type TimerKind = 'breast' | 'bottle' | 'sleep' | 'pump';

export type ActiveTimer = {
  kind: TimerKind;
  startedAt: number;
  minimized: boolean;
  meta?: Record<string, any>;
};

type TimerContextValue = {
  active: ActiveTimer | null;
  elapsedSeconds: number;
  start: (kind: TimerKind, meta?: Record<string, any>, startedAt?: number) => void;
  stop: () => void;
  minimize: () => void;
  expand: () => void;
  isRunning: (kind?: TimerKind) => boolean;
  updateMeta: (meta: Record<string, any>) => void;
  /** True when the active timer originated on another device. */
  isRemote: boolean;
};

const STORAGE_KEY = 'appleo.activeTimer.v1';
const MAX_TIMER_AGE_MS = 24 * 60 * 60 * 1000;

const TimerContext = createContext<TimerContextValue | null>(null);

function isSameTimer(a: ActiveTimer | null, b: ActiveTimer | null): boolean {
  if (!a || !b) return a === b;
  return a.kind === b.kind && a.startedAt === b.startedAt;
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { user, guestMode } = useAuth();
  const uid = user?.uid;
  const remoteSyncEnabled = Boolean(uid && !guestMode);

  const [active, setActive] = useState<ActiveTimer | null>(null);
  const [now, setNow] = useState(Date.now());
  const [isRemote, setIsRemote] = useState(false);
  const hydrated = useRef(false);
  /** Skip the next remote->local mirror cycle right after a local mutation. */
  const skipNextRemoteEcho = useRef(false);

  // ─── Initial hydration from AsyncStorage ────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as ActiveTimer;
          if (parsed && typeof parsed.startedAt === 'number' && Date.now() - parsed.startedAt < MAX_TIMER_AGE_MS) {
            setActive({ ...parsed, minimized: parsed.minimized ?? false });
          } else {
            await AsyncStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch {
        // ignore
      } finally {
        hydrated.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ─── Local persistence (AsyncStorage) + remote push (Firestore) ─
  useEffect(() => {
    if (!hydrated.current) return;
    if (active) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(active)).catch(() => {});
      if (remoteSyncEnabled && uid) {
        skipNextRemoteEcho.current = true;
        void pushActiveSession(uid, active);
      }
    } else {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      if (remoteSyncEnabled && uid) {
        skipNextRemoteEcho.current = true;
        void clearActiveSession(uid);
      }
    }
  }, [active, remoteSyncEnabled, uid]);

  // ─── Remote subscription (cross-device sync) ────────────────────
  useEffect(() => {
    if (!remoteSyncEnabled || !uid) {
      setIsRemote(false);
      return;
    }
    const unsubscribe = subscribeActiveSession(uid, (remote) => {
      // Ignore the echo of our own write so we don't fight ourselves.
      if (skipNextRemoteEcho.current) {
        skipNextRemoteEcho.current = false;
        return;
      }
      setActive((current) => {
        if (!remote) {
          // Remote cleared — only mirror locally if we still had something.
          if (current) setIsRemote(false);
          return current ? null : current;
        }
        const incoming: ActiveTimer = {
          kind: remote.kind,
          startedAt: remote.startedAt,
          minimized: remote.minimized,
          meta: remote.meta,
        };
        if (isSameTimer(current, incoming) && current?.minimized === incoming.minimized) {
          return current;
        }
        // Mark as remote when we're adopting a session that didn't exist
        // locally (started on another device).
        setIsRemote(!current || !isSameTimer(current, incoming));
        return incoming;
      });
    });
    return () => unsubscribe();
  }, [remoteSyncEnabled, uid]);

  // ─── 1s tick while a timer is active ────────────────────────────
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  const start = useCallback((kind: TimerKind, meta?: Record<string, any>, startedAt?: number) => {
    setIsRemote(false);
    setActive({ kind, startedAt: startedAt ?? Date.now(), minimized: false, meta });
  }, []);

  const stop = useCallback(() => {
    setIsRemote(false);
    setActive(null);
  }, []);

  const minimize = useCallback(() => {
    setActive((prev) => (prev ? { ...prev, minimized: true } : prev));
  }, []);

  const expand = useCallback(() => {
    setActive((prev) => (prev ? { ...prev, minimized: false } : prev));
  }, []);

  const updateMeta = useCallback((meta: Record<string, any>) => {
    setActive((prev) => (prev ? { ...prev, meta: { ...(prev.meta ?? {}), ...meta } } : prev));
  }, []);

  const isRunning = useCallback((kind?: TimerKind) => {
    if (!active) return false;
    return kind ? active.kind === kind : true;
  }, [active]);

  const elapsedSeconds = active ? Math.max(0, Math.floor((now - active.startedAt) / 1000)) : 0;

  const value = useMemo<TimerContextValue>(() => ({
    active, elapsedSeconds, start, stop, minimize, expand, isRunning, updateMeta, isRemote,
  }), [active, elapsedSeconds, start, stop, minimize, expand, isRunning, updateMeta, isRemote]);

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
}
