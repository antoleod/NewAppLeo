export type ThemeMode = 'system' | 'light' | 'dark';
export type AppLanguage = 'fr' | 'es' | 'en' | 'nl';
export type UnitSystem = 'metric' | 'imperial';

export type EntryType =
  | 'feed'
  | 'food'
  | 'sleep'
  | 'diaper'
  | 'pump'
  | 'measurement'
  | 'medication'
  | 'milestone'
  | 'symptom'
  | 'temperature'
  | 'vaccine';

export type FeedMode = 'breast' | 'bottle';
export type BreastSide = 'left' | 'right' | 'both';
export type FoodCategory = 'puree' | 'fruit' | 'cereals' | 'yogurt' | 'vegetables' | 'water' | 'other';

export interface EntryPayload {
  mode?: FeedMode;
  side?: BreastSide;
  durationMin?: number;
  amountMl?: number;
  foodName?: string;
  foodCategory?: FoodCategory;
  quantity?: string;
  quantityGrams?: number;
  foodLiked?: 'yes' | 'no' | 'neutral';
  amountEaten?: 'all' | 'half' | 'little' | 'none';
  mealTime?: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  pee?: number;
  poop?: number;
  vomit?: number;
  poopColor?: 'yellow' | 'brown' | 'green' | 'dark' | 'red';
  poopConsistency?: 'liquid' | 'soft' | 'normal' | 'hard';
  diaperLeaked?: boolean;
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
  vaccineName?: string;
  vaccineDose?: number;
  vaccineNextDueDate?: string;
  hasReminder?: boolean;
  foodAllergies?: string[];
  severity?: number;
  /** Recommended interval (hours) between medication doses. Used to schedule
   *  the next-dose reminder; preserved on the payload so editing restores it. */
  intervalHours?: number;
  /** Who logged this entry — usually one of the names stored on UserProfile
   *  (caregiverName or partnerName). Free-form so guest mode and pair-mode
   *  scenarios both work without referencing a user id. */
  caregiver?: string;
  // Stable client-generated ID used by sleep entries to deduplicate after a
  // save-then-crash cycle where the local sleep draft might otherwise be
  // resumed and saved twice.
  clientId?: string;
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
  encryptedPassword?: string;
  pinHash?: string;
  pinSalt?: string;
  role: 'parent' | 'caregiver' | 'admin';
  status: 'active' | 'pending' | 'disabled';
  caregiverName: string;
  babyName: string;
  babyBirthDate: string;
  babySex?: 'female' | 'male' | 'unspecified';
  birthWeightKg?: number;
  birthHeightCm?: number;
  birthHeadCircCm?: number;
  currentWeightKg?: number;
  heightCm?: number;
  headCircCm?: number;
  babyNotes?: string;
  babyPhotoUri?: string;
  partnerName?: string;
  prematureWeeks?: number;
  unitSystem?: UnitSystem;
  language: AppLanguage;
  goalFeedingsPerDay: number;
  goalSleepHoursPerDay: number;
  goalDiapersPerDay: number;
  customMedicines?: Array<{ name: string; dosage?: string; updatedAt?: string }>;
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
  birthHeightCm?: number;
  birthHeadCircCm?: number;
  currentWeightKg?: number;
  heightCm?: number;
  headCircCm?: number;
  babyNotes?: string;
  language: AppLanguage;
  goalFeedingsPerDay: number;
  goalSleepHoursPerDay: number;
  goalDiapersPerDay: number;
}
