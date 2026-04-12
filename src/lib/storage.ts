import { auth, db } from '@/lib/firebase';
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { AppLanguage, EntryRecord, UserProfile } from '@/types';

const MOM_HYDRATION_PREFIX = 'appleo.momHydration';
const SETTINGS_DOC = 'settings';
const BABIES_COLLECTION = 'babies';
const ACTIVE_BABY_DOC = 'meta';
const SAVED_MEDICINES_COLLECTION = 'savedMedicines';

export type ThemeVariant = 'sage' | 'rose' | 'navy' | 'sand';
export type ThemeStyle = 'default' | 'photo' | 'classic';

export interface BabyProfile {
  id: string;
  name: string;
  birthDate: string;
  sex: 'female' | 'male' | 'unspecified';
  birthWeightKg?: number;
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
  hasImportedLeoData: boolean;
  moduleVisibility: ModuleVisibility;
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
  language: 'en',
  hydrationGoalMl: 2500,
  compactHomeCards: false,
  hasImportedLeoData: false,
  moduleVisibility: defaultModuleVisibility,
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

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function getBabies() {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  const snap = await getDocs(query(collection(db, 'users', uid, BABIES_COLLECTION), orderBy('createdAt', 'desc')));
  return snap.docs.map((item) => item.data() as BabyProfile);
}

export async function saveBaby(profile: BabyProfile) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('You must be signed in.');
  await setDoc(doc(db, 'users', uid, BABIES_COLLECTION, profile.id), {
    ...profile,
    createdAt: profile.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await setDoc(doc(db, 'users', uid, SETTINGS_DOC, ACTIVE_BABY_DOC), { activeBabyId: profile.id, updatedAt: serverTimestamp() }, { merge: true });
  return profile;
}

export async function removeBaby(babyId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('You must be signed in.');
  await deleteDoc(doc(db, 'users', uid, BABIES_COLLECTION, babyId));
  const next = await getBabies();
  const activeBabyId = await getActiveBabyId();
  if (activeBabyId === babyId) {
    const firstBaby = next[0] as BabyProfile | undefined;
    if (firstBaby) await setActiveBabyId(firstBaby.id);
  }
  return next;
}

export async function getActiveBabyId() {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid, SETTINGS_DOC, ACTIVE_BABY_DOC));
  return (snap.data()?.activeBabyId as string | undefined) ?? null;
}

export async function setActiveBabyId(babyId: string) {
  const uid = auth.currentUser?.uid;
  if (uid) {
    await setDoc(doc(db, 'users', uid, SETTINGS_DOC, ACTIVE_BABY_DOC), { activeBabyId: babyId, updatedAt: serverTimestamp() }, { merge: true });
  }
}

export async function getActiveBaby() {
  const activeBabyId = await getActiveBabyId();
  if (!activeBabyId) return null;
  const babies = await getBabies();
  return babies.find((baby) => baby.id === activeBabyId) ?? null;
}

export async function getEntries(babyId: string) {
  return [] as EntryRecord[];
}

export async function saveEntries(babyId: string, entries: EntryRecord[]) {
  return;
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
  return 0;
}

export async function setMomHydration(babyId: string, value: number) {
  return;
}

export async function getModuleVisibility() {
  const settings = await getAppSettings();
  return settings.moduleVisibility ?? defaultModuleVisibility;
}

export async function setModuleVisibility(next: ModuleVisibility) {
  await updateAppSettings({ moduleVisibility: next });
}

export async function getAppSettings() {
  const uid = auth.currentUser?.uid;
  if (!uid) return defaultAppSettings;
  const snap = await getDoc(doc(db, 'users', uid, SETTINGS_DOC, 'main'));
  const parsed = (snap.exists() ? (snap.data() as Partial<AppSettings>) : {}) ?? {};
  return {
    ...defaultAppSettings,
    ...parsed,
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
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  const snap = await getDocs(query(collection(db, 'users', uid, SAVED_MEDICINES_COLLECTION), orderBy('updatedAt', 'desc')));
  return snap.docs.map((item) => item.data() as SavedMedicine).slice(0, 24);
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
  const uid = auth.currentUser?.uid;
  if (uid) {
    await setDoc(doc(db, 'users', uid, SAVED_MEDICINES_COLLECTION, name.toLowerCase()), nextItem, { merge: true });
  }
  return next;
}

export async function deleteSavedMedicine(name: string) {
  const medicines = await getSavedMedicines();
  const next = medicines.filter((item) => item.name.toLowerCase() !== name.trim().toLowerCase());
  const uid = auth.currentUser?.uid;
  if (uid) {
    await deleteDoc(doc(db, 'users', uid, SAVED_MEDICINES_COLLECTION, name.trim().toLowerCase()));
  }
  return next;
}

export async function setAppSettings(next: AppSettings) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await setDoc(doc(db, 'users', uid, SETTINGS_DOC, 'main'), next, { merge: true });
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
    babyName: 'Leo',
    babyBirthDate: '2025-10-21',
    babySex: 'unspecified',
    language: 'en',
    goalFeedingsPerDay: 8,
    goalSleepHoursPerDay: 14,
    goalDiapersPerDay: 6,
    themeMode: 'system',
    hasCompletedOnboarding: true,
    createdAt: now,
    updatedAt: now,
  };
}

let guestProfileMemory: UserProfile | null = null;

export async function getGuestProfile() {
  return guestProfileMemory;
}

export async function setGuestProfile(profile: UserProfile) {
  guestProfileMemory = profile;
}

export async function clearGuestProfile() {
  guestProfileMemory = null;
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
    currentWeightKg: profile.currentWeightKg,
    heightCm: profile.heightCm,
    headCircCm: profile.headCircCm,
    notes: profile.babyNotes,
    photoUri: profile.babyPhotoUri,
    language: profile.language,
    createdAt: new Date().toISOString(),
  });
}
