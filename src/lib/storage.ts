import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '@/lib/firebase';
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { AppLanguage, EntryRecord, UserProfile } from '@/types';

const MOM_HYDRATION_PREFIX = 'babyflow.momHydration';
const SETTINGS_DOC = 'settings';
const BABIES_COLLECTION = 'babies';
const ACTIVE_BABY_DOC = 'meta';
const SAVED_MEDICINES_COLLECTION = 'savedMedicines';
const AUTH_PROFILE_PREFIX = 'babyflow.authProfile';
const APP_SETTINGS_PREFIX = 'babyflow.appSettings';

export type ThemeVariant = 'light' | 'custom' | 'parliament' | 'noir';
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
  useCount: number;
  lastUsedAt: string;
  intervalHours?: number | null;
  intervalLabel?: string;
  symptomTags?: string[];
  commonFor?: string[];
  minAgeMonths?: number | null;
  notes?: string;
  isCustom?: boolean;
}

export interface MedicationPlanItem {
  name: string;
  intervalHours: number;
}

export interface MedicationAlternatingPlan {
  enabled: boolean;
  medicines: MedicationPlanItem[];
  notes?: string;
}

export interface MedicationPreset {
  id: string;
  name: string;
  dosage?: string;
  intervalHours?: number | null;
  symptomTags: string[];
  commonFor: string[];
  minAgeMonths?: number | null;
  notes?: string;
  isCustom?: boolean;
  section: 'Fever / Pain' | 'Cold / Congestion' | 'Cough / Throat' | 'Hydration / Recovery' | 'Skin / Irritation' | 'Stomach / Digestion';
}

const DEFAULT_MEDICINE_USE_COUNT = 0;

function isPermissionDenied(error: unknown) {
  return Boolean((error as any)?.code === 'permission-denied' || /permission/i.test((error as any)?.message ?? ''));
}

function authProfileKey(uid: string) {
  return `${AUTH_PROFILE_PREFIX}:${uid}`;
}

function appSettingsKey(uid: string) {
  return `${APP_SETTINGS_PREFIX}:${uid}`;
}

export function appSettingsCacheKey() {
  const uid = auth.currentUser?.uid ?? 'guest';
  return appSettingsKey(uid);
}

function normalizeThemeVariant(value?: string): ThemeVariant {
  switch (value) {
    case 'sage':
      return 'light';
    case 'rose':
      return 'parliament';
    case 'navy':
      return 'custom';
    case 'sand':
      return 'noir';
    case 'light':
    case 'custom':
    case 'parliament':
    case 'noir':
      return value;
    default:
      return defaultAppSettings.themeVariant;
  }
}

export function profileSettingsRef(uid: string) {
  return doc(db, 'profiles', uid);
}

const SYMPTOM_MEDICATION_MAP: Record<string, string[]> = {
  fever: ['paracetamol / acetaminophen', 'ibuprofen'],
  pain: ['paracetamol / acetaminophen', 'ibuprofen'],
  cough: [],
  congestion: ['saline nasal spray'],
  colic: [],
  rash: ['zinc oxide cream'],
  diarrhea: ['oral rehydration solution'],
  vomiting: ['oral rehydration solution'],
  irritability: ['paracetamol / acetaminophen'],
  dehydration: ['oral rehydration solution'],
  skin: ['zinc oxide cream'],
};

