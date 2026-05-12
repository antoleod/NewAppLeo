import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppLanguage, EntryRecord, UserProfile } from '@/types';

const ACTIVE_BABY_KEY = 'appleo.activeBabyId';
const BABIES_KEY = 'appleo.babies';
const ENTRY_PREFIX = 'appleo.entries';
const MOM_HYDRATION_PREFIX = 'appleo.momHydration';
const MODULE_VISIBILITY_KEY = 'appleo.moduleVisibility';
const APP_SETTINGS_KEY = 'appleo.appSettings';
const GUEST_PROFILE_KEY = 'appleo.guestProfile';
const SAVED_MEDICINES_KEY = 'appleo.savedMedicines';
const DEVICE_DISPLAY_NAME_KEY = 'appleo.deviceDisplayName';
const SESSION_PREFIX = 'appleo.sessions';
const CURRENT_SESSION_PREFIX = 'appleo.currentSession';

export type ThemeVariant = 'sage' | 'rose' | 'navy' | 'sand';
export type ThemeStyle = 'default' | 'photo' | 'classic';

export interface BabyProfile {
  id: string;
  name: string;
  birthDate: string;
  sex: 'female' | 'male' | 'unspecified';
  birthWeightKg?: number;
  birthHeightCm?: number;
  birthHeadCircCm?: number;
  currentWeightKg?: number;
  heightCm?: number;
  headCircCm?: number;
  notes?: string;
  photoUri?: string;
  language?: AppLanguage;
  createdAt: string;
}

