export type ThemeMode = 'system' | 'light' | 'dark';
export type AppLanguage = 'fr' | 'es' | 'en' | 'nl';

export type EntryType =
  | 'feed'
  | 'sleep'
  | 'diaper'
  | 'pump'
  | 'measurement'
  | 'medication'
  | 'milestone'
  | 'symptom';

export type FeedMode = 'breast' | 'bottle';
export type BreastSide = 'left' | 'right' | 'both';

export interface EntryPayload {
  mode?: FeedMode;
  side?: BreastSide;
  durationMin?: number;
  amountMl?: number;
  pee?: number;
  poop?: number;
  vomit?: number;
  weightKg?: number;
  heightCm?: number;
  headCircCm?: number;
  tempC?: number;
  name?: string;
  dosage?: string;
  title?: string;
  icon?: string;
  photoUri?: string;
  tags?: string[];
  notes?: string;
}

export interface EntryRecord {
  id: string;
  type: EntryType;
  title: string;
  notes?: string;
  occurredAt: string;
  createdAt?: string;
  updatedAt?: string;
  payload: EntryPayload;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  username: string;
  usernameLower: string;
  authEmail: string;
  encryptedPassword: string;
  pinHash: string;
  pinSalt: string;
  role: 'parent' | 'caregiver' | 'admin';
  status: 'active' | 'pending' | 'disabled';
  caregiverName: string;
  babyName: string;
  babyBirthDate: string;
  babySex?: 'female' | 'male' | 'unspecified';
  birthWeightKg?: number;
  currentWeightKg?: number;
  heightCm?: number;
  headCircCm?: number;
  babyNotes?: string;
  babyPhotoUri?: string;
  language: AppLanguage;
  goalFeedingsPerDay: number;
  goalSleepHoursPerDay: number;
  goalDiapersPerDay: number;
  themeMode: ThemeMode;
  hasCompletedOnboarding: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterPayload {
  displayName: string;
  username: string;
  email: string;
  password: string;
  pin: string;
}

export interface OnboardingPayload {
  caregiverName: string;
  babyName: string;
  babyBirthDate: string;
  babySex?: 'female' | 'male' | 'unspecified';
  birthWeightKg?: number;
  currentWeightKg?: number;
  heightCm?: number;
  headCircCm?: number;
  babyNotes?: string;
  language: AppLanguage;
  goalFeedingsPerDay: number;
  goalSleepHoursPerDay: number;
  goalDiapersPerDay: number;
}
