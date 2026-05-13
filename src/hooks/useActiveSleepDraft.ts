import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { getSleepDraft, type SleepDraft } from '@/lib/sleepDraft';

/**
 * Subscribes to the active sleep draft so any screen can show a "running"
 * indicator without owning timer state itself. Returns null when no draft
 * is active.
 *
 * The hook:
 *  - polls the draft every 3 s (cheap — one AsyncStorage key read)
 *  - refetches when the app comes back to foreground
 *  - on web, also listens to the cross-tab 'storage' event so starting/
 *    stopping a sleep in another tab updates this tab immediately
 *  - ticks a separate clock every 1 s to drive the elapsed-seconds display
 *    only while a draft is active, so we don't burn CPU when idle
 */
export function useActiveSleepDraft() {
  const [draft, setDraft] = useState<SleepDraft | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const next = await getSleepDraft();
      if (alive) setDraft(next);
    };
    void refresh();
    const poll = setInterval(() => void refresh(), 3_000);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });

    let storageCleanup: (() => void) | undefined;
    if (Platform.OS === 'web') {
      const win = globalThis as any;
      if (typeof win.addEventListener === 'function') {
        const handler = (event: any) => {
          if (event?.key === 'appleo.sleepDraft') void refresh();
        };
        win.addEventListener('storage', handler);
        storageCleanup = () => win.removeEventListener?.('storage', handler);
      }
    }

    return () => {
      alive = false;
      clearInterval(poll);
      sub.remove();
      storageCleanup?.();
    };
  }, []);

  useEffect(() => {
    if (!draft) return;
    const tick = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(tick);
  }, [draft]);

  if (!draft) return null;
  const elapsedSeconds = Math.max(0, Math.floor((now - draft.startedAt) / 1000));
  return { draft, elapsedSeconds };
}
