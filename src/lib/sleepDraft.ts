import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'appleo.sleepDraft';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface SleepDraft {
  clientId: string;
  startedAt: number;
  occurredAt: string;
  notes: string;
  savedAt: number;
}

export async function saveSleepDraft(draft: Omit<SleepDraft, 'savedAt'>): Promise<void> {
  try {
    const record: SleepDraft = { ...draft, savedAt: Date.now() };
    await AsyncStorage.setItem(KEY, JSON.stringify(record));
  } catch {}
}

export async function getSleepDraft(): Promise<SleepDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as SleepDraft;
    if (Date.now() - draft.savedAt > MAX_AGE_MS) {
      await AsyncStorage.removeItem(KEY);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export async function clearSleepDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
