import { EntryRecord, UserProfile } from '@/types';

export type CareStage = 'milk_only' | 'solids_intro' | 'toddler_meals';

export interface CareStagePolicy {
  ageMonths: number;
  ageLabel: string;
  stage: CareStage;
  solidsUnlocked: boolean;
  fullMealTrackingUnlocked: boolean;
  waterGuidance: string;
  feedingFocus: string;
  foodGuidance: string;
  homeSuggestions: Array<{ label: string; href: string }>;
  hiddenActionTypes: string[];
  foodEntryLocked: boolean;
  foodEntryReason?: string;
}

export interface SickChildChecklistItem {
  key: string;
  label: string;
  done: boolean;
  href: string;
  detail: string;
}

export interface SickChildStatus {
  enabled: boolean;
  reasons: string[];
  checklist: SickChildChecklistItem[];
}

function getAgeMonths(birthDate?: string | null) {
  if (!birthDate) return 0;
  const time = new Date(birthDate).getTime();
  if (!Number.isFinite(time)) return 0;
  const ageMs = Math.max(0, Date.now() - time);
  return ageMs / (30.4375 * 24 * 3600000);
}

function countRecent(entries: EntryRecord[], type: EntryRecord['type'], sinceMs: number, predicate?: (entry: EntryRecord) => boolean) {
  const cutoff = Date.now() - sinceMs;
  return entries.filter((entry) => {
    if (entry.type !== type) return false;
    const time = new Date(entry.occurredAt).getTime();
    if (!Number.isFinite(time) || time < cutoff) return false;
    return predicate ? predicate(entry) : true;
  }).length;
}

function latestRecent(entries: EntryRecord[], type: EntryRecord['type'], sinceMs: number, predicate?: (entry: EntryRecord) => boolean) {
  const cutoff = Date.now() - sinceMs;
  return entries.find((entry) => {
    if (entry.type !== type) return false;
    const time = new Date(entry.occurredAt).getTime();
    if (!Number.isFinite(time) || time < cutoff) return false;
    return predicate ? predicate(entry) : true;
  }) ?? null;
}

function hasSymptomTag(entry: EntryRecord | null, tag: string) {
  return Boolean(entry?.payload?.tags?.some((item) => item.trim().toLowerCase() === tag));
}

export function getCareStagePolicy(profile?: UserProfile | null): CareStagePolicy {
  const ageMonths = getAgeMonths(profile?.babyBirthDate);

  if (ageMonths < 6) {
    return {
      ageMonths,
      ageLabel: '0-6 months',
      stage: 'milk_only',
      solidsUnlocked: false,
      fullMealTrackingUnlocked: false,
      waterGuidance: 'Belgian guidance: milk only. Do not surface extra water prompts before 6 months.',
      feedingFocus: 'Milk-only flow',
      foodGuidance: 'Keep food logging hidden until solids are developmentally unlocked.',
      homeSuggestions: [
        { label: 'Log feed', href: '/entry/feed' },
        { label: 'Log diaper', href: '/entry/diaper' },
        { label: 'Log temperature', href: '/entry/measurement' },
      ],
      hiddenActionTypes: ['food'],
      foodEntryLocked: true,
      foodEntryReason: 'Belgian guidance: before 6 months, keep the flow milk-only.',
    };
  }

  if (ageMonths < 12) {
    return {
      ageMonths,
      ageLabel: '6-12 months',
      stage: 'solids_intro',
      solidsUnlocked: true,
      fullMealTrackingUnlocked: false,
      waterGuidance: 'Belgian guidance: offer small water sips with or after solids, while milk remains central.',
      feedingFocus: 'Solids intro + milk',
      foodGuidance: 'Unlock solids, simple foods, and iron-focused suggestions while keeping milk central.',
      homeSuggestions: [
        { label: 'Log solids', href: '/entry/food' },
        { label: 'Iron foods', href: '/entry/food' },
        { label: 'Track hydration', href: '/entry/measurement' },
      ],
      hiddenActionTypes: [],
      foodEntryLocked: false,
    };
  }

  return {
    ageMonths,
    ageLabel: '12+ months',
    stage: 'toddler_meals',
    solidsUnlocked: true,
    fullMealTrackingUnlocked: true,
    waterGuidance: 'Belgian guidance: water becomes a daily necessity after 12 months.',
    feedingFocus: 'Meals + water + milk as relevant',
    foodGuidance: 'Unlock wider meal logging and daily water prompts, while keeping guidance conservative and age-aware.',
    homeSuggestions: [
      { label: 'Log meal', href: '/entry/food' },
      { label: 'Log water need', href: '/entry/measurement' },
      { label: 'Track behavior', href: '/entry/symptom' },
    ],
    hiddenActionTypes: [],
    foodEntryLocked: false,
  };
}