export const MEDICATION_PRESETS: MedicationPreset[] = [
  {
    id: 'paracetamol-acetaminophen',
    name: 'Paracetamol',
    dosage: '15mg/kg every 6h',
    intervalHours: 6,
    symptomTags: ['fever', 'pain', 'irritability'],
    commonFor: ['Fever / Pain'],
    minAgeMonths: null,
    notes: 'Commonly used for fever or pain. Standard interval is 6 hours.',
    isCustom: false,
    section: 'Fever / Pain',
  },
  {
    id: 'ibuprofen-nurofen',
    name: 'Ibuprofen (Nurofen)',
    dosage: '10mg/kg every 8h',
    intervalHours: 8,
    symptomTags: ['fever', 'pain'],
    commonFor: ['Fever / Pain'],
    minAgeMonths: 3,
    notes: 'Often used for fever or inflammation. Standard interval is 8 hours. Not for < 3 months/5kg.',
    isCustom: false,
    section: 'Fever / Pain',
  },
  {
    id: 'paracetamol-suppository',
    name: 'Paracetamol Suppository',
    dosage: 'Weight-based dose every 6h',
    intervalHours: 6,
    symptomTags: ['fever', 'pain', 'vomiting'],
    commonFor: ['Fever / Pain'],
    minAgeMonths: null,
    notes: 'Useful when the child is vomiting. Standard interval is 6 hours.',
    isCustom: false,
    section: 'Fever / Pain',
  },
  {
    id: 'saline-nasal-spray',
    name: 'Saline nasal spray',
    dosage: 'As needed before feeds',
    symptomTags: ['congestion', 'cold'],
    commonFor: ['Cold / Congestion'],
    minAgeMonths: null,
    notes: 'Clears nasal passages. No medication dosing.',
    isCustom: false,
    section: 'Cold / Congestion',
  },
  {
    id: 'humidified-steam-support',
    name: 'Nasal care / humidified support',
    symptomTags: ['congestion', 'cough'],
    commonFor: ['Cold / Congestion', 'Cough / Throat'],
    minAgeMonths: null,
    notes: 'Use to track supportive care context when helpful for symptoms.',
    isCustom: false,
    section: 'Cold / Congestion',
  },
  {
    id: 'throat-comfort-support',
    name: 'Throat comfort support',
    symptomTags: ['cough', 'throat'],
    commonFor: ['Cough / Throat'],
    minAgeMonths: null,
    notes: 'Organizational log only. Check age suitability for any product used.',
    isCustom: false,
    section: 'Cough / Throat',
  },
  {
    id: 'oral-rehydration-solution',
    name: 'Oral rehydration (ORS)',
    dosage: 'Small frequent sips',
    intervalHours: 1,
    symptomTags: ['dehydration', 'diarrhea', 'vomiting'],
    commonFor: ['Hydration / Recovery', 'Stomach / Digestion'],
    minAgeMonths: null,
    notes: 'Key for recovery from fluid loss. Offer frequently.',
    isCustom: false,
    section: 'Hydration / Recovery',
  },
  {
    id: 'zinc-oxide-cream',
    name: 'Zinc oxide cream',
    symptomTags: ['rash', 'skin', 'irritation'],
    commonFor: ['Skin / Irritation'],
    minAgeMonths: null,
    notes: 'Commonly logged for diaper-area irritation or mild skin protection.',
    isCustom: false,
    section: 'Skin / Irritation',
  },
  {
    id: 'probiotic-support',
    name: 'Digestive support',
    symptomTags: ['colic', 'stomach', 'digestion'],
    commonFor: ['Stomach / Digestion'],
    minAgeMonths: null,
    notes: 'Track only if already in use with your clinician guidance or label instructions.',
    isCustom: false,
    section: 'Stomach / Digestion',
  },
];

function normalizeSymptomTag(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

function uniqueNormalized(values: Array<string | undefined> = []) {
  return Array.from(new Set(values.map(normalizeSymptomTag).filter(Boolean)));
}

function normalizeSavedMedicine(input: Partial<SavedMedicine> & Pick<SavedMedicine, 'name'>): SavedMedicine {
  const now = new Date().toISOString();
  const createdAt = input.createdAt ?? input.updatedAt ?? input.lastUsedAt ?? now;
  const updatedAt = input.updatedAt ?? input.lastUsedAt ?? createdAt;
  return {
    name: input.name.trim(),
    dosage: input.dosage?.trim() || undefined,
    createdAt,
    updatedAt,
    useCount: typeof input.useCount === 'number' && Number.isFinite(input.useCount) ? input.useCount : DEFAULT_MEDICINE_USE_COUNT,
    lastUsedAt: input.lastUsedAt ?? updatedAt,
    intervalHours: typeof input.intervalHours === 'number' && Number.isFinite(input.intervalHours) ? input.intervalHours : null,
    intervalLabel: input.intervalLabel?.trim() || undefined,
    symptomTags: uniqueNormalized(input.symptomTags),
    commonFor: Array.from(new Set((input.commonFor ?? []).map((item) => item.trim()).filter(Boolean))),
    minAgeMonths: typeof input.minAgeMonths === 'number' ? input.minAgeMonths : null,
    notes: input.notes?.trim() || undefined,
    isCustom: input.isCustom ?? true,
  };
}

export type ModuleVisibility = Record<string, boolean>;

export interface DashboardMetrics {
  dailyStatus: boolean;
  nextFeed: boolean;
  guidance: boolean;
  lastFeeds: boolean;
  medication: boolean;
  sickChild: boolean;
  timeline: boolean;
  quickActions: boolean;
  recentActivity: boolean;
  hydration: boolean;
  widget: boolean;
  weeklyDigest: boolean;
  smartSignals: boolean;
}

export const defaultHomeSectionOrder = [
  'nextFeed',
  'smartSignals',
  'dailyStatus',
  'guidance',
  'lastFeeds',
  'medication',
  'sickChild',
  'timeline',
  'quickActions',
  'hydration',
  'recentActivity',
] as const;

export type HomeSectionKey = (typeof defaultHomeSectionOrder)[number];

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
  highContrastMode: boolean;
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
  homeSectionOrder: HomeSectionKey[];
  effects: MotionEffects;
  customTheme: CustomThemeSettings;
  medicationAlternatingPlan: MedicationAlternatingPlan;
}

