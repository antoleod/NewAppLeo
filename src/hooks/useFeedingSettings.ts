import { useEffect, useState } from 'react';
import { type FeedingSettings, defaultAppSettings, getAppSettings, updateAppSettings } from '@/lib/storage';

// Module-level cache + subscriber set so all hook instances stay in sync
// without a React context. When saveFeedingSettings is called from any
// component, every mounted instance (home, insights, settings card) updates.
const listeners = new Set<() => void>();
let cached: FeedingSettings = defaultAppSettings.feedingSettings;

export async function saveFeedingSettings(next: FeedingSettings) {
  cached = next;
  await updateAppSettings({ feedingSettings: next });
  listeners.forEach((fn) => fn());
}

export function useFeedingSettings() {
  const [settings, setSettings] = useState<FeedingSettings>(cached);

  useEffect(() => {
    let active = true;
    getAppSettings().then((s) => {
      if (!active) return;
      cached = s.feedingSettings;
      setSettings(s.feedingSettings);
    });

    const refresh = () => setSettings({ ...cached });
    listeners.add(refresh);
    return () => {
      active = false;
      listeners.delete(refresh);
    };
  }, []);

  return settings;
}