export function getSickChildStatus(entries: EntryRecord[], medicationName?: string | null): SickChildStatus {
  const recentSymptom = latestRecent(entries, 'symptom', 48 * 3600000);
  const recentMeasurement = latestRecent(entries, 'measurement', 48 * 3600000, (entry) => typeof entry.payload?.tempC === 'number' && entry.payload.tempC >= 38);
  const recentMedication = latestRecent(
    entries,
    'medication',
    48 * 3600000,
    (entry) => !medicationName || entry.payload?.name?.trim().toLowerCase() === medicationName.trim().toLowerCase(),
  );
  const recentDiaper = latestRecent(entries, 'diaper', 24 * 3600000);
  const recentStool = latestRecent(entries, 'diaper', 24 * 3600000, (entry) => (entry.payload?.poop ?? 0) > 0);
  const recentVomit = latestRecent(entries, 'diaper', 24 * 3600000, (entry) => (entry.payload?.vomit ?? 0) > 0)
    || latestRecent(entries, 'symptom', 48 * 3600000, (entry) => hasSymptomTag(entry, 'vomiting'));
  const recentHydration = countRecent(entries, 'feed', 24 * 3600000) + countRecent(entries, 'food', 24 * 3600000);

  const reasons: string[] = [];
  if (hasSymptomTag(recentSymptom, 'fever')) reasons.push('Fever logged');
  if (recentMeasurement) reasons.push('Temperature >= 38C');
  if (hasSymptomTag(recentSymptom, 'vomiting')) reasons.push('Vomiting logged');

  const enabled = reasons.length > 0;

  return {
    enabled,
    reasons,
    checklist: [
      { key: 'temperature', label: 'Temperature', done: Boolean(recentMeasurement), href: '/entry/measurement', detail: recentMeasurement ? 'Recent temperature logged' : 'Log a current temperature' },
      { key: 'pee', label: 'Pee / wet diapers', done: Boolean(recentDiaper && (recentDiaper.payload?.pee ?? 0) > 0), href: '/entry/diaper', detail: recentDiaper ? 'Recent diaper activity logged' : 'Check urine output / wet diapers' },
      { key: 'stool', label: 'Stool', done: Boolean(recentStool), href: '/entry/diaper', detail: recentStool ? 'Recent stool logged' : 'Track stool changes' },
      { key: 'vomiting', label: 'Vomiting', done: Boolean(recentVomit), href: '/entry/symptom', detail: recentVomit ? 'Vomiting context present' : 'Log vomiting if present' },
      { key: 'hydration', label: 'Hydration / liquids', done: recentHydration > 0, href: '/entry/feed', detail: recentHydration > 0 ? 'Recent liquids or feeds logged' : 'Track feeds or liquids' },
      { key: 'medication_name', label: 'Medication name', done: Boolean(recentMedication?.payload?.name), href: '/entry/medication', detail: recentMedication?.payload?.name ?? 'Record medicine name if given' },
      { key: 'last_medication', label: 'Last medication time', done: Boolean(recentMedication), href: '/entry/medication', detail: recentMedication ? `Logged at ${new Date(recentMedication.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'No recent medication log' },
      { key: 'next_allowed', label: 'Next allowed medication time', done: Boolean(recentMedication?.payload?.intervalHours), href: '/entry/medication', detail: recentMedication?.payload?.intervalHours ? 'Interval rule available' : 'Add interval only if parent has it from label/guidance' },
    ],
  };
}