export const defaultAppSettings: AppSettings = {
  dailySummaryTime: '22:00',
  largeTouchMode: false,
  highContrastMode: false,
  redNightMode: false,
  backgroundPhotoUri: '',
  themeVariant: 'noir',
  themeStyle: 'default',
  language: 'en',
  hydrationGoalMl: 2500,
  compactHomeCards: false,
  hasImportedLeoData: false,
  moduleVisibility: defaultModuleVisibility,
  dashboardMetrics: {
    dailyStatus: true,
    nextFeed: true,
    guidance: true,
    lastFeeds: true,
    medication: true,
    sickChild: true,
    timeline: true,
    quickActions: true,
    recentActivity: true,
    hydration: true,
    widget: true,
    weeklyDigest: true,
    smartSignals: true,
  },
  homeSectionOrder: [...defaultHomeSectionOrder],
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
  medicationAlternatingPlan: {
    enabled: false,
    medicines: [],
    notes: '',
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
  try {
    const snap = await getDocs(query(collection(db, 'users', uid, BABIES_COLLECTION), orderBy('createdAt', 'desc')));
    return snap.docs.map((item) => item.data() as BabyProfile);
  } catch (error) {
    if (isPermissionDenied(error)) {
      return [];
    }
    throw error;
  }
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
  try {
    const snap = await getDoc(doc(db, 'users', uid, SETTINGS_DOC, ACTIVE_BABY_DOC));
    return (snap.data()?.activeBabyId as string | undefined) ?? null;
  } catch (error) {
    if (isPermissionDenied(error)) {
      return null;
    }
    throw error;
  }
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
  const cachedRaw = await AsyncStorage.getItem(appSettingsCacheKey());
  const cached = hydrateAppSettings(cachedRaw ? (JSON.parse(cachedRaw) as Partial<AppSettings>) : {});
  const uid = auth.currentUser?.uid;
  if (!uid) return cached;
  try {
    const snap = await getDoc(profileSettingsRef(uid));
    const parsed = (snap.exists() ? (snap.data() as Partial<AppSettings>) : {}) ?? {};
    const next = hydrateAppSettings(parsed);
    await AsyncStorage.setItem(appSettingsKey(uid), JSON.stringify(next));
    return next;
  } catch (error) {
    if (!isPermissionDenied(error)) throw error;
    return cached;
  }
}

export async function getSavedMedicines() {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  try {
    const snap = await getDocs(query(collection(db, 'users', uid, SAVED_MEDICINES_COLLECTION), orderBy('updatedAt', 'desc')));
    return mergeLegacySavedMedicines(snap.docs.map((item) => item.data() as Partial<SavedMedicine>));
  } catch (error) {
    if (isPermissionDenied(error)) {
      return [];
    }
    throw error;
  }
}

export function mergeLegacySavedMedicines(medicines: Array<Partial<SavedMedicine>>) {
  return medicines
    .filter((item): item is Partial<SavedMedicine> & Pick<SavedMedicine, 'name'> => typeof item?.name === 'string' && Boolean(item.name.trim()))
    .map((item) => normalizeSavedMedicine(item))
    .sort((left, right) => {
      if (right.useCount !== left.useCount) return right.useCount - left.useCount;
      return right.lastUsedAt.localeCompare(left.lastUsedAt);
    })
    .slice(0, 24);
}

function scoreMedicineForSymptoms(medicine: SavedMedicine, selectedSymptoms: string[]) {
  if (!selectedSymptoms.length) return 0;
  const normalizedSymptoms = uniqueNormalized(selectedSymptoms);
  const medicineTags = uniqueNormalized([...(medicine.symptomTags ?? []), ...(medicine.commonFor ?? []).map((item) => item.toLowerCase())]);
  const mappedNames = normalizedSymptoms.flatMap((symptom) => SYMPTOM_MEDICATION_MAP[symptom] ?? []);
  let score = 0;
  for (const symptom of normalizedSymptoms) {
    if (medicineTags.includes(symptom)) score += 3;
  }
  if (mappedNames.some((candidate) => candidate === medicine.name.trim().toLowerCase())) {
    score += 4;
  }
  return score;
}

export function getMedicationPresetsBySymptom(symptoms: string[] = []) {
  const normalizedSymptoms = uniqueNormalized(symptoms);
  const presets = MEDICATION_PRESETS.map((preset) => ({
    ...preset,
    score: scoreMedicineForSymptoms(
      normalizeSavedMedicine({
        ...preset,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        lastUsedAt: new Date(0).toISOString(),
        useCount: 0,
      }),
      normalizedSymptoms,
    ),
  }));

  return presets
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.name.localeCompare(right.name);
    })
    .map(({ score, ...preset }) => preset);
}