export interface SavedMedicine {
  name: string;
  dosage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionRecord {
  id: string;
  email: string;
  device: string;
  createdAt: string;
  updatedAt: string;
}

export type ModuleVisibility = Record<string, boolean>;

export interface DashboardMetrics {
  dailyStatus: boolean;
  nextFeed: boolean;
  lastFeeds: boolean;
  timeline: boolean;
  recentActivity: boolean;
  hydration: boolean;
  widget: boolean;
  weeklyDigest: boolean;
  smartSignals: boolean;
  statsStrip: boolean;
  quickAdd: boolean;
  milkProgress: boolean;
  healthFood: boolean;
  foodHistory: boolean;
  growth: boolean;
  sectionOrder: string[];
}

export interface MotionEffects {
  emojiPulse: boolean;
  liveCountdown: boolean;
  gradientCards: boolean;
  pressScale: boolean;
}

export interface CustomThemeSettings {
  enabled: boolean;
  primary: string;
  secondary: string;
  backgroundAlt: string;
}

export const defaultModuleVisibility: ModuleVisibility = {
  feed: true,
  food: true,
  sleep: true,
  diaper: true,
  pump: true,
  measurement: true,
  medication: true,
  milestone: true,
  symptom: true,
};

export interface AppSettings {
  dailySummaryTime: string;
  largeTouchMode: boolean;
  redNightMode: boolean;
  backgroundPhotoUri: string;
  themeVariant: ThemeVariant;
  themeStyle: ThemeStyle;
  language: AppLanguage;
  hydrationGoalMl: number;
  compactHomeCards: boolean;
  buttonOpacity: number;
  buttonTransparency: number;
  milkGoalMl: number;
  hasImportedLeoData: boolean;
  dashboardMetrics: DashboardMetrics;
  effects: MotionEffects;
  customTheme: CustomThemeSettings;
}

export const defaultAppSettings: AppSettings = {
  dailySummaryTime: '22:00',
  largeTouchMode: false,
  redNightMode: false,
  backgroundPhotoUri: '',
  themeVariant: 'sage',
  themeStyle: 'default',
  language: 'fr',
  hydrationGoalMl: 2500,
  compactHomeCards: false,
  buttonOpacity: 1,
  buttonTransparency: 1,
  milkGoalMl: 600,
  hasImportedLeoData: false,
  dashboardMetrics: {
    dailyStatus: true,
    nextFeed: true,
    lastFeeds: true,
    timeline: true,
    recentActivity: true,
    hydration: true,
    widget: true,
    weeklyDigest: true,
    smartSignals: true,
    statsStrip: true,
    quickAdd: true,
    milkProgress: true,
    healthFood: true,
    foodHistory: true,
    growth: true,
    sectionOrder: ['nextFeed','statsStrip','quickAdd','smartSignals','milkProgress','healthFood','recentActivity','foodHistory','growth','hydration'],
  },
  effects: {
    emojiPulse: true,
    liveCountdown: true,
    gradientCards: true,
    pressScale: true,
  },
  customTheme: {
    enabled: false,
    primary: '#4d7c6b',
    secondary: '#c18f54',
    backgroundAlt: '#eef4ef',
  },
};

/**
 * The subset of AppSettings that "Restore Recommended" resets back to defaults.
 * Centralised so the reset flow doesn't drift as new appearance settings are added.
 */
export const defaultAppearanceSettings = {
  themeVariant: defaultAppSettings.themeVariant,
  themeStyle: defaultAppSettings.themeStyle,
  backgroundPhotoUri: defaultAppSettings.backgroundPhotoUri,
  buttonOpacity: defaultAppSettings.buttonOpacity,
  buttonTransparency: defaultAppSettings.buttonTransparency,
  customTheme: defaultAppSettings.customTheme,
} as const;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function sessionsKey(uid: string) {
  return `${SESSION_PREFIX}:${uid}`;
}

function currentSessionKey(uid: string) {
  return `${CURRENT_SESSION_PREFIX}:${uid}`;
}

function babyEntryKey(babyId: string) {
  return `${ENTRY_PREFIX}:${babyId}`;
}

export async function getBabies() {
  return safeParse<BabyProfile[]>(await AsyncStorage.getItem(BABIES_KEY), []);
}

export async function saveBaby(profile: BabyProfile) {
  const babies = await getBabies();
  const next = [...babies.filter((baby) => baby.id !== profile.id), profile];
  await AsyncStorage.setItem(BABIES_KEY, JSON.stringify(next));
  await AsyncStorage.setItem(ACTIVE_BABY_KEY, profile.id);
  return profile;
}

export async function removeBaby(babyId: string) {
  const babies = await getBabies();
  const next = babies.filter((baby) => baby.id !== babyId);
  await AsyncStorage.setItem(BABIES_KEY, JSON.stringify(next));
  const activeBabyId = await getActiveBabyId();
  if (activeBabyId === babyId) {
    if (next[0]) {
      await AsyncStorage.setItem(ACTIVE_BABY_KEY, next[0].id);
    } else {
      await AsyncStorage.removeItem(ACTIVE_BABY_KEY);
    }
  }
  return next;
}

export async function getActiveBabyId() {
  return (await AsyncStorage.getItem(ACTIVE_BABY_KEY)) ?? null;
}

export async function setActiveBabyId(babyId: string) {
  await AsyncStorage.setItem(ACTIVE_BABY_KEY, babyId);
}

export async function getActiveBaby() {
  const activeBabyId = await getActiveBabyId();
  if (!activeBabyId) return null;
  const babies = await getBabies();
  return babies.find((baby) => baby.id === activeBabyId) ?? null;
}

export async function getEntries(babyId: string) {
  return safeParse<EntryRecord[]>(await AsyncStorage.getItem(babyEntryKey(babyId)), []);
}

export async function saveEntries(babyId: string, entries: EntryRecord[]) {
  await AsyncStorage.setItem(babyEntryKey(babyId), JSON.stringify(entries));
}

export async function upsertEntry(babyId: string, entry: EntryRecord) {
  const entries = await getEntries(babyId);
  const next = [entry, ...entries.filter((item) => item.id !== entry.id)];
  await saveEntries(babyId, next);
  return next;
}

export async function deleteEntry(babyId: string, entryId: string) {
  const entries = await getEntries(babyId);
  const next = entries.filter((item) => item.id !== entryId);
  await saveEntries(babyId, next);
  return next;
}

function hydrationKey(babyId: string) {
  return `${MOM_HYDRATION_PREFIX}:${babyId}`;
}

export async function getMomHydration(babyId: string) {
  return Number((await AsyncStorage.getItem(hydrationKey(babyId))) ?? '0') || 0;
}

export async function setMomHydration(babyId: string, value: number) {
  await AsyncStorage.setItem(hydrationKey(babyId), String(Math.max(0, value)));
}

export async function getModuleVisibility() {
  return {
    ...defaultModuleVisibility,
    ...safeParse<ModuleVisibility>(await AsyncStorage.getItem(MODULE_VISIBILITY_KEY), defaultModuleVisibility),
  };
}

export async function setModuleVisibility(next: ModuleVisibility) {
  await AsyncStorage.setItem(MODULE_VISIBILITY_KEY, JSON.stringify(next));
}

export async function getAppSettings() {
  const parsed = safeParse<Partial<AppSettings>>(await AsyncStorage.getItem(APP_SETTINGS_KEY), defaultAppSettings);
  const parsedButtonOpacity = Number(parsed.buttonOpacity);
  const parsedButtonTransparency = Number(parsed.buttonTransparency);
  return {
    ...defaultAppSettings,
    ...parsed,
    buttonOpacity: Number.isFinite(parsedButtonOpacity)
      ? Math.max(0.2, Math.min(1, parsedButtonOpacity))
      : defaultAppSettings.buttonOpacity,
    buttonTransparency: Number.isFinite(parsedButtonTransparency)
      ? Math.max(0.2, Math.min(1, parsedButtonTransparency))
      : defaultAppSettings.buttonTransparency,
    dashboardMetrics: {
      ...defaultAppSettings.dashboardMetrics,
      ...(parsed.dashboardMetrics ?? {}),
    },
    effects: {
      ...defaultAppSettings.effects,
      ...(parsed.effects ?? {}),
    },
    customTheme: {
      ...defaultAppSettings.customTheme,
      ...(parsed.customTheme ?? {}),
    },
  } as AppSettings;
}

export async function getSavedMedicines() {
  const medicines = safeParse<SavedMedicine[]>(await AsyncStorage.getItem(SAVED_MEDICINES_KEY), []);
  return medicines
    .slice()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 24);
}

