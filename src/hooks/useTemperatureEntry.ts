import { useCallback, useState } from 'react';
import type { EntryPayload, EntryRecord } from '@/types';

/**
 * Per-type entry-form slice for `temperature`. First step of decomposing the
 * monolithic entry form (app/(app)/entry/[type].tsx): each entry type owns its
 * own state, edit-hydration and payload shape here, and the route file just
 * delegates. `hydrate`/`buildPayload` are stable (useCallback) so the route's
 * edit-load effect can list `hydrate` in its deps without re-running.
 */
export function useTemperatureEntry() {
  const [temperatureValue, setTemperatureValue] = useState('');

  const hydrate = useCallback((editing: EntryRecord) => {
    setTemperatureValue(editing.payload?.tempC ? String(editing.payload.tempC) : '');
  }, []);

  const buildPayload = useCallback(
    (notes: string): EntryPayload => ({
      tempC: temperatureValue ? Number(temperatureValue) : undefined,
      notes,
    }),
    [temperatureValue],
  );

  return { temperatureValue, setTemperatureValue, hydrate, buildPayload };
}