export function getSavedMedicinesRanked(savedMedicines: SavedMedicine[], selectedSymptoms: string[] = []) {
  const normalizedSymptoms = uniqueNormalized(selectedSymptoms);
  return [...mergeLegacySavedMedicines(savedMedicines)].sort((left, right) => {
    if (right.useCount !== left.useCount) return right.useCount - left.useCount;
    if (right.lastUsedAt !== left.lastUsedAt) return right.lastUsedAt.localeCompare(left.lastUsedAt);
    const symptomDelta = scoreMedicineForSymptoms(right, normalizedSymptoms) - scoreMedicineForSymptoms(left, normalizedSymptoms);
    if (symptomDelta !== 0) return symptomDelta;
    return left.name.localeCompare(right.name);
  });
}

export async function upsertSavedMedicine(input: {
  name: string;
  dosage?: string;
  intervalHours?: number | null;
  intervalLabel?: string;
  symptomTags?: string[];
  commonFor?: string[];
  minAgeMonths?: number | null;
  notes?: string;
  isCustom?: boolean;
}) {
  const name = input.name.trim();
  if (!name) return getSavedMedicines();

  const now = new Date().toISOString();
  const medicines = await getSavedMedicines();
  const current = medicines.find((item) => item.name.toLowerCase() === name.toLowerCase());
  const nextItem = normalizeSavedMedicine({
    ...current,
    name,
    dosage: input.dosage?.trim() || current?.dosage,
    intervalHours: input.intervalHours ?? current?.intervalHours ?? null,
    intervalLabel: input.intervalLabel?.trim() || current?.intervalLabel,
    symptomTags: [...(current?.symptomTags ?? []), ...(input.symptomTags ?? [])],
    commonFor: [...(current?.commonFor ?? []), ...(input.commonFor ?? [])],
    minAgeMonths: input.minAgeMonths ?? current?.minAgeMonths ?? null,
    notes: input.notes ?? current?.notes,
    isCustom: input.isCustom ?? current?.isCustom ?? true,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
    lastUsedAt: current?.lastUsedAt ?? current?.updatedAt ?? now,
    useCount: current?.useCount ?? DEFAULT_MEDICINE_USE_COUNT,
  });
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

export async function recordMedicineUse(input: {
  name: string;
  dosage?: string;
  usedAt?: string;
  intervalHours?: number | null;
  intervalLabel?: string;
  symptomTags?: string[];
  commonFor?: string[];
  minAgeMonths?: number | null;
  notes?: string;
  isCustom?: boolean;
}) {
  const name = input.name.trim();
  if (!name) return getSavedMedicines();

  const medicines = await getSavedMedicines();
  const current = medicines.find((item) => item.name.toLowerCase() === name.toLowerCase());
  const usedAt = input.usedAt ?? new Date().toISOString();
  const nextItem = normalizeSavedMedicine({
    ...current,
    name,
    dosage: input.dosage?.trim() || current?.dosage,
    intervalHours: input.intervalHours ?? current?.intervalHours ?? null,
    intervalLabel: input.intervalLabel?.trim() || current?.intervalLabel,
    symptomTags: [...(current?.symptomTags ?? []), ...(input.symptomTags ?? [])],
    commonFor: [...(current?.commonFor ?? []), ...(input.commonFor ?? [])],
    minAgeMonths: input.minAgeMonths ?? current?.minAgeMonths ?? null,
    notes: input.notes ?? current?.notes,
    isCustom: input.isCustom ?? current?.isCustom ?? true,
    createdAt: current?.createdAt ?? usedAt,
    updatedAt: usedAt,
    lastUsedAt: usedAt,
    useCount: Math.max(0, current?.useCount ?? DEFAULT_MEDICINE_USE_COUNT) + 1,
  });
  const uid = auth.currentUser?.uid;
  if (uid) {
    await setDoc(doc(db, 'users', uid, SAVED_MEDICINES_COLLECTION, name.toLowerCase()), nextItem, { merge: true });
  }
  return getSavedMedicines();
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
  const normalized = hydrateAppSettings(next);
  await AsyncStorage.setItem(appSettingsCacheKey(), JSON.stringify(normalized));
  const uid = auth.currentUser?.uid;
  if (!uid) return normalized;
  try {
    await setDoc(profileSettingsRef(uid), normalized, { merge: true });
  } catch (error) {
    if (!isPermissionDenied(error)) throw error;
  }
  return normalized;
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
    medicationAlternatingPlan: {
      ...current.medicationAlternatingPlan,
      ...(partial.medicationAlternatingPlan ?? {}),
      medicines: partial.medicationAlternatingPlan?.medicines ?? current.medicationAlternatingPlan.medicines,
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
const authProfileMemory = new Map<string, UserProfile>();

export async function getGuestProfile() {
  return guestProfileMemory;
}

export async function setGuestProfile(profile: UserProfile) {
  guestProfileMemory = profile;
}

export async function clearGuestProfile() {
  guestProfileMemory = null;
}

export async function getCachedAuthProfile(uid: string) {
  const inMemory = authProfileMemory.get(uid);
  if (inMemory) return inMemory;
  const raw = await AsyncStorage.getItem(authProfileKey(uid));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as UserProfile;
    authProfileMemory.set(uid, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export async function setCachedAuthProfile(profile: UserProfile) {
  authProfileMemory.set(profile.uid, profile);
  await AsyncStorage.setItem(authProfileKey(profile.uid), JSON.stringify(profile));
}

export async function clearCachedAuthProfile(uid: string) {
  authProfileMemory.delete(uid);
  await AsyncStorage.removeItem(authProfileKey(uid));
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

function hydrateAppSettings(parsed: Partial<AppSettings> = {}): AppSettings {
  return {
    ...defaultAppSettings,
    ...parsed,
    themeVariant: normalizeThemeVariant(parsed.themeVariant),
    dashboardMetrics: {
      ...defaultAppSettings.dashboardMetrics,
      ...(parsed.dashboardMetrics ?? {}),
    },
    homeSectionOrder: Array.from(
      new Set([
        ...((parsed.homeSectionOrder ?? []).filter((item): item is HomeSectionKey =>
          (defaultHomeSectionOrder as readonly string[]).includes(item),
        )),
        ...defaultHomeSectionOrder,
      ]),
    ) as HomeSectionKey[],
    effects: {
      ...defaultAppSettings.effects,
      ...(parsed.effects ?? {}),
    },
    customTheme: {
      ...defaultAppSettings.customTheme,
      ...(parsed.customTheme ?? {}),
    },
    medicationAlternatingPlan: {
      ...defaultAppSettings.medicationAlternatingPlan,
      ...(parsed.medicationAlternatingPlan ?? {}),
      medicines: (parsed.medicationAlternatingPlan?.medicines ?? defaultAppSettings.medicationAlternatingPlan.medicines)
        .filter((item) => item?.name && typeof item?.intervalHours === 'number')
        .map((item) => ({ name: item.name.trim(), intervalHours: item.intervalHours })),
    },
  } as AppSettings;
}