export async function upsertSavedMedicine(input: { name: string; dosage?: string }) {
  const name = input.name.trim();
  if (!name) return getSavedMedicines();

  const now = new Date().toISOString();
  const medicines = await getSavedMedicines();
  const nextItem: SavedMedicine = {
    name,
    dosage: input.dosage?.trim() || undefined,
    createdAt: medicines.find((item) => item.name.toLowerCase() === name.toLowerCase())?.createdAt ?? now,
    updatedAt: now,
  };
  const next = [
    nextItem,
    ...medicines.filter((item) => item.name.toLowerCase() !== name.toLowerCase()),
  ];
  await AsyncStorage.setItem(SAVED_MEDICINES_KEY, JSON.stringify(next));
  return next;
}

export async function deleteSavedMedicine(name: string) {
  const medicines = await getSavedMedicines();
  const next = medicines.filter((item) => item.name.toLowerCase() !== name.trim().toLowerCase());
  await AsyncStorage.setItem(SAVED_MEDICINES_KEY, JSON.stringify(next));
  return next;
}

export async function setAppSettings(next: AppSettings) {
  await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(next));
}

export async function updateAppSettings(partial: Partial<AppSettings>) {
  const current = await getAppSettings();
  const next: AppSettings = {
    ...current,
    ...partial,
    dashboardMetrics: {
      ...current.dashboardMetrics,
      ...(partial.dashboardMetrics ?? {}),
    },
    effects: {
      ...current.effects,
      ...(partial.effects ?? {}),
    },
    customTheme: {
      ...current.customTheme,
      ...(partial.customTheme ?? {}),
    },
  };
  await setAppSettings(next);
  return next;
}

export function createGuestProfile(): UserProfile {
  const now = new Date().toISOString();
  return {
    uid: 'guest',
    displayName: 'Guest',
    username: 'guest',
    usernameLower: 'guest',
    authEmail: 'guest@local',
    encryptedPassword: '',
    pinHash: '',
    pinSalt: '',
    role: 'parent',
    status: 'active',
    caregiverName: 'Guest',
    babyName: 'Baby',
    babyBirthDate: '2025-10-21',
    babySex: 'unspecified',
    language: 'fr',
    goalFeedingsPerDay: 8,
    goalSleepHoursPerDay: 14,
    goalDiapersPerDay: 6,
    themeMode: 'system',
    hasCompletedOnboarding: true,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getGuestProfile() {
  return safeParse<UserProfile | null>(await AsyncStorage.getItem(GUEST_PROFILE_KEY), null);
}

export async function setGuestProfile(profile: UserProfile) {
  await AsyncStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));
}

