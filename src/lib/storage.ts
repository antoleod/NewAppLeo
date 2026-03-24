import AsyncStorage from '@react-native-async-storage/async-storage';
import { EntryRecord, UserProfile } from '@/types';

const ACTIVE_BABY_KEY = 'appleo.activeBabyId';
const BABIES_KEY = 'appleo.babies';
const ENTRY_PREFIX = 'appleo.entries';
const MOM_HYDRATION_PREFIX = 'appleo.momHydration';
const MODULE_VISIBILITY_KEY = 'appleo.moduleVisibility';
const APP_SETTINGS_KEY = 'appleo.appSettings';
const GUEST_PROFILE_KEY = 'appleo.guestProfile';

export type ThemeVariant = 'sage' | 'rose' | 'navy' | 'sand';

export interface BabyProfile {
  id: string;
  name: string;
  birthDate: string;
  sex: 'female' | 'male' | 'unspecified';
  createdAt: string;
}

export type ModuleVisibility = Record<string, boolean>;

export const defaultModuleVisibility: ModuleVisibility = {
  feed: true,
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
  themeVariant: ThemeVariant;
}

export const defaultAppSettings: AppSettings = {
  dailySummaryTime: '22:00',
  largeTouchMode: false,
  redNightMode: false,
  themeVariant: 'sage',
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
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
  return safeParse<ModuleVisibility>(await AsyncStorage.getItem(MODULE_VISIBILITY_KEY), defaultModuleVisibility);
}

export async function setModuleVisibility(next: ModuleVisibility) {
  await AsyncStorage.setItem(MODULE_VISIBILITY_KEY, JSON.stringify(next));
}

export async function getAppSettings() {
  return safeParse<AppSettings>(await AsyncStorage.getItem(APP_SETTINGS_KEY), defaultAppSettings);
}

export async function setAppSettings(next: AppSettings) {
  await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(next));
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
    createdAt: new Date().toISOString(),
  });
}
