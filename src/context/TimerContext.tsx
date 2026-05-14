import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
};

const STORAGE_KEY = 'appleo.activeTimer.v1';
const MAX_TIMER_AGE_MS = 24 * 60 * 60 * 1000;

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveTimer | null>(null);
  const [now, setNow] = useState(Date.now());
  const hydrated = useRef(false);

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

  useEffect(() => {
    if (!hydrated.current) return;
    if (active) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(active)).catch(() => {});
    } else {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
  }, [active]);

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  const start = useCallback((kind: TimerKind, meta?: Record<string, any>, startedAt?: number) => {
    setActive({ kind, startedAt: startedAt ?? Date.now(), minimized: false, meta });
  }, []);

  const stop = useCallback(() => {
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
    active, elapsedSeconds, start, stop, minimize, expand, isRunning, updateMeta,
  }), [active, elapsedSeconds, start, stop, minimize, expand, isRunning, updateMeta]);

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
}