export async function clearGuestProfile() {
  await AsyncStorage.removeItem(GUEST_PROFILE_KEY);
}

export async function clearLocalSession(uid?: string) {
  const babies = await getBabies();
  const keysToRemove: string[] = [
    ACTIVE_BABY_KEY,
    BABIES_KEY,
    GUEST_PROFILE_KEY,
    MODULE_VISIBILITY_KEY,
    SAVED_MEDICINES_KEY,
    'appleo.syncQueue',
    'appleo.sleepDraft',
    ...babies.map((b) => `${ENTRY_PREFIX}:${b.id}`),
    ...babies.map((b) => `${MOM_HYDRATION_PREFIX}:${b.id}`),
  ];
  await AsyncStorage.multiRemove(keysToRemove);

  // Clean up per-uid localStore entries stored in AsyncStorage
  try {
    const raw = await AsyncStorage.getItem('appleo.local.entries');
    if (raw) {
      const entriesMap = JSON.parse(raw) as Record<string, unknown>;
      if (uid) delete entriesMap[uid];
      delete entriesMap['guest'];
      await AsyncStorage.setItem('appleo.local.entries', JSON.stringify(entriesMap));
    }
  } catch { /* ignore */ }
}

export async function getDeviceDisplayName() {
  return (await AsyncStorage.getItem(DEVICE_DISPLAY_NAME_KEY)) ?? '';
}

export async function setDeviceDisplayName(name: string) {
  await AsyncStorage.setItem(DEVICE_DISPLAY_NAME_KEY, name.trim());
}

export async function getSessions(uid: string) {
  return safeParse<SessionRecord[]>(await AsyncStorage.getItem(sessionsKey(uid)), []);
}

export async function getCurrentSessionId(uid: string) {
  return (await AsyncStorage.getItem(currentSessionKey(uid))) ?? null;
}

export async function registerSession(uid: string, email: string) {
  const now = new Date().toISOString();
  const device =
    typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : 'Mobile device';
  const sessionId = globalThis.crypto?.randomUUID?.() ?? `sess_${Date.now()}`;
  const current: SessionRecord = { id: sessionId, email, device, createdAt: now, updatedAt: now };
  const sessions = await getSessions(uid);
  const next = [current, ...sessions.filter((item) => item.id !== sessionId)].slice(0, 20);
  await AsyncStorage.setItem(sessionsKey(uid), JSON.stringify(next));
  await AsyncStorage.setItem(currentSessionKey(uid), sessionId);
  return current;
}

export async function removeSession(uid: string, sessionId: string) {
  const sessions = await getSessions(uid);
  const next = sessions.filter((item) => item.id !== sessionId);
  await AsyncStorage.setItem(sessionsKey(uid), JSON.stringify(next));
  const currentId = await getCurrentSessionId(uid);
  if (currentId === sessionId) {
    await AsyncStorage.removeItem(currentSessionKey(uid));
  }
  return next;
}

const LAST_BOTTLE_AMOUNT_KEY = 'appleo.lastBottleAmount';

export async function getLastBottleAmount(): Promise<number> {
  const val = await AsyncStorage.getItem(LAST_BOTTLE_AMOUNT_KEY);
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : 150;
}

export async function setLastBottleAmount(amount: number): Promise<void> {
  await AsyncStorage.setItem(LAST_BOTTLE_AMOUNT_KEY, String(Math.round(amount)));
}

export async function buildBabyFromProfile(
  profile: UserProfile,
  name: string,
  birthDate: string,
  sex: BabyProfile['sex'],
) {
  const id = globalThis.crypto?.randomUUID?.() ?? `baby_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return saveBaby({
    id,
    name: name || profile.babyName,
    birthDate,
    sex,
    birthWeightKg: profile.birthWeightKg,
    birthHeightCm: profile.birthHeightCm,
    birthHeadCircCm: profile.birthHeadCircCm,
    currentWeightKg: profile.currentWeightKg,
    heightCm: profile.heightCm,
    headCircCm: profile.headCircCm,
    notes: profile.babyNotes,
    photoUri: profile.babyPhotoUri,
    language: profile.language,
    createdAt: new Date().toISOString(),
  });
}
