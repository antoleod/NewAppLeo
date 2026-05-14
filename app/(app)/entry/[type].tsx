import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import { Button, Card, Input, Page, Segment } from '@/components/shared';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';
import { useLocale } from '@/context/LocaleContext';
import { useAuth } from '@/context/AuthContext';
import { useTimer } from '@/context/TimerContext';
import { useTranslation } from '@/hooks/useTranslation';
import { clamp } from '@/utils/date';
import { BreastSide, EntryPayload, EntryType } from '@/types';
import { TimerWidget } from '@/components/home';
import { QuantityPicker } from '@/components/shared';
import { DateTimeField } from '@/components/shared';
import { VaccineReminderModal } from '@/components/home';
import { DiaperLevelPicker, FullscreenTimerModal } from '@/components/home';
import { getAppSettings, getSavedMedicines, upsertSavedMedicine, type SavedMedicine } from '@/lib/storage';
import { clearSleepDraft, getSleepDraft, saveSleepDraft, type SleepDraft } from '@/lib/sleepDraft';
import commonMedications from '@/data/common-medications.json';
import * as ImagePicker from 'expo-image-picker';
import { scheduleVaccineReminder } from '@/lib/notifications';
import { scheduleMedicationReminder } from '@/lib/notifications';
import { getSuggestedValues, getWeightCategory, getHeightCategory } from '@/lib/who-recommendations';
import { getRecommendedQuantity, getFoodRecommendationMessage } from '@/lib/food-recommendations';
import { suggestFoodQuantities, inferCategoryFromName, type QuantityChip } from '@/lib/food-suggestions';
import type { FoodCategory } from '@/types';
import { getSeasonalRecommendations } from '@/lib/seasonal-recommendations';
import { haptics } from '@/lib/haptics';
import { useToast } from '@/components/shared';
import { shareEntry, shareEntryAsImage, buildShareMessage } from '@/lib/shareEntry';
import { ShareCard } from '@/components/history';
import { shadow } from '@/lib/shadow';

const typeLabelsI18n: Record<EntryType, Record<string, string>> = {
  feed:        { fr: 'Biberon',    en: 'Feed',        es: 'Biberón',    nl: 'Voeding'  },
  food:        { fr: 'Repas',      en: 'Food',        es: 'Comida',     nl: 'Eten'     },
  sleep:       { fr: 'Sommeil',    en: 'Sleep',       es: 'Sueño',      nl: 'Slaap'    },
  diaper:      { fr: 'Couche',     en: 'Diaper',      es: 'Pañal',      nl: 'Luier'    },
  pump:        { fr: 'Tirage',     en: 'Pump',        es: 'Extracción', nl: 'Kolven'   },
  measurement: { fr: 'Mesure',     en: 'Measurement', es: 'Medición',   nl: 'Meting'   },
  medication:  { fr: 'Médicament', en: 'Medication',  es: 'Medicamento',nl: 'Medicijn' },
  milestone:   { fr: 'Étape',      en: 'Milestone',   es: 'Hito',       nl: 'Mijlpaal' },
  symptom:     { fr: 'Symptôme',   en: 'Symptom',     es: 'Síntoma',    nl: 'Symptoom' },
  temperature: { fr: 'Température',en: 'Temperature', es: 'Temperatura',nl: 'Temperatuur'},
  vaccine:     { fr: 'Vaccin',     en: 'Vaccine',     es: 'Vacuna',     nl: 'Vaccin'   },
};

const symptomOptions = [
  { label: 'Irritable', value: 'irritable' },
  { label: 'Cry', value: 'cry' },
  { label: 'Green stool', value: 'green stool' },
  { label: 'Colic', value: 'colic' },
];

const vaccinePresets = ['BCG', 'Hepatitis B', 'DTP', 'Polio', 'MMR', 'Varicella', 'Rotavirus', 'PCV'];

const foodPresets = [
  { icon: '🥣', value: 'puree', labels: { fr: 'Purée', en: 'Purée', es: 'Puré', nl: 'Puree' } },
  { icon: '🍎', value: 'fruit', labels: { fr: 'Fruit', en: 'Fruit', es: 'Fruta', nl: 'Fruit' } },
  { icon: '🌾', value: 'cereals', labels: { fr: 'Céréales', en: 'Cereals', es: 'Cereales', nl: 'Granen' } },
  { icon: '🥛', value: 'yogurt', labels: { fr: 'Yaourt', en: 'Yogurt', es: 'Yogur', nl: 'Yoghurt' } },
  { icon: '🥕', value: 'vegetables', labels: { fr: 'Légumes', en: 'Veggies', es: 'Verduras', nl: 'Groenten' } },
  { icon: '💧', value: 'water', labels: { fr: 'Eau', en: 'Water', es: 'Agua', nl: 'Water' } },
];

const mealTimes = [
  { value: 'breakfast', labels: { fr: '🌅 Petit-déj', en: '🌅 Breakfast', es: '🌅 Desayuno', nl: '🌅 Ontbijt' }, startHour: 6, endHour: 10 },
  { value: 'lunch', labels: { fr: '🌞 Déjeuner', en: '🌞 Lunch', es: '🌞 Almuerzo', nl: '🌞 Lunch' }, startHour: 11, endHour: 14 },
  { value: 'snack', labels: { fr: '🍪 Goûter', en: '🍪 Snack', es: '🍪 Merienda', nl: '🍪 Snack' }, startHour: 15, endHour: 17 },
  { value: 'dinner', labels: { fr: '🌙 Dîner', en: '🌙 Dinner', es: '🌙 Cena', nl: '🌙 Diner' }, startHour: 18, endHour: 21 },
];

const foodDefaultQuantities: Record<string, number> = {
  puree: 50,
  fruit: 40,
  cereals: 30,
  yogurt: 80,
  vegetables: 60,
  water: 100,
};

function getRecommendedMealTime(): 'breakfast' | 'lunch' | 'snack' | 'dinner' {
  const hour = new Date().getHours();
  const meal = mealTimes.find((m) => hour >= m.startHour && hour < m.endHour);
  return (meal?.value as any) || 'lunch';
}

const typeMeta: Record<
  EntryType,
  {
    icon: keyof typeof Ionicons.glyphMap;
    tone: string;
    toneSoft: string;
  }
> = {
  feed: {
    icon: 'water-outline',
    tone: '#C9A227',
    toneSoft: 'rgba(201,162,39,0.16)',
  },
  food: {
    icon: 'restaurant-outline',
    tone: '#F0B85A',
    toneSoft: 'rgba(240,184,90,0.16)',
  },
  sleep: {
    icon: 'moon-outline',
    tone: '#58A6FF',
    toneSoft: 'rgba(88,166,255,0.16)',
  },
  diaper: {
    icon: 'happy-outline',
    tone: '#E74C3C',
    toneSoft: 'rgba(231,76,60,0.16)',
  },
  pump: {
    icon: 'water',
    tone: '#3FB950',
    toneSoft: 'rgba(63,185,80,0.16)',
  },
  measurement: {
    icon: 'resize-outline',
    tone: '#A371F7',
    toneSoft: 'rgba(163,113,247,0.16)',
  },
  medication: {
    icon: 'medkit-outline',
    tone: '#7CC2FF',
    toneSoft: 'rgba(124,194,255,0.16)',
  },
  milestone: {
    icon: 'sparkles-outline',
    tone: '#D9B97D',
    toneSoft: 'rgba(217,185,125,0.16)',
  },
  symptom: {
    icon: 'pulse-outline',
    tone: '#8EB5EA',
    toneSoft: 'rgba(142,181,234,0.16)',
  },
  temperature: {
    icon: 'thermometer-outline',
    tone: '#E74C3C',
    toneSoft: 'rgba(231,76,60,0.16)',
  },
  vaccine: {
    icon: 'medical-outline',
    tone: '#3FB950',
    toneSoft: 'rgba(63,185,80,0.16)',
  },
};

export default function EntryComposerScreen() {
  const { colors, theme } = useTheme();
  const { language } = useLocale();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ type?: string; id?: string; presetAmount?: string; presetMode?: string; presetSide?: string }>();
  const { entries, addEntry, updateEntry, deleteEntry, entryById } = useAppData();
  const { active: globalTimer, start: startGlobalTimer, stop: stopGlobalTimer, minimize: minimizeGlobalTimer } = useTimer();
  const toast = useToast();
  const type = (params.type as EntryType) || 'feed';
  const editing = params.id ? entryById(String(params.id)) : undefined;
  const presetAmount = typeof params.presetAmount === 'string' ? Number(params.presetAmount) : undefined;
  const presetMode = typeof params.presetMode === 'string' ? (params.presetMode as 'breast' | 'bottle') : undefined;
  const presetSide = typeof params.presetSide === 'string' ? params.presetSide : undefined;

  const [mode, setMode] = useState<'breast' | 'bottle'>('bottle');
  const [side, setSide] = useState('left');
  const [amountMl, setAmountMl] = useState('150');
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [durationMin, setDurationMin] = useState('30');
  const [pee, setPee] = useState('1');
  const [poop, setPoop] = useState('0');
  const [vomit, setVomit] = useState('0');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [headCircCm, setHeadCircCm] = useState('');
  const [tempC, setTempC] = useState('');
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [medIntervalHours, setMedIntervalHours] = useState('6');
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('sparkles');
  const [photoUri, setPhotoUri] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [caregiver, setCaregiver] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [sleepInputMode, setSleepInputMode] = useState<'timer' | 'manual' | null>(editing ? null : null);
  const [sleepTimerRunning, setSleepTimerRunning] = useState(false);
  const [sleepStopToken, setSleepStopToken] = useState(0);
  const [sleepStartedAt, setSleepStartedAt] = useState<number | null>(null);
  const [sleepElapsedSeconds, setSleepElapsedSeconds] = useState(0);
  const [sleepFullscreenVisible, setSleepFullscreenVisible] = useState(false);
  const [pumpTimerRunning, setPumpTimerRunning] = useState(false);
  const [pumpStartedAt, setPumpStartedAt] = useState<number | null>(null);
  const [pumpElapsedSeconds, setPumpElapsedSeconds] = useState(0);
  const [pumpFullscreenVisible, setPumpFullscreenVisible] = useState(false);
  const [largeTouchMode, setLargeTouchMode] = useState(false);
  const [savedMedicines, setSavedMedicines] = useState<SavedMedicine[]>([]);
  const [activeSleepDraft, setActiveSleepDraft] = useState<SleepDraft | null>(null);
  // Tracks the stable client-generated ID for the current sleep session,
  // either freshly minted (fresh timer) or carried over from a resumed draft.
  // Stored in the saved entry's payload so a save-then-crash-before-clearDraft
  // cycle cannot create duplicates on the next resume.
  const [sleepDraftClientId, setSleepDraftClientId] = useState<string | null>(null);
  const closeScale = useSharedValue(1);
  const closeRotate = useSharedValue(0);
  const closeAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: closeScale.value },
      { rotate: `${closeRotate.value}deg` },
    ],
  }));
  const actionsSlideY = useSharedValue(18);
  const actionsOpacity = useSharedValue(0);
  const actionsAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: actionsSlideY.value }],
    opacity: actionsOpacity.value,
  }));
  const [vaccineTemp, setVaccineTemp] = useState('');
  const [vaccineName, setVaccineName] = useState('');
  const [vaccineDose, setVaccineDose] = useState('1');
  const [vaccineNextDueDate, setVaccineNextDueDate] = useState(new Date());
  const [showReminderFlow, setShowReminderFlow] = useState(false);
  const [reminderStep, setReminderStep] = useState<'vaccine' | 'date'>('vaccine');
  const [reminderVaccineName, setReminderVaccineName] = useState('');
  const [reminderVaccineDate, setReminderVaccineDate] = useState(new Date());
  const [showMedicationReminderFlow, setShowMedicationReminderFlow] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);
  const [showSharePreview, setShowSharePreview] = useState(false);
  const shareCardRef = useRef<View>(null);
  const [reminderMedicationName, setReminderMedicationName] = useState('');
  const [reminderMedicationDate, setReminderMedicationDate] = useState(new Date());
  const [foodAllergies, setFoodAllergies] = useState<string[]>([]);
  const [foodLiked, setFoodLiked] = useState<'yes' | 'no' | 'neutral' | null>(null);
  const [amountEaten, setAmountEaten] = useState<'all' | 'half' | 'little' | 'none' | null>(null);
  const [mealTime, setMealTime] = useState<'breakfast' | 'lunch' | 'snack' | 'dinner' | ''>(type === 'food' && !editing ? getRecommendedMealTime() : '');
  const [showFoodDoneModal, setShowFoodDoneModal] = useState(false);
  const [lastSavedFood, setLastSavedFood] = useState<{ name: string; grams: string; mealTimeVal: string }>({ name: '', grams: '', mealTimeVal: '' });
  const [lastSavedFoodEntryId, setLastSavedFoodEntryId] = useState<string | null>(null);
  const [feedbackSelectedEmoji, setFeedbackSelectedEmoji] = useState<string | null>(null);
  const [foodMoreOpen, setFoodMoreOpen] = useState(false);
  const [quantityGrams, setQuantityGrams] = useState('');
  const meta = typeMeta[type];
  const typeLabel = typeLabelsI18n[type]?.[language] ?? typeLabelsI18n[type]?.en ?? type;
  const { profile, saveProfile } = useAuth();
  const recentMedicationEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.type === 'medication' && typeof (entry.payload as any)?.name === 'string')
        .slice(0, 5),
    [entries],
  );
  const recentFoodEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.type === 'food' && typeof (entry.payload as any)?.foodName === 'string')
        .slice(0, 4),
    [entries],
  );
  const todayFoodEntries = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return entries
      .filter((e) => e.type === 'food' && new Date(e.occurredAt) >= startOfDay)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [entries]);

  const foodPreferencesMap = useMemo(() => {
    const map: Record<string, { liked: number; neutral: number; disliked: number }> = {};
    entries
      .filter((entry) => entry.type === 'food' && (entry.payload as any)?.foodName)
      .forEach((entry) => {
        const foodName = (entry.payload as any).foodName;
        const liked = (entry.payload as any).foodLiked;
        if (!map[foodName]) {
          map[foodName] = { liked: 0, neutral: 0, disliked: 0 };
        }
        if (liked === 'yes') map[foodName].liked++;
        else if (liked === 'neutral') map[foodName].neutral++;
        else if (liked === 'no') map[foodName].disliked++;
      });
    return map;
  }, [entries]);
  const lastMeasurementEntry = useMemo(
    () => entries.find((entry) => entry.type === 'measurement'),
    [entries],
  );

  const seasonalRecommendations = useMemo(() => {
    return getSeasonalRecommendations();
  }, []);
  const medStatus = useMemo(() => {
    const currentName = name.trim().toLowerCase();
    if (!currentName) {
      return {
        label: language === 'fr' ? 'OK' : 'OK',
        text: language === 'fr' ? 'Choisissez un médicament pour voir le statut.' : 'Select a medicine to see status.',
        color: theme.green,
      };
    }
    const lastSame = entries.find(
      (entry) => entry.type === 'medication' && ((entry.payload as any)?.name ?? '').trim().toLowerCase() === currentName,
    );
    if (!lastSame) {
      return {
        label: language === 'fr' ? 'DUE' : 'DUE',
        text: language === 'fr' ? 'Aucune dose récente trouvée.' : 'No recent dose found.',
        color: theme.red,
      };
    }
    const intervalHours = Number(medIntervalHours) || 6;
    const hoursSince = (Date.now() - new Date(lastSame.occurredAt).getTime()) / 36e5;
    if (hoursSince >= intervalHours) {
      return {
        label: 'DUE',
        text: language === 'fr' ? 'Prochaine dose recommandée maintenant.' : 'Next dose recommended now.',
        color: theme.red,
      };
    }
    if (hoursSince >= Math.max(1, intervalHours - 2)) {
      return {
        label: 'SOON',
        text: language === 'fr' ? 'Dose bientôt possible.' : 'Dose will be due soon.',
        color: theme.yellow,
      };
    }
    return {
      label: 'OK',
      text: language === 'fr' ? 'Fenêtre de sécurité active.' : 'Safe interval active.',
      color: theme.green,
    };
  }, [entries, language, medIntervalHours, name, theme]);
  const nextDosePreview = useMemo(() => {
    if (!name.trim()) return '';
    const interval = Number(medIntervalHours) || 6;
    const lastSame = entries.find(
      (entry) => entry.type === 'medication' && ((entry.payload as any)?.name ?? '').trim().toLowerCase() === name.trim().toLowerCase(),
    );
    const baseTime = lastSame ? new Date(lastSame.occurredAt).getTime() : occurredAt.getTime();
    const nextAt = new Date(baseTime + interval * 60 * 60 * 1000);
    const locale = language === 'fr' ? 'fr-FR' : 'en-US';
    return `${nextAt.toLocaleDateString(locale)} ${nextAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;
  }, [entries, language, medIntervalHours, name, occurredAt]);
  const normalizedMedName = name.trim().toLowerCase();
  const existingSavedMedicine = useMemo(
    () => savedMedicines.find((item) => item.name.trim().toLowerCase() === normalizedMedName),
    [normalizedMedName, savedMedicines],
  );
  const isMedicationDirty = useMemo(() => {
    if (!existingSavedMedicine) return Boolean(name.trim());
    return (existingSavedMedicine.dosage ?? '').trim() !== dosage.trim();
  }, [dosage, existingSavedMedicine, name]);
  const medicationSuggestions = useMemo(() => {
    const query = name.trim().toLowerCase();
    if (!query) return [] as Array<{ name: string; dosage?: string }>;
    const fromSaved = savedMedicines.map((item) => ({ name: item.name, dosage: item.dosage }));
    const fromCommon = (commonMedications as Array<any>).map((item) => ({
      name: String(item.name),
      dosage: (getRecommendedDose(String(item.name)) || item.defaultDosage || '') as string,
    }));
    const merged = [...fromSaved, ...fromCommon].filter(
      (item, idx, arr) => arr.findIndex((x) => x.name.toLowerCase() === item.name.toLowerCase()) === idx,
    );
    return merged
      .filter((item) => item.name.toLowerCase().includes(query))
      .filter((item) => item.name.toLowerCase() !== query)
      .slice(0, 6);
  }, [name, savedMedicines, profile?.currentWeightKg]);

  function getRecommendedDose(medName: string) {
    const med = (commonMedications as Array<any>).find((item) => item.name.toLowerCase() === medName.trim().toLowerCase());
    if (!med) return '';
    const kg = Number(profile?.currentWeightKg ?? 0);
    if (Number.isFinite(kg) && kg > 0 && Array.isArray(med.dosingByKg)) {
      const byKg = med.dosingByKg.find((row: any) => kg <= Number(row.maxKg));
      if (byKg?.dosage) return byKg.dosage as string;
    }
    return med.defaultDosage ?? '';
  }

  useEffect(() => {
    if (!editing) return;
    setOccurredAt(new Date(editing.occurredAt));
    setNotes(editing.notes ?? '');
    setNotesOpen(Boolean(editing.notes));
    setCaregiver((editing.payload as any)?.caregiver ?? '');

    switch (editing.type) {
      case 'feed':
        setMode(editing.payload?.mode ?? 'bottle');
        setAmountMl(String(editing.payload?.amountMl ?? 150));
        setSide(editing.payload?.side ?? 'left');
        setDurationMin(String(editing.payload?.durationMin ?? 30));
        break;
      case 'food':
        setFoodName(editing.payload?.foodName ?? '');
        setQuantity(editing.payload?.quantity ?? '');
        setQuantityGrams(editing.payload?.quantityGrams ? String(editing.payload.quantityGrams) : '');
        setFoodAllergies((editing.payload?.foodAllergies as string[]) ?? []);
        setFoodLiked((editing.payload?.foodLiked as any) ?? null);
        setAmountEaten((editing.payload?.amountEaten as any) ?? null);
        setMealTime((editing.payload?.mealTime as any) ?? '');
        break;
      case 'sleep':
      case 'pump':
        setDurationMin(String(editing.payload?.durationMin ?? 30));
        if (editing.type === 'pump') {
          setAmountMl(String(editing.payload?.amountMl ?? 120));
        }
        break;
      case 'diaper':
        setPee(String(editing.payload?.pee ?? 0));
        setPoop(String(editing.payload?.poop ?? 0));
        setVomit(String(editing.payload?.vomit ?? 0));
        break;
      case 'measurement':
        setWeightKg(editing.payload?.weightKg ? String(editing.payload.weightKg) : '');
        setHeightCm(editing.payload?.heightCm ? String(editing.payload.heightCm) : '');
        setHeadCircCm(editing.payload?.headCircCm ? String(editing.payload.headCircCm) : '');
        setTempC(editing.payload?.tempC ? String(editing.payload.tempC) : '');
        break;
      case 'medication':
        setName(editing.payload?.name ?? '');
        setDosage(editing.payload?.dosage ?? '');
        break;
      case 'milestone':
        setTitle(editing.payload?.title ?? '');
        setIcon(editing.payload?.icon ?? 'sparkles');
        setPhotoUri(editing.payload?.photoUri ?? '');
        break;
      case 'symptom':
        setSymptoms((editing.payload as any)?.tags ?? ((editing.payload?.notes ?? '') as string).split(',').map((value) => value.trim()).filter(Boolean));
        break;
      case 'temperature':
        setVaccineTemp(editing.payload?.tempC ? String(editing.payload.tempC) : '');
        break;
      case 'vaccine':
        setVaccineName(editing.payload?.vaccineName ?? '');
        setVaccineDose(String(editing.payload?.vaccineDose ?? 1));
        if (editing.payload?.vaccineNextDueDate) {
          setVaccineNextDueDate(new Date(editing.payload.vaccineNextDueDate));
        }
        break;
    }
  }, [editing]);

  // On mount for a new sleep entry: check if a previous session was left open
  // (e.g. after a browser-tab kill or page reload). The draft is preserved in
  // AsyncStorage and expires after 24 h.
  useEffect(() => {
    if (type !== 'sleep' || editing) return;
    void getSleepDraft().then((draft) => {
      if (draft) setActiveSleepDraft(draft);
    });
  }, [editing, type]);

  // Re-render the recovery banner every 30 s so the displayed elapsed time
  // stays accurate while the parent looks at it.
  const [, setDraftClock] = useState(0);
  useEffect(() => {
    if (!activeSleepDraft) return;
    const tick = setInterval(() => setDraftClock((current) => current + 1), 30_000);
    return () => clearInterval(tick);
  }, [activeSleepDraft]);

  // Persist notes typed during a running sleep timer back into the draft so
  // they survive a page reload. Debounced 1 s to avoid hammering AsyncStorage
  // on every keystroke. Only runs for the active timer session (clientId set).
  useEffect(() => {
    if (type !== 'sleep' || !sleepTimerRunning || !sleepDraftClientId || sleepStartedAt === null) return;
    const handle = setTimeout(() => {
      void saveSleepDraft({
        clientId: sleepDraftClientId,
        startedAt: sleepStartedAt,
        occurredAt: new Date(sleepStartedAt).toISOString(),
        notes,
      });
    }, 1000);
    return () => clearTimeout(handle);
  }, [notes, sleepTimerRunning, sleepDraftClientId, sleepStartedAt, type]);

  // Cross-tab sync (web only). AsyncStorage maps to localStorage on web, and
  // the browser fires a 'storage' event in OTHER tabs whenever a key changes.
  // We use that to keep two tabs in sync: if Tab B saves/discards the draft,
  // Tab A's UI catches up instead of acting on stale state.
  useEffect(() => {
    if (Platform.OS !== 'web' || type !== 'sleep') return;
    const win = globalThis as any;
    if (typeof win.addEventListener !== 'function') return;
    const handler = (event: any) => {
      if (event?.key !== 'appleo.sleepDraft') return;
      void getSleepDraft().then((draft) => {
        setActiveSleepDraft(draft);
        // Our running timer's session was finalised by another tab — wind
        // down gracefully so the user doesn't sit in front of a phantom
        // timer that no longer corresponds to any persisted state.
        if (sleepTimerRunning && sleepDraftClientId && !draft) {
          toast.info(
            language === 'fr' ? 'Sommeil enregistré depuis un autre onglet.'
            : language === 'es' ? 'Sueño guardado desde otra pestaña.'
            : language === 'nl' ? 'Slaap opgeslagen vanuit een ander tabblad.'
            : 'Sleep saved from another tab.',
          );
          setSleepTimerRunning(false);
          setSleepFullscreenVisible(false);
          setSleepStartedAt(null);
          setSleepDraftClientId(null);
          router.back();
        }
      });
    };
    win.addEventListener('storage', handler);
    return () => win.removeEventListener?.('storage', handler);
  }, [type, sleepTimerRunning, sleepDraftClientId, toast, language]);

  useEffect(() => {
    actionsSlideY.value = withTiming(0, { duration: 220 });
    actionsOpacity.value = withTiming(1, { duration: 220 });
  }, []);

  useEffect(() => {
    (async () => {
      const settings = await getAppSettings();
      setLargeTouchMode(settings.largeTouchMode);
      setSavedMedicines(await getSavedMedicines());
    })();
  }, []);

  useEffect(() => {
    if (editing) return;
    if (presetAmount && Number.isFinite(presetAmount)) setAmountMl(String(presetAmount));
    if (presetMode) setMode(presetMode);
    if (presetSide) setSide(presetSide);
    // Default the "logged by" field to the primary caregiver. Parent can still
    // switch to the partner via the Segment shown in the form when both names
    // are filled in on the profile.
    if (!caregiver && profile?.caregiverName) setCaregiver(profile.caregiverName);
  }, [editing, presetAmount, presetMode, presetSide, caregiver, profile?.caregiverName]);

  useEffect(() => {
    // Guard: do not auto-start if startedAt is already set — that means either
    // (a) the user just resumed from a saved draft, or (b) the effect re-fired
    // due to a dep change but the timer is already running.
    if (type !== 'sleep' || editing || sleepInputMode !== 'timer' || sleepStartedAt !== null) return;
    const startAt = Date.now();
    const clientId = globalThis.crypto?.randomUUID?.() ?? `sleep_${startAt}_${Math.random().toString(36).slice(2, 8)}`;
    setSleepStartedAt(startAt);
    setSleepElapsedSeconds(0);
    setSleepFullscreenVisible(true);
    setSleepTimerRunning(true);
    // Align occurredAt with the actual timer start time, not the time the form
    // mounted. Critical: when the entry is saved, occurredAt is what shows in
    // the history as "when the sleep started".
    setOccurredAt(new Date(startAt));
    setSleepDraftClientId(clientId);
    // Persist the draft immediately so the start time survives a page reload
    // or browser-tab kill during a long sleep session.
    void saveSleepDraft({ clientId, startedAt: startAt, occurredAt: new Date(startAt).toISOString(), notes: '' });
  }, [editing, type, sleepInputMode, sleepStartedAt]);

  useEffect(() => {
    if (type !== 'sleep' || !sleepTimerRunning || !sleepStartedAt) return;
    const timer = setInterval(() => {
      setSleepElapsedSeconds(Math.max(0, Math.floor((Date.now() - sleepStartedAt) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [sleepStartedAt, sleepTimerRunning, type]);

  useEffect(() => {
    if (type !== 'pump' || editing) return;
    const startAt = Date.now();
    setPumpStartedAt(startAt);
    setPumpElapsedSeconds(0);
    setPumpFullscreenVisible(true);
    setPumpTimerRunning(true);
  }, [editing, type]);

  useEffect(() => {
    if (type !== 'pump' || !pumpTimerRunning || !pumpStartedAt) return;
    const timer = setInterval(() => {
      setPumpElapsedSeconds(Math.max(0, Math.floor((Date.now() - pumpStartedAt) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [pumpStartedAt, pumpTimerRunning, type]);

  useEffect(() => {
    if (type === 'sleep' && sleepTimerRunning && sleepStartedAt) {
      if (globalTimer?.kind !== 'sleep') startGlobalTimer('sleep', undefined, sleepStartedAt);
    } else if (type === 'sleep' && !sleepTimerRunning && globalTimer?.kind === 'sleep') {
      stopGlobalTimer();
    }
  }, [sleepTimerRunning, sleepStartedAt, type, globalTimer?.kind, startGlobalTimer, stopGlobalTimer]);

  useEffect(() => {
    if (type === 'pump' && pumpTimerRunning && pumpStartedAt) {
      if (globalTimer?.kind !== 'pump') startGlobalTimer('pump', undefined, pumpStartedAt);
    } else if (type === 'pump' && !pumpTimerRunning && globalTimer?.kind === 'pump') {
      stopGlobalTimer();
    }
  }, [pumpTimerRunning, pumpStartedAt, type, globalTimer?.kind, startGlobalTimer, stopGlobalTimer]);

  useEffect(() => {
    if (type === 'sleep' && sleepTimerRunning) {
      setSleepFullscreenVisible(globalTimer?.kind === 'sleep' && !globalTimer.minimized);
    }
  }, [globalTimer?.kind, globalTimer?.minimized, sleepTimerRunning, type]);

  useEffect(() => {
    if (type === 'pump' && pumpTimerRunning) {
      setPumpFullscreenVisible(globalTimer?.kind === 'pump' && !globalTimer.minimized);
    }
  }, [globalTimer?.kind, globalTimer?.minimized, pumpTimerRunning, type]);

  useEffect(() => {
    if (type !== 'food' || editing || !foodName || quantityGrams) return;
    const selectedPreset = foodPresets.find((p) => p.value === foodName || Object.values(p.labels).includes(foodName));
    const resolvedCategory: FoodCategory = selectedPreset
      ? (selectedPreset.value as FoodCategory)
      : inferCategoryFromName(foodName);
    if (resolvedCategory === 'other') return;
    const sug = suggestFoodQuantities({
      entries,
      babyBirthDate: profile?.babyBirthDate ?? null,
      category: resolvedCategory,
      foodName,
      mealTime: mealTime || undefined,
    });
    if (sug.usualAmount) {
      setQuantityGrams(String(sug.usualAmount));
    }
  }, [foodName, editing, type, quantityGrams, profile?.babyBirthDate, entries, mealTime]);

  function resetFoodForm() {
    setFoodName('');
    setQuantityGrams('');
    setFoodLiked(null);
    setAmountEaten(null);
    setFoodAllergies([]);
    setMealTime(getRecommendedMealTime());
    setNotes('');
    setOccurredAt(new Date());
    setFeedbackSelectedEmoji(null);
    setLastSavedFoodEntryId(null);
    setFoodMoreOpen(false);
  }

  function buildPayload(durationMinOverride?: number): EntryPayload {
    const resolvedDuration = durationMinOverride ?? (Number(durationMin) || 0);
    switch (type) {
      case 'feed':
        return mode === 'bottle'
          ? { mode: 'bottle', amountMl: Number(amountMl) || 0, notes }
          : { mode: 'breast', side: side as BreastSide, durationMin: resolvedDuration, amountMl: Number(amountMl) || 0, notes };
      case 'food': {
        const foodPayload: Record<string, unknown> = { foodName, quantity, notes };
        if (quantityGrams) foodPayload.quantityGrams = Number(quantityGrams);
        if (foodAllergies.length > 0) foodPayload.foodAllergies = foodAllergies;
        if (foodLiked) foodPayload.foodLiked = foodLiked;
        if (amountEaten) foodPayload.amountEaten = amountEaten;
        if (mealTime) foodPayload.mealTime = mealTime;
        const resolvedCategory: FoodCategory = inferCategoryFromName(foodName);
        if (resolvedCategory !== 'other') foodPayload.foodCategory = resolvedCategory;
        return foodPayload as EntryPayload;
      }
      case 'sleep':
        // clientId travels with the saved entry so a subsequent draft-resume
        // can detect that this exact sleep session was already saved and
        // refuse to re-save it (prevents duplicates after a save-then-crash).
        return sleepDraftClientId
          ? { durationMin: resolvedDuration, notes, clientId: sleepDraftClientId }
          : { durationMin: resolvedDuration, notes };
      case 'diaper':
        return {
          pee: clamp(Number(pee) || 0, 0, 9),
          poop: clamp(Number(poop) || 0, 0, 9),
          vomit: clamp(Number(vomit) || 0, 0, 9),
          notes,
        };
      case 'pump':
        return { durationMin: resolvedDuration, amountMl: Number(amountMl) || 0, notes };
      case 'measurement':
        return {
          weightKg: weightKg ? Number(weightKg) : undefined,
          heightCm: heightCm ? Number(heightCm) : undefined,
          headCircCm: headCircCm ? Number(headCircCm) : undefined,
          tempC: tempC ? Number(tempC) : undefined,
          notes,
        };
      case 'medication':
        return { name, dosage, notes };
      case 'milestone':
        return { title: title || 'Milestone', icon, photoUri: photoUri || undefined, notes };
      case 'symptom':
        return { notes, tags: symptoms };
      case 'temperature':
        return { tempC: vaccineTemp ? Number(vaccineTemp) : undefined, notes };
      case 'vaccine':
        return {
          vaccineName,
          vaccineDose: Number(vaccineDose) || 1,
          vaccineNextDueDate: vaccineNextDueDate.toISOString(),
          notes,
        };
    }
  }

  function buildTitle() {
    switch (type) {
      case 'feed':
        return mode === 'bottle' ? t('entry.titleFeedBottle') : t('entry.titleFeedBreast');
      case 'food':
        return foodName || t('entry.titleFoodDefault');
      case 'sleep':
        return t('entry.titleSleep');
      case 'diaper':
        return t('diaper.title');
      case 'pump':
        return t('entry.titlePump');
      case 'measurement':
        return t('entry.measurement');
      case 'medication':
        return name || t('entry.medicine');
      case 'milestone':
        return title || t('entry.titleMilestone');
      case 'symptom':
        return t('entry.symptoms');
      case 'temperature':
        return vaccineTemp ? `${t('entry.temperature')}: ${vaccineTemp}°C` : t('entry.titleTemperatureReading');
      case 'vaccine':
        return vaccineName || t('entry.vaccine');
    }
  }

  // The most common case: parent wakes up and just wants to mark the sleep
  // as ended at the current time. This skips the Resume→Stop dance entirely
  // and saves the entry directly with the elapsed duration. Uses the draft
  // values directly (not component state) to avoid React state-batching
  // timing issues — handleSave's buildPayload closure would otherwise see
  // a stale sleepDraftClientId on this same tick.
  async function endSleepDraftNow(draft: SleepDraft) {
    const alreadySaved = entries.some(
      (entry) => entry.type === 'sleep' && (entry.payload as any)?.clientId === draft.clientId,
    );
    if (alreadySaved) {
      await clearSleepDraft();
      setActiveSleepDraft(null);
      router.back();
      return;
    }
    setSaving(true);
    try {
      const elapsedMinutes = Math.max(1, Math.round((Date.now() - draft.startedAt) / 60000));
      await addEntry({
        type: 'sleep',
        title: t('entry.titleSleep'),
        notes: draft.notes,
        occurredAt: new Date(draft.startedAt).toISOString(),
        payload: { durationMin: elapsedMinutes, notes: draft.notes, clientId: draft.clientId },
      });
      await clearSleepDraft();
      setActiveSleepDraft(null);
      haptics.success();
      router.back();
    } catch (error: any) {
      haptics.error();
      toast.error(error?.message ?? 'Could not save this record.');
    } finally {
      setSaving(false);
    }
  }

  // Discarding a draft at 3 AM by accident would lose hours of tracking, so
  // require an explicit confirmation before clearing it.
  function confirmDiscardSleepDraft() {
    const title =
      language === 'fr' ? 'Abandonner la session ?'
      : language === 'es' ? '¿Descartar sesión?'
      : language === 'nl' ? 'Sessie verwijderen?'
      : 'Discard this session?';
    const message =
      language === 'fr' ? 'Le temps de sommeil enregistré sera définitivement perdu.'
      : language === 'es' ? 'El tiempo de sueño registrado se perderá definitivamente.'
      : language === 'nl' ? 'De geregistreerde slaaptijd gaat definitief verloren.'
      : 'The recorded sleep time will be permanently lost.';
    const cancelLabel =
      language === 'fr' ? 'Annuler' : language === 'es' ? 'Cancelar' : language === 'nl' ? 'Annuleren' : 'Cancel';
    const discardLabel = t('entry.sleepDraftDiscard');
    const doDiscard = async () => {
      await clearSleepDraft();
      setActiveSleepDraft(null);
      setSleepDraftClientId(null);
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(message)) {
        void doDiscard();
      }
      return;
    }
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel' },
        { text: discardLabel, style: 'destructive', onPress: () => void doDiscard() },
      ],
      { cancelable: true },
    );
  }

  // Restore a persisted sleep draft (e.g. after page reload or tab kill).
  // Sets the timer back to the original startedAt so elapsed time is correct,
  // and aligns occurredAt with the sleep's real start time — otherwise the
  // saved entry would be timestamped at the moment of save (hours after the
  // sleep actually started).
  function resumeSleepDraft(draft: SleepDraft) {
    setSleepStartedAt(draft.startedAt);
    setSleepElapsedSeconds(Math.max(0, Math.floor((Date.now() - draft.startedAt) / 1000)));
    setSleepTimerRunning(true);
    setSleepFullscreenVisible(true);
    setSleepInputMode('timer');
    setOccurredAt(new Date(draft.startedAt));
    setSleepDraftClientId(draft.clientId);
    if (draft.notes) setNotes(draft.notes);
    setActiveSleepDraft(null);
  }

  async function handleSave(durationMinOverride?: number) {
    setSaving(true);
    try {
      const timestamp = occurredAt.toISOString();
      const basePayload = buildPayload(durationMinOverride);
      // Tag every payload with who logged it, when the parent has set both a
      // caregiver and a partner name on their profile. We always write to
      // payload (rather than a separate field on the entry) so existing
      // entries without it remain valid.
      const payload: EntryPayload = caregiver
        ? { ...basePayload, caregiver }
        : basePayload;
      const titleValue = buildTitle();
      const savedEntry = {
        id: editing?.id ?? `tmp_${Date.now()}`,
        type,
        title: titleValue,
        notes,
        occurredAt: timestamp,
        payload,
      } as any;

      let savedEntryId = editing?.id ?? '';
      if (editing) {
        await updateEntry(editing.id, { type, title: titleValue, notes, occurredAt: timestamp, payload } as any);
      } else {
        savedEntryId = await addEntry({ type, title: titleValue, notes, occurredAt: timestamp, payload });
      }
      if (type === 'medication' && name.trim()) {
        setSavedMedicines(await upsertSavedMedicine({ name, dosage }));
        const reminderEntry = {
          id: editing?.id ?? `med_${Date.now()}`,
          type,
          title: titleValue,
          notes,
          occurredAt: timestamp,
          payload,
        } as any;
        await scheduleMedicationReminder(reminderEntry, profile?.babyName ?? 'Baby', Number(medIntervalHours) || 6);
      }

      haptics.success();

      // Food: show "Add another / Go Home" modal instead of share prompt
      if (type === 'food' && !editing) {
        setLastSavedFoodEntryId(savedEntryId);
        setLastSavedFood({ name: foodName, grams: quantityGrams, mealTimeVal: mealTime || getRecommendedMealTime() });
        setFeedbackSelectedEmoji(null);
        setSaving(false);
        setShowFoodDoneModal(true);
        return;
      }

      // Sleep success path: clear the persisted draft only after save is
      // confirmed AND only if this save was tied to a timer session. A manual
      // "Log past sleep" save with sleepDraftClientId === null must NOT touch
      // an unrelated draft (the user may have an active timer they want to
      // resume later).
      if (type === 'sleep' && !editing && sleepDraftClientId) {
        void clearSleepDraft();
      }

      router.back();
    } catch (error: any) {
      haptics.error();
      toast.error(error?.message ?? 'Could not save this record.');
    } finally {
      setSaving(false);
    }
  }

  // Returns true if this exact sleep session was already saved (matched by
  // clientId in the entry's payload). Prevents duplicates if a crash between
  // addEntry and clearSleepDraft left a stale draft for the user to resume.
  function isSleepDraftAlreadySaved() {
    if (!sleepDraftClientId) return false;
    return entries.some(
      (entry) => entry.type === 'sleep' && (entry.payload as any)?.clientId === sleepDraftClientId,
    );
  }

  async function handlePrimarySave() {
    if (type === 'sleep' && sleepTimerRunning && sleepStartedAt) {
      const elapsedMinutes = Math.max(1, Math.round((Date.now() - sleepStartedAt) / 60000));
      setSleepStopToken((current) => current + 1);
      setSleepTimerRunning(false);
      setDurationMin(String(elapsedMinutes));
      if (isSleepDraftAlreadySaved()) {
        void clearSleepDraft();
        router.back();
        return;
      }
      await handleSave(elapsedMinutes);
      return;
    }
    await handleSave();
  }

  // Quietly drop the in-flight timer without saving an entry — the escape
  // hatch for the "I tapped Start by accident" case. Inside the first 2
  // minutes we skip confirmation (almost certainly a misstap); after that
  // we confirm because real sleep tracking might be at risk.
  async function handleSleepTimerCancel() {
    const elapsedMs = sleepStartedAt ? Date.now() - sleepStartedAt : 0;
    const doCancel = async () => {
      setSleepTimerRunning(false);
      setSleepFullscreenVisible(false);
      setSleepStartedAt(null);
      setSleepDraftClientId(null);
      setSleepInputMode(null);
      setActiveSleepDraft(null);
      await clearSleepDraft();
    };
    if (elapsedMs < 2 * 60 * 1000) {
      await doCancel();
      return;
    }
    const title =
      language === 'fr' ? 'Annuler le minuteur ?'
      : language === 'es' ? '¿Cancelar el temporizador?'
      : language === 'nl' ? 'Timer annuleren?'
      : 'Cancel timer?';
    const message =
      language === 'fr' ? "Le temps de sommeil en cours ne sera pas enregistré."
      : language === 'es' ? 'El tiempo de sueño en curso no se guardará.'
      : language === 'nl' ? 'De lopende slaaptijd wordt niet opgeslagen.'
      : 'The current sleep time will not be saved.';
    const keepLabel =
      language === 'fr' ? 'Garder' : language === 'es' ? 'Mantener' : language === 'nl' ? 'Behouden' : 'Keep';
    const cancelLabel =
      language === 'fr' ? 'Annuler' : language === 'es' ? 'Cancelar' : language === 'nl' ? 'Annuleren' : 'Cancel';
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(message)) void doCancel();
      return;
    }
    Alert.alert(
      title,
      message,
      [
        { text: keepLabel, style: 'cancel' },
        { text: cancelLabel, style: 'destructive', onPress: () => void doCancel() },
      ],
      { cancelable: true },
    );
  }

  async function handleSleepStop() {
    if (!sleepStartedAt) return;
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - sleepStartedAt) / 60000));
    setDurationMin(String(elapsedMinutes));
    setSleepTimerRunning(false);
    setSleepFullscreenVisible(false);
    if (isSleepDraftAlreadySaved()) {
      void clearSleepDraft();
      router.back();
      return;
    }
    await handleSave(elapsedMinutes);
  }

  async function handlePumpStop() {
    if (!pumpStartedAt) return;
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - pumpStartedAt) / 60000));
    setDurationMin(String(elapsedMinutes));
    setPumpTimerRunning(false);
    setPumpFullscreenVisible(false);
    await handleSave(elapsedMinutes);
  }

  async function handleSaveReminder() {
    if (!reminderVaccineName.trim()) {
      haptics.warning();
      toast.warning(
        language === 'fr' ? 'Sélectionnez ou entrez un nom de vaccin.' : 'Please select or enter a vaccine name.'
      );
      return;
    }

    setSaving(true);
    try {
      const timestamp = reminderVaccineDate.toISOString();
      const payload = {
        vaccineName: reminderVaccineName,
        vaccineDose: 1,
        vaccineNextDueDate: reminderVaccineDate.toISOString(),
        hasReminder: true,
      };

      await addEntry({
        type: 'vaccine',
        title: reminderVaccineName,
        occurredAt: timestamp,
        payload,
      });

      // Schedule the reminder notification
      try {
        await scheduleVaccineReminder(reminderVaccineName, reminderVaccineDate.toISOString(), profile?.babyName ?? 'Baby');
      } catch (error) {
        console.error('Failed to schedule vaccine reminder:', error);
      }

      haptics.success();
      toast.success(
        language === 'fr'
          ? `Rappel créé : ${reminderVaccineName} (7 jours avant).`
          : `Reminder created: ${reminderVaccineName} (7 days before).`
      );

      setShowReminderFlow(false);
      setReminderStep('vaccine');
      setReminderVaccineName('');
      setReminderVaccineDate(new Date());
      router.back();
    } catch (error: any) {
      haptics.error();
      toast.error(error?.message ?? 'Could not save this record.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!editing) return;
    const confirmTitle = language === 'fr' ? 'Supprimer ?' : language === 'es' ? '¿Eliminar?' : language === 'nl' ? 'Verwijderen?' : 'Delete?';
    const confirmMsg = language === 'fr' ? 'Cette action est irréversible.' : language === 'es' ? 'Esta acción no se puede deshacer.' : language === 'nl' ? 'Deze actie is onomkeerbaar.' : 'This cannot be undone.';
    const cancelLabel = language === 'fr' ? 'Annuler' : language === 'es' ? 'Cancelar' : language === 'nl' ? 'Annuleren' : 'Cancel';
    const deleteLabel = language === 'fr' ? 'Supprimer' : language === 'es' ? 'Eliminar' : language === 'nl' ? 'Verwijderen' : 'Delete';
    const runDelete = async () => {
      await deleteEntry(editing.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm(confirmMsg)) {
        void runDelete();
      }
      return;
    }
    Alert.alert(confirmTitle, confirmMsg, [
      { text: cancelLabel, style: 'cancel' },
      { text: deleteLabel, style: 'destructive', onPress: () => void runDelete() },
    ], { cancelable: true });
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
    <View style={{ flex: 1 }}>
    <Page contentStyle={{ paddingBottom: 80 }}>
      <View style={[styles.heroCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroLeftContent}>
            <View style={[styles.heroIcon, { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}>
              <Ionicons name={meta.icon} size={28} color={meta.tone} />
            </View>
            <Text style={[styles.heroEyebrow, { color: colors.muted }]}>{t('entry.composer')}</Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>{typeLabel}</Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            onPressIn={() => {
              closeScale.value = withSpring(0.88, { damping: 10, stiffness: 300 });
              closeRotate.value = withTiming(45, { duration: 180 });
            }}
            onPressOut={() => {
              closeScale.value = withSpring(1, { damping: 8, stiffness: 200 });
              closeRotate.value = withSpring(0, { damping: 8, stiffness: 200 });
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Animated.View style={[styles.closeButton, closeAnimStyle, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="close" size={20} color={colors.text} />
            </Animated.View>
          </Pressable>
        </View>
      </View>

      <Card>
        <View style={styles.sectionCard}>
          <DateTimeField label={t('entry.when')} value={occurredAt} onChange={setOccurredAt} />
        </View>

        {/* "Logged by" — only shown when both names are set on the profile.
            Surfaces partnerName so it actually has a use; otherwise the
            entry simply records the primary caregiver implicitly. */}
        {profile?.caregiverName && profile?.partnerName ? (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('entry.loggedBy')}</Text>
            <Segment
              value={caregiver || profile.caregiverName}
              onChange={(value) => setCaregiver(value)}
              options={[
                { label: profile.caregiverName, value: profile.caregiverName },
                { label: profile.partnerName, value: profile.partnerName },
              ]}
            />
          </View>
        ) : null}

        {type === 'feed' && (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('entry.type')}</Text>
            <Segment
              value={mode}
              onChange={(value) => setMode(value as 'breast' | 'bottle')}
              options={[
                { label: t('entry.breast'), value: 'breast' },
                { label: t('entry.bottle'), value: 'bottle' },
              ]}
            />
            {mode === 'bottle' ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>{t('entry.amount')}</Text>
                <View style={styles.chipRow}>
                  <Pressable onPress={() => setAmountMl('150')} style={[styles.quickChip, { borderColor: colors.border, backgroundColor: colors.card }, amountMl === '150' && { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}>
                    <Text style={[styles.quickChipText, { color: colors.text }, amountMl === '150' && { color: meta.tone, fontWeight: '900' }]}>150</Text>
                  </Pressable>
                  <Pressable onPress={() => setAmountMl('180')} style={[styles.quickChip, { borderColor: colors.border, backgroundColor: colors.card }, amountMl === '180' && { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}>
                    <Text style={[styles.quickChipText, { color: colors.text }, amountMl === '180' && { color: meta.tone, fontWeight: '900' }]}>180</Text>
                  </Pressable>
                  <Pressable onPress={() => setAmountMl('240')} style={[styles.quickChip, { borderColor: colors.border, backgroundColor: colors.card }, amountMl === '240' && { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}>
                    <Text style={[styles.quickChipText, { color: colors.text }, amountMl === '240' && { color: meta.tone, fontWeight: '900' }]}>240</Text>
                  </Pressable>
                </View>
                <QuantityPicker value={Number(amountMl) || 0} onChange={(value) => setAmountMl(String(value))} largeTouchMode={largeTouchMode} />
              </>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>{t('entry.duration')}</Text>
                <TimerWidget
                  label={t('entry.durationMin')}
                  valueMinutes={Number(durationMin) || 0}
                  onChangeMinutes={(minutes) => setDurationMin(String(minutes))}
                  allowSides
                  side={side as 'left' | 'right' | 'both'}
                  onSideChange={(nextSide) => setSide(nextSide)}
                  largeTouchMode={largeTouchMode}
                />
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>{t('entry.estimatedAmount')}</Text>
                <QuantityPicker value={Number(amountMl) || 0} onChange={(value) => setAmountMl(String(value))} largeTouchMode={largeTouchMode} />
              </>
            )}
          </View>
        )}

        {type === 'food' && (() => {
          const lang = language as 'fr' | 'en' | 'es' | 'nl';
          const getFoodLabel = (preset: typeof foodPresets[number]) => preset.labels[lang] ?? preset.labels.en;
          const selectedPreset = foodPresets.find((p) => p.value === foodName || Object.values(p.labels).includes(foodName));
          const isFirstTry = foodName.trim().length > 0 && !foodPreferencesMap[foodName];
          const resolvedCategory: FoodCategory = selectedPreset
            ? (selectedPreset.value as FoodCategory)
            : inferCategoryFromName(foodName);
          const suggestion = suggestFoodQuantities({
            entries,
            babyBirthDate: profile?.babyBirthDate ?? null,
            category: resolvedCategory,
            foodName,
            mealTime: mealTime || undefined,
          });
          const chipKindLabel: Record<QuantityChip['kind'], string> = {
            last: t('food.chipLast'),
            usual: t('food.chipUsual'),
            less: t('food.chipLess'),
            more: t('food.chipMore'),
            baseline: t('food.chipUsual'),
          };
          const suggestionRationale =
            suggestion.source === 'foodName' || suggestion.source === 'category'
              ? t('food.suggestionFromHistory')
              : suggestion.source === 'categoryMeal'
              ? t('food.suggestionFromMeal')
              : suggestion.source === 'age'
              ? t('food.suggestionFromAge')
              : '';
          const reactionOptions = [
            { emoji: '🤧', value: 'allergy', labels: { fr: 'Allergie', en: 'Allergy', es: 'Alergia', nl: 'Allergie' } },
            { emoji: '😬', value: 'intolerance', labels: { fr: 'Intolérance', en: 'Intolerance', es: 'Intolerancia', nl: 'Intolerantie' } },
            { emoji: '🔴', value: 'rash', labels: { fr: 'Éruption', en: 'Rash', es: 'Erupción', nl: 'Uitslag' } },
            { emoji: '🤮', value: 'vomit', labels: { fr: 'Vomissement', en: 'Vomit', es: 'Vómito', nl: 'Braken' } },
            { emoji: '💩', value: 'diarrhea', labels: { fr: 'Diarrhée', en: 'Diarrhea', es: 'Diarrea', nl: 'Diarree' } },
          ];
          const mealTimeIcons: Record<string, string> = { breakfast: '🌅', lunch: '🌞', snack: '🍪', dinner: '🌙' };
          const moreLabel = { fr: 'Réaction, allergie…', en: 'Reaction, allergy…', es: 'Reacción, alergia…', nl: 'Reactie, allergie…' };
          const lessLabel = { fr: 'Masquer', en: 'Hide', es: 'Ocultar', nl: 'Verbergen' };
          const activeMealTime = mealTime || getRecommendedMealTime();
          const qtyStep = suggestion.unit === 'ml' ? 10 : 5;

          return (
            <View style={styles.sectionCard}>

              {/* Row 1a: today count badge */}
              {!editing && (
                <View style={{ marginBottom: 6 }}>
                  <View style={[styles.todayCountBadge, { backgroundColor: `${meta.tone}18`, borderColor: `${meta.tone}40`, alignSelf: 'flex-start' }]}>
                    <Text style={{ color: meta.tone, fontSize: 11, fontWeight: '700' }}>
                      {todayFoodEntries.length === 0
                        ? t('food.firstMeal')
                        : `${todayFoodEntries.length} ${todayFoodEntries.length > 1 ? t('food.mealsCount') : t('food.mealCountOne')}`}
                    </Text>
                  </View>
                </View>
              )}

              {/* Row 1b: Meal time segmented selector — labeled, language-aware */}
              <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
                {t('food.mealLabel')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 5, marginBottom: 14 }}>
                {mealTimes.map((meal) => {
                  const active = activeMealTime === meal.value;
                  const fullLabel = meal.labels[lang] ?? meal.labels.en;
                  return (
                    <Pressable
                      key={meal.value}
                      onPress={() => setMealTime(mealTime === meal.value ? '' : meal.value as any)}
                      style={({ pressed }) => ({
                        flex: 1,
                        paddingHorizontal: 6,
                        paddingVertical: 9,
                        borderRadius: 10,
                        minHeight: 42,
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        borderWidth: active ? 2 : 1,
                        borderColor: active ? meta.tone : colors.border,
                        backgroundColor: active ? meta.toneSoft : pressed ? `${colors.card}88` : 'transparent',
                        transform: [{ scale: pressed ? 0.96 : 1 }],
                      })}
                    >
                      <Text style={{ fontSize: 14, lineHeight: 18 }}>{mealTimeIcons[meal.value]}</Text>
                      <Text style={{ fontSize: 10, fontWeight: active ? '800' : '500', color: active ? meta.tone : colors.muted, textAlign: 'center' }}>
                        {fullLabel.replace(/^\S+\s*/, '')}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Row 2: first-try badge + food name input (hero) */}
              {isFirstTry && (
                <Text style={{ color: meta.tone, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                  {t('food.firstTry')}
                </Text>
              )}
              <Input
                label={t('food.foodLabel2')}
                value={foodName}
                onChangeText={setFoodName}
                placeholder={lang === 'fr' ? 'Pomme, compote, quinoa…' : lang === 'es' ? 'Manzana, compota…' : lang === 'nl' ? 'Appel, compote…' : 'Apple, compote, quinoa…'}
              />

              {/* Row 3: Preset chips (compact icon + label) */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                {foodPresets.map((preset) => {
                  const active = selectedPreset?.value === preset.value;
                  return (
                    <Pressable
                      key={preset.value}
                      onPress={() => setFoodName(active ? '' : preset.value)}
                      style={[styles.foodPresetPill, { borderColor: colors.border, backgroundColor: colors.card }, active && { backgroundColor: meta.toneSoft, borderColor: meta.tone, borderWidth: 2 }]}
                    >
                      <Text style={{ fontSize: 14 }}>{preset.icon}</Text>
                      <Text style={[styles.foodPresetLabel, { color: colors.text }, active && { color: meta.tone, fontWeight: '800' }]}>
                        {getFoodLabel(preset)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Row 4: Recent chips (compact, no title) */}
              {recentFoodEntries.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {recentFoodEntries.map((entry) => {
                    const fn = (entry.payload as any).foodName as string;
                    const prefs = foodPreferencesMap[fn];
                    const heart = prefs && prefs.liked > prefs.disliked + prefs.neutral ? '❤️ ' : '';
                    const active = foodName === fn;
                    return (
                      <Pressable
                        key={entry.id}
                        onPress={() => setFoodName(fn)}
                        style={[styles.recentFoodChip, { borderColor: colors.border, backgroundColor: colors.card }, active && { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}
                      >
                        <Text style={[styles.recentFoodChipText, { color: colors.text }, active && { color: meta.tone }]}>
                          {heart}{fn}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Row 5: Quantity — adaptive chips + custom input + stepper */}
              <View style={{ marginTop: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    {t('food.quantityLabel2')}
                  </Text>
                  {suggestionRationale ? (
                    <Text style={{ color: colors.muted, fontSize: 10, fontStyle: 'italic', flexShrink: 1, textAlign: 'right', marginLeft: 8 }} numberOfLines={1}>
                      {suggestionRationale}
                    </Text>
                  ) : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {suggestion.chips.map((chip) => {
                    const active = quantityGrams === String(chip.value);
                    const showKindLabel = chip.kind !== 'baseline' && (suggestion.source === 'foodName' || suggestion.source === 'category' || suggestion.source === 'categoryMeal');
                    return (
                      <Pressable
                        key={`${chip.kind}-${chip.value}`}
                        onPress={() => setQuantityGrams(active ? '' : String(chip.value))}
                        accessibilityRole="button"
                        accessibilityLabel={`${chipKindLabel[chip.kind]} ${chip.value}${chip.unit}`}
                        style={[styles.qtyChip, { borderColor: colors.border, backgroundColor: colors.card, flexDirection: 'column', alignItems: 'center', paddingVertical: 8 }, active && { backgroundColor: meta.toneSoft, borderColor: meta.tone, borderWidth: 2 }]}
                      >
                        {showKindLabel && (
                          <Text style={{ fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: active ? meta.tone : colors.muted, marginBottom: 1 }}>
                            {chipKindLabel[chip.kind]}
                          </Text>
                        )}
                        <Text style={[styles.qtyChipText, { color: colors.text }, active && { color: meta.tone, fontWeight: '800' }]}>
                          {chip.value}{chip.unit}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable
                    onPress={() => setQuantityGrams(String(Math.max(0, (Number(quantityGrams) || 0) - qtyStep)))}
                    style={[styles.tempButton, { backgroundColor: `${meta.tone}14`, borderColor: `${meta.tone}50` }]}
                  >
                    <Text style={[styles.tempButtonText, { color: meta.tone }]}>−</Text>
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Input
                      label=""
                      value={quantityGrams}
                      onChangeText={setQuantityGrams}
                      placeholder={suggestion.usualAmount ? String(suggestion.usualAmount) : suggestion.unit === 'ml' ? '100' : '50'}
                      keyboardType="number-pad"
                      inputMode="numeric"
                    />
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '700', minWidth: 14 }}>{suggestion.unit}</Text>
                  <Pressable
                    onPress={() => setQuantityGrams(String((Number(quantityGrams) || 0) + qtyStep))}
                    style={[styles.tempButton, { backgroundColor: `${meta.tone}14`, borderColor: `${meta.tone}50` }]}
                  >
                    <Text style={[styles.tempButtonText, { color: meta.tone }]}>+</Text>
                  </Pressable>
                </View>
              </View>

              {/* Row 6: Expandable "more" — reactions / allergies */}
              <Pressable
                onPress={() => setFoodMoreOpen((v) => !v)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingVertical: 8 }}
              >
                <Ionicons name={foodMoreOpen ? 'chevron-up-outline' : 'chevron-down-outline'} size={13} color={foodAllergies.length > 0 ? '#E74C3C' : colors.muted} />
                <Text style={{ color: foodAllergies.length > 0 ? '#E74C3C' : colors.muted, fontSize: 12, fontWeight: foodAllergies.length > 0 ? '700' : '400' }}>
                  {foodMoreOpen ? (lessLabel[lang] ?? lessLabel.en) : (foodAllergies.length > 0 ? `⚠️ ${foodAllergies.length}` : (moreLabel[lang] ?? moreLabel.en))}
                </Text>
              </Pressable>
              {foodMoreOpen && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {reactionOptions.map(({ emoji, value, labels }) => {
                    const active = foodAllergies.includes(value);
                    return (
                      <Pressable
                        key={value}
                        onPress={() => setFoodAllergies(active ? foodAllergies.filter((a) => a !== value) : [...foodAllergies, value])}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20, minHeight: 36, borderWidth: active ? 2 : 1, borderColor: active ? '#E74C3C' : colors.border, backgroundColor: active ? 'rgba(231,76,60,0.12)' : 'transparent' }}
                      >
                        <Text style={{ fontSize: 13 }}>{emoji}</Text>
                        <Text style={{ color: active ? '#E74C3C' : colors.muted, fontSize: 12, fontWeight: active ? '700' : '400' }}>
                          {labels[lang] ?? labels.en}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })()}

        {type === 'sleep' && !editing && activeSleepDraft && sleepInputMode === null && !sleepTimerRunning && (() => {
          const elapsedMs = Date.now() - activeSleepDraft.startedAt;
          const h = Math.floor(elapsedMs / 3600000);
          const m = Math.floor((elapsedMs % 3600000) / 60000);
          const elapsedLabel = h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`;
          const startTime = new Date(activeSleepDraft.startedAt).toLocaleTimeString(
            language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : language === 'nl' ? 'nl-NL' : 'en-US',
            { hour: '2-digit', minute: '2-digit' },
          );
          const isStale = elapsedMs > 18 * 3600000; // 18 h cutoff for "looks forgotten"
          return (
            <View style={[styles.sectionCard, { borderWidth: 1.5, borderColor: '#58A6FF', backgroundColor: 'rgba(88,166,255,0.07)' }]}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#58A6FF', marginBottom: 4 }}>
                {t('entry.sleepDraftFound')}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, marginBottom: isStale ? 8 : 14 }}>
                {`${startTime} · ${elapsedLabel}`}
              </Text>
              {isStale && (
                <Text style={{ color: theme.yellow, fontSize: 12, fontWeight: '600', marginBottom: 14, lineHeight: 16 }}>
                  {`⚠ ${t('entry.sleepDraftStale')}`}
                </Text>
              )}
              <Pressable
                onPress={() => void endSleepDraftNow(activeSleepDraft)}
                disabled={saving}
                style={({ pressed }) => ({
                  paddingVertical: 15, borderRadius: 12, alignItems: 'center',
                  backgroundColor: pressed ? 'rgba(88,166,255,0.75)' : '#58A6FF',
                  opacity: saving ? 0.6 : 1,
                  marginBottom: 10,
                })}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                  {saving ? '…' : `${t('entry.sleepDraftEndNow')} (${elapsedLabel})`}
                </Text>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => resumeSleepDraft(activeSleepDraft)}
                  disabled={saving}
                  style={({ pressed }) => ({
                    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
                    borderWidth: 1, borderColor: colors.border,
                    backgroundColor: pressed ? `${colors.border}60` : 'transparent',
                  })}
                >
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>
                    {t('entry.sleepDraftResume')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={confirmDiscardSleepDraft}
                  disabled={saving}
                  style={({ pressed }) => ({
                    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
                    borderWidth: 1, borderColor: colors.border,
                    backgroundColor: pressed ? `${colors.border}60` : 'transparent',
                  })}
                >
                  <Text style={{ color: colors.muted, fontWeight: '600', fontSize: 13 }}>
                    {t('entry.sleepDraftDiscard')}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })()}

        {type === 'sleep' && !editing && sleepInputMode === null && (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>{t('entry.sleep')}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setSleepInputMode('timer')}
                style={({ pressed }) => ({
                  flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', gap: 6,
                  borderWidth: 1.5, borderColor: meta.tone,
                  backgroundColor: pressed ? meta.toneSoft : 'transparent',
                })}
              >
                <Text style={{ fontSize: 24 }}>▶️</Text>
                <Text style={{ color: meta.tone, fontWeight: '700', fontSize: 13 }}>
                  {language === 'fr' ? 'Démarrer timer' : language === 'es' ? 'Iniciar timer' : language === 'nl' ? 'Timer starten' : 'Start timer'}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center' }}>
                  {language === 'fr' ? 'Bébé dort maintenant' : language === 'es' ? 'El bebé duerme ahora' : language === 'nl' ? 'Baby slaapt nu' : 'Baby is sleeping now'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSleepInputMode('manual')}
                style={({ pressed }) => ({
                  flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', gap: 6,
                  borderWidth: 1, borderColor: colors.border,
                  backgroundColor: pressed ? `${colors.card}88` : 'transparent',
                })}
              >
                <Text style={{ fontSize: 24 }}>📝</Text>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>
                  {language === 'fr' ? 'Saisir manuellement' : language === 'es' ? 'Registrar pasado' : language === 'nl' ? 'Handmatig invoeren' : 'Log past sleep'}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center' }}>
                  {language === 'fr' ? 'Déjà terminé' : language === 'es' ? 'Ya terminó' : language === 'nl' ? 'Al afgelopen' : 'Already finished'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {type === 'sleep' && !editing && sleepInputMode === 'manual' && (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('entry.duration')}</Text>
            <TimerWidget
              label={t('entry.durationMin')}
              valueMinutes={Number(durationMin) || 0}
              onChangeMinutes={(minutes) => setDurationMin(String(minutes))}
              largeTouchMode={largeTouchMode}
              hideActionButton
            />
            {durationMin && Number(durationMin) > 0 && (
              <View style={[styles.infoStrip, { marginTop: 12 }]}>
                <Text style={[styles.infoStripText, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}>{Math.floor(Number(durationMin) / 60)}h {Number(durationMin) % 60}m</Text>
              </View>
            )}
          </View>
        )}

        {type === 'sleep' && editing && (
          <View style={styles.sectionCard}>
            <TimerWidget
              label={t('entry.durationMin')}
              valueMinutes={Number(durationMin) || 0}
              onChangeMinutes={(minutes) => setDurationMin(String(minutes))}
              largeTouchMode={largeTouchMode}
              autoStart={!editing}
              hideActionButton
              stopRequestToken={sleepStopToken}
              onRunningChange={setSleepTimerRunning}
            />
            {durationMin && (
              <View style={[styles.infoStrip, { marginTop: 12 }]}>
                <Text style={[styles.infoStripText, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}>{Math.floor(Number(durationMin) / 60)}h {Number(durationMin) % 60}m</Text>
              </View>
            )}
          </View>
        )}

        {type === 'diaper' && (
          <View style={styles.sectionCard}>
            <View style={styles.diaperMinimalStack}>
              <DiaperLevelPicker
                emoji={'\u{1F4A7}'}
                label={t('diaper.pee')}
                value={Number(pee) || 0}
                onChange={(val) => setPee(String(val))}
                color="#58A6FF"
              />
              <DiaperLevelPicker
                emoji={'\u{1F4A9}'}
                label={t('diaper.poop')}
                value={Number(poop) || 0}
                onChange={(val) => setPoop(String(val))}
                color="#A371F7"
              />
              <DiaperLevelPicker
                emoji={'\u{1F92E}'}
                label={t('diaper.vomit')}
                value={Number(vomit) || 0}
                onChange={(val) => setVomit(String(val))}
                color="#F0B85A"
              />
            </View>
          </View>
        )}

        {type === 'pump' && editing && (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('entry.duration')}</Text>
            <TimerWidget label={t('entry.sessionMin')} valueMinutes={Number(durationMin) || 0} onChangeMinutes={(minutes) => setDurationMin(String(minutes))} largeTouchMode={largeTouchMode} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>{t('entry.amount')}</Text>
            <QuantityPicker value={Number(amountMl) || 0} onChange={(value) => setAmountMl(String(value))} largeTouchMode={largeTouchMode} />
          </View>
        )}

        {type === 'measurement' && (
          <View style={styles.sectionCard}>
            {(() => {
              const suggested = profile?.babyBirthDate ? getSuggestedValues(profile.babyBirthDate, t) : null;
              const weightCat = weightKg && profile?.babyBirthDate ? getWeightCategory(Number(weightKg), profile.babyBirthDate, t) : null;
              const heightCat = heightCm && profile?.babyBirthDate ? getHeightCategory(Number(heightCm), profile.babyBirthDate, t) : null;

              return (
                <>
                  {lastMeasurementEntry ? (
                    <View style={[styles.measureMetaStrip, { borderColor: colors.border }]}>
                      <Text style={[styles.measureMetaText, { color: colors.muted }]}>
                        {t('measurement.lastMeasurement')}{' '}
                        {new Date(lastMeasurementEntry.occurredAt).toLocaleDateString({ fr: 'fr-FR', es: 'es-ES', nl: 'nl-BE', en: 'en-US' }[language] ?? 'en-US')}
                      </Text>
                    </View>
                  ) : null}
                  {suggested && (
                    <View style={[styles.whoSuggestedBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
                      <Text style={[styles.whoSuggestedTitle, { color: meta.tone }]}>{t('entry.whoSuggested')}</Text>
                      <Text style={[styles.whoSuggestedMessage, { color: colors.muted }]}>{suggested.message}</Text>
                      <View style={styles.measureQuickActions}>
                        <Pressable
                          onPress={() => {
                            setWeightKg(suggested.weight.value.toFixed(1));
                            setHeightCm(suggested.height.value.toFixed(1));
                          }}
                          style={[styles.measureQuickBtn, { borderColor: meta.tone, backgroundColor: `${meta.tone}12` }]}
                        >
                          <Text style={[styles.measureQuickBtnText, { color: meta.tone }]}>
                            {t('measurement.useSuggestion')}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            setWeightKg('');
                            setHeightCm('');
                            setHeadCircCm('');
                            setTempC('');
                          }}
                          style={[styles.measureQuickBtn, { borderColor: colors.border, backgroundColor: 'transparent' }]}
                        >
                          <Text style={[styles.measureQuickBtnText, { color: colors.muted }]}>
                            {t('measurement.clear')}
                          </Text>
                        </Pressable>
                      </View>
                      <View style={styles.whoSuggestedRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.whoSuggestedLabel, { color: colors.muted }]}>
                            {t('entry.weight')}
                          </Text>
                          <Text style={[styles.whoSuggestedValue, { color: meta.tone }]}>
                            {suggested.weight.value.toFixed(1)} kg
                          </Text>
                          <Text style={[styles.whoSuggestedRange, { color: colors.muted }]}>
                            {suggested.weight.min.toFixed(1)} - {suggested.weight.max.toFixed(1)} kg
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.whoSuggestedLabel, { color: colors.muted }]}>
                            {t('entry.height')}
                          </Text>
                          <Text style={[styles.whoSuggestedValue, { color: meta.tone }]}>
                            {suggested.height.value.toFixed(1)} cm
                          </Text>
                          <Text style={[styles.whoSuggestedRange, { color: colors.muted }]}>
                            {suggested.height.min.toFixed(1)} - {suggested.height.max.toFixed(1)} cm
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  <View style={{ marginTop: suggested ? 12 : 0 }}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('entry.currentMeasurements')}</Text>

                    <View style={{ marginTop: 12 }}>
                      <Input
                        label={t('entry.weight')}
                        value={weightKg}
                        onChangeText={setWeightKg}
                        keyboardType="decimal-pad"
                        placeholder={suggested ? suggested.weight.value.toFixed(1) : '5.2'}
                      />
                      {weightCat && (
                        <Text style={[styles.whoFeedback, { color: weightCat.category === 'healthy' ? theme.green : theme.yellow, marginTop: 8 }]}>
                          {weightCat.emoji} {weightCat.message}
                        </Text>
                      )}
                    </View>

                    <View style={{ marginTop: 12 }}>
                      <Input
                        label={t('entry.height')}
                        value={heightCm}
                        onChangeText={setHeightCm}
                        keyboardType="decimal-pad"
                        placeholder={suggested ? suggested.height.value.toFixed(1) : '52'}
                      />
                      {heightCat && (
                        <Text style={[styles.whoFeedback, { color: heightCat.category === 'healthy' ? theme.green : theme.yellow, marginTop: 8 }]}>
                          {heightCat.emoji} {heightCat.message}
                        </Text>
                      )}
                    </View>

                    <Input label={t('entry.headCirc')} value={headCircCm} onChangeText={setHeadCircCm} keyboardType="decimal-pad" placeholder="35" />
                    <Input label={t('entry.temperatureLabel')} value={tempC} onChangeText={setTempC} keyboardType="decimal-pad" placeholder="37.5" />
                  </View>
                </>
              );
            })()}
          </View>
        )}

        {type === 'medication' && (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{typeLabel}</Text>
            <View style={styles.medQuickRow}>
              {(commonMedications as Array<any>).map((med) => (
                <Pressable
                  key={med.name}
                  onPress={() => {
                    setName(med.name);
                    setDosage(getRecommendedDose(med.name) || med.defaultDosage || '');
                  }}
                  style={[styles.medQuickBtn, { borderColor: meta.tone, backgroundColor: colors.card }]}
                >
                  <Text style={[styles.medQuickTitle, { color: colors.text }]}>{med.name}</Text>
                  <Text style={[styles.medQuickSub, { color: colors.muted }]}>{getRecommendedDose(med.name) || med.defaultDosage || ''}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => {
                setName('');
                setDosage('');
              }}
              style={[styles.medManualBtn, { borderColor: meta.tone, backgroundColor: colors.background }]}
            >
              <Text style={[styles.medManualText, { color: meta.tone }]}>
                {{ fr: 'Ajouter manuellement', es: 'Agregar manualmente', nl: 'Handmatig toevoegen', en: 'Add manually' }[language] ?? 'Add manually'}
              </Text>
            </Pressable>
            {savedMedicines.length > 0 && (
              <View style={styles.savedWrap}>
                <View style={styles.savedRow}>
                  {savedMedicines.slice(0, 4).map((med) => (
                    <Pressable
                      key={`${med.name}-${med.dosage}`}
                      onPress={() => {
                        setName(med.name);
                        if (med.dosage) setDosage(med.dosage);
                      }}
                      style={[styles.savedChip, { borderColor: colors.border, backgroundColor: colors.card }, name === med.name && { borderColor: meta.tone }]}
                    >
                      <Text style={[styles.savedChipTitle, { color: colors.text }]}>{med.name}</Text>
                      {med.dosage && <Text style={[styles.savedChipSubtitle, { color: colors.muted }]}>{med.dosage}</Text>}
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            {name.trim() && (
              <Pressable
                onPress={async () => {
                  const next = await upsertSavedMedicine({ name, dosage });
                  setSavedMedicines(next);
                  const profileList = profile?.customMedicines ?? [];
                  const now = new Date().toISOString();
                  const merged = [
                    { name: name.trim(), dosage: dosage.trim() || undefined, updatedAt: now },
                    ...profileList.filter((item) => item.name.toLowerCase() !== name.trim().toLowerCase()),
                  ].slice(0, 24);
                  await saveProfile({ customMedicines: merged });
                }}
                style={[styles.savePresetButton, { marginTop: 8 }]}
              >
                <Text style={styles.savePresetText}>
                  {!existingSavedMedicine
                    ? language === 'fr'
                      ? 'Ajouter ce medicament'
                      : 'Add this medicine'
                    : isMedicationDirty
                      ? language === 'fr'
                        ? 'Mettre a jour la dose'
                        : 'Update dosage'
                      : language === 'fr'
                        ? 'Deja enregistre'
                        : 'Already saved'}
                </Text>
              </Pressable>
            )}
            <Input label={t('entry.medicationName')} value={name} onChangeText={setName} />
            {medicationSuggestions.length > 0 && (
              <View style={[styles.savedWrap, { marginTop: 6 }]}>
                <View style={styles.savedRow}>
                  {medicationSuggestions.map((med) => (
                    <Pressable
                      key={`suggest-${med.name}`}
                      onPress={() => {
                        setName(med.name);
                        if (med.dosage) setDosage(med.dosage);
                      }}
                      style={[styles.savedChip, { borderColor: colors.border, backgroundColor: colors.card }]}
                    >
                      <Text style={[styles.savedChipTitle, { color: colors.text }]}>{med.name}</Text>
                      {med.dosage ? <Text style={[styles.savedChipSubtitle, { color: colors.muted }]}>{med.dosage}</Text> : null}
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            <Input label={t('entry.dosage')} value={dosage} onChangeText={setDosage} />
            <View style={styles.medIntervalHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'fr' ? 'Intervalle recommandé' : 'Recommended interval'}
              </Text>
              {name.trim() ? <Text style={[styles.medStatusLabel, { color: medStatus.color }]}>{medStatus.label}</Text> : null}
            </View>
            <View style={styles.medIntervalRow}>
              {['4', '6', '8'].map((value) => {
                const active = medIntervalHours === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setMedIntervalHours(value)}
                    style={[styles.medIntervalBtn, { borderColor: colors.border, backgroundColor: colors.card }, active && { borderColor: meta.tone, backgroundColor: meta.toneSoft }]}
                  >
                    <Text style={[styles.medIntervalText, { color: colors.text }, active && { color: meta.tone }]}>{value}h</Text>
                  </Pressable>
                );
              })}
            </View>
            {name.trim() ? (
              <Text style={[styles.medNextDoseText, { color: colors.muted }]}>
                {language === 'fr' ? 'Prochaine dose:' : 'Next dose:'} {nextDosePreview}
              </Text>
            ) : null}
            <Text style={[styles.medStatusText, { color: colors.text }]}>
              {name.trim()
                ? medStatus.text
                : language === 'fr'
                  ? 'Choisissez ou ajoutez un medicament pour voir le statut.'
                  : 'Choose or add a medicine to see status.'}
            </Text>
            <Pressable
              onPress={() => setShowMedicationReminderFlow(true)}
              style={[
                styles.reminderToggle,
                { borderColor: meta.tone, backgroundColor: meta.toneSoft, marginTop: 12 },
              ]}
            >
              <Text style={[styles.reminderToggleCheckbox, { color: meta.tone }]}>+</Text>
              <Text style={[styles.reminderToggleLabel, { color: meta.tone }]}>
                {language === 'fr' ? 'Rappel pour la prochaine dose' : 'Reminder for next dose'}
              </Text>
            </Pressable>
            <View style={styles.medTimelineWrap}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'fr' ? 'Doses recentes' : 'Recent doses'}
              </Text>
              {recentMedicationEntries.length === 0 ? (
                <Text style={[styles.medTimelineEmpty, { color: colors.muted }]}>
                  {language === 'fr' ? 'Aucune dose enregistree aujourd hui.' : 'No medication logged yet.'}
                </Text>
              ) : (
                recentMedicationEntries.map((entry) => (
                  <View key={entry.id} style={styles.medTimelineItem}>
                    <View style={[styles.medTimelineDot, { backgroundColor: meta.tone }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.medTimelineName, { color: colors.text }]}>{(entry.payload as any)?.name}</Text>
                      <Text style={[styles.medTimelineMeta, { color: colors.muted }]}>
                        {((entry.payload as any)?.dosage || '').trim() || '—'} · {new Date(entry.occurredAt).toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {type === 'milestone' && (
          <View style={styles.sectionCard}>
            <Input label={t('entry.titleLabel')} value={title} onChangeText={setTitle} placeholder={language === 'fr' ? 'Premier sourire...' : 'First smile...'} />
            <Input label="Icon" value={icon} onChangeText={setIcon} placeholder="?" />
            <Button
              label={photoUri ? (language === 'fr' ? '?? Remplacer' : '?? Replace') : language === 'fr' ? '?? Ajouter' : '?? Add'}
              onPress={async () => {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  quality: 0.7,
                });
                if (!result.canceled && result.assets[0]?.uri) {
                  setPhotoUri(result.assets[0].uri);
                }
              }}
              variant="ghost"
            />
          </View>
        )}

        {type === 'symptom' && (
          <View style={styles.sectionCard}>
            <View style={styles.chipRow}>
              {symptomOptions.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() =>
                    setSymptoms((current) => {
                      const newSymptoms = current.includes(option.value)
                        ? current.filter((s) => s !== option.value)
                        : Array.from(new Set([option.value, ...current])).slice(0, 4);
                      return newSymptoms;
                    })
                  }
                  style={[styles.symptomChip, { borderColor: colors.border, backgroundColor: colors.card }, symptoms.includes(option.value) && { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}
                >
                  <Text style={[styles.symptomChipText, { color: colors.text }, symptoms.includes(option.value) && { color: meta.tone, fontWeight: '900' }]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {type === 'temperature' && (
          <View style={styles.sectionCard}>
            <View style={styles.tempPresets}>
              <Pressable onPress={() => setVaccineTemp('36.5')} style={[styles.tempPreset, { borderColor: colors.border, backgroundColor: colors.card }, vaccineTemp === '36.5' && { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}>
                <Text style={[styles.tempPresetText, { color: colors.text }, vaccineTemp === '36.5' && { color: meta.tone, fontWeight: '900' }]}>36.5</Text>
              </Pressable>
              <Pressable onPress={() => setVaccineTemp('37.5')} style={[styles.tempPreset, { borderColor: colors.border, backgroundColor: colors.card }, vaccineTemp === '37.5' && { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}>
                <Text style={[styles.tempPresetText, { color: colors.text }, vaccineTemp === '37.5' && { color: meta.tone, fontWeight: '900' }]}>37.5</Text>
              </Pressable>
              <Pressable onPress={() => setVaccineTemp('38.5')} style={[styles.tempPreset, { borderColor: colors.border, backgroundColor: colors.card }, vaccineTemp === '38.5' && { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}>
                <Text style={[styles.tempPresetText, { color: colors.text }, vaccineTemp === '38.5' && { color: meta.tone, fontWeight: '900' }]}>38.5</Text>
              </Pressable>
            </View>

            <View style={styles.tempInputRow}>
              <Pressable
                onPress={() => {
                  const current = Number(vaccineTemp) || 37.5;
                  setVaccineTemp((Math.max(35, current - 0.1)).toFixed(1));
                }}
                style={[styles.tempButton, { borderColor: colors.border, backgroundColor: colors.card }]}
              >
                <Text style={[styles.tempButtonText, { color: colors.text }]}>-</Text>
              </Pressable>

              <View style={{ flex: 1 }}>
                <Input
                  label="°C"
                  value={vaccineTemp}
                  onChangeText={(text) => {
                    const cleanText = text.replace(/[^0-9.]/g, '');
                    if (cleanText === '' || /^\d*\.?\d{0,2}$/.test(cleanText)) {
                      setVaccineTemp(cleanText);
                    }
                  }}
                  placeholder="37.5"
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                />
              </View>

              <Pressable
                onPress={() => {
                  const current = Number(vaccineTemp) || 37.5;
                  setVaccineTemp((Math.min(42, current + 0.1)).toFixed(1));
                }}
                style={[styles.tempButton, { borderColor: colors.border, backgroundColor: colors.card }]}
              >
                <Text style={[styles.tempButtonText, { color: colors.text }]}>+</Text>
              </Pressable>
            </View>

            {vaccineTemp && (
              <View style={styles.tempStatusContainer}>
                {Number(vaccineTemp) < 37.5 ? (
                  <View style={[styles.tempStatus, { backgroundColor: `${theme.green}28`, borderColor: theme.green }]}>
                    <Text style={[styles.tempStatusText, { color: theme.green }]}>{"✅"} Normal</Text>
                  </View>
                ) : Number(vaccineTemp) < 38 ? (
                  <View style={[styles.tempStatus, { backgroundColor: `${theme.yellow}28`, borderColor: theme.yellow }]}>
                    <Text style={[styles.tempStatusText, { color: theme.yellow }]}>{"⚠️"} {language === 'fr' ? 'Fébricule' : language === 'es' ? 'Febrícula' : language === 'nl' ? 'Lichte koorts' : 'Mild fever'}</Text>
                  </View>
                ) : (
                  <View style={[styles.tempStatus, { backgroundColor: `${theme.red}28`, borderColor: theme.red }]}>
                    <Text style={[styles.tempStatusText, { color: theme.red }]}>{"🔥"} {language === 'fr' ? 'Fièvre' : language === 'es' ? 'Fiebre' : language === 'nl' ? 'Koorts' : 'Fever'}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {type === 'vaccine' && (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'fr' ? 'Vaccin' : 'Vaccine'}</Text>

            <Text style={[styles.sectionBody, { color: colors.muted, marginBottom: 10 }]}>{language === 'fr' ? 'Choisir un vaccin:' : 'Choose a vaccine:'}</Text>
            <View style={styles.vaccinePresetsGrid}>
              {vaccinePresets.map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => setVaccineName(preset)}
                  style={[styles.vaccinePresetBtn, { borderColor: colors.border, backgroundColor: colors.card }, vaccineName === preset && { backgroundColor: meta.toneSoft, borderColor: meta.tone }]}
                >
                  <Text style={[styles.vaccinePresetText, { color: colors.text }, vaccineName === preset && { color: meta.tone, fontWeight: '900' }]}>{preset}</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setVaccineName('')}
                style={[styles.vaccinePresetBtn, styles.vaccineAddBtnInGrid, { borderColor: meta.tone }]}
              >
                <Text style={[styles.vaccinePresetText, { color: meta.tone, fontSize: 20 }]}>+</Text>
              </Pressable>
            </View>

            {vaccineName === '' && (
              <>
                <Text style={[styles.sectionBody, { color: colors.muted, marginBottom: 10, marginTop: 12 }]}>{language === 'fr' ? 'Nom du vaccin' : 'Vaccine name'}</Text>
                <Input
                  label=""
                  value={vaccineName}
                  onChangeText={setVaccineName}
                  placeholder={language === 'fr' ? 'Entrez le nom du vaccin...' : 'Enter vaccine name...'}
                />
              </>
            )}

            {vaccineName && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>{language === 'fr' ? 'Numero de dose' : 'Dose number'}</Text>
                <View style={styles.vaccineInputRow}>
                  <Pressable
                    onPress={() => setVaccineDose(String(Math.max(1, Number(vaccineDose) - 1)))}
                    style={[styles.vaccineDoseButton, { borderColor: colors.border, backgroundColor: colors.card }]}
                  >
                    <Text style={[styles.vaccineDoseButtonText, { color: colors.text }]}>-</Text>
                  </Pressable>

                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={[styles.vaccineDoseDisplay, { color: meta.tone }]}>
                      {language === 'fr' ? 'Dose ' : 'Dose '}{vaccineDose}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => setVaccineDose(String(Math.min(5, Number(vaccineDose) + 1)))}
                    style={[styles.vaccineDoseButton, { borderColor: colors.border, backgroundColor: colors.card }]}
                  >
                    <Text style={[styles.vaccineDoseButtonText, { color: colors.text }]}>+</Text>
                  </Pressable>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>{language === 'fr' ? 'Prochaine dose' : 'Next dose scheduled'}</Text>
                <Text style={[styles.sectionBody, { color: colors.muted, marginBottom: 8 }]}>{language === 'fr' ? 'Date prevue pour la prochaine dose' : 'When is the next dose scheduled'}</Text>
                <DateTimeField label={t('entry.when')} value={vaccineNextDueDate} onChange={setVaccineNextDueDate} />
              </>
            )}

            <Pressable
              onPress={() => setShowReminderFlow(true)}
              style={[
                styles.reminderToggle,
                { borderColor: meta.tone, backgroundColor: meta.toneSoft },
              ]}
            >
              <Text style={[styles.reminderToggleCheckbox, { color: meta.tone }]}>+</Text>
              <Text style={[styles.reminderToggleLabel, { color: meta.tone }]}>
                {language === 'fr' ? 'Ajouter un rappel pour plus tard' : 'Add reminder for later'}
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.notesToggleWrap}>
          <Pressable onPress={() => setNotesOpen((current) => !current)} style={styles.notesToggle}>
            <Text style={{ color: colors.primary, fontWeight: '800', textAlign: 'center' }}>{notesOpen ? '- ' : '+ '}{language === 'fr' ? 'Notes' : 'Notes'}</Text>
          </Pressable>
        </View>
        {notesOpen && <Input label={language === 'fr' ? 'Notes' : 'Notes'} value={notes} onChangeText={setNotes} multiline placeholder={language === 'fr' ? 'Optionnel...' : 'Optional...'} />}
      </Card>


      {type === 'sleep' && !editing && sleepStartedAt ? (
        <FullscreenTimerModal
          visible={sleepFullscreenVisible}
          emoji={'\u{1F634}'}
          title={language === 'fr' ? 'Sommeil' : language === 'es' ? 'Sueño' : language === 'nl' ? 'Slaap' : 'Sleep'}
          subtitlePrefix={language === 'fr' ? 'Sommeil' : language === 'es' ? 'Sueño' : language === 'nl' ? 'Slaap' : 'Sleep'}
          startedAt={sleepStartedAt}
          elapsedSeconds={sleepElapsedSeconds}
          onStop={() => void handleSleepStop()}
          onCancel={() => void handleSleepTimerCancel()}
          cancelLabel={t('entry.sleepTimerCancel')}
          onMinimize={() => { minimizeGlobalTimer(); setSleepFullscreenVisible(false); }}
        />
      ) : null}
      {type === 'pump' && !editing && pumpStartedAt ? (
        <FullscreenTimerModal
          visible={pumpFullscreenVisible}
          emoji={'\u{1F37C}'}
          title={language === 'fr' ? 'Tirage' : language === 'es' ? 'Extracción' : language === 'nl' ? 'Kolven' : 'Pump'}
          subtitlePrefix={language === 'fr' ? 'Tirage' : language === 'es' ? 'Extracción' : language === 'nl' ? 'Kolven' : 'Pump'}
          startedAt={pumpStartedAt}
          elapsedSeconds={pumpElapsedSeconds}
          onStop={() => void handlePumpStop()}
          onMinimize={() => { minimizeGlobalTimer(); setPumpFullscreenVisible(false); }}
        />
      ) : null}

      {type === 'vaccine' && (
        <VaccineReminderModal
          visible={showReminderFlow}
          onClose={() => setShowReminderFlow(false)}
          language={language}
          colors={colors}
          metaTone={meta.tone}
          metaToneSoft={meta.toneSoft}
          reminderStep={reminderStep}
          setReminderStep={setReminderStep}
          vaccinePresets={vaccinePresets}
          reminderVaccineName={reminderVaccineName}
          setReminderVaccineName={setReminderVaccineName}
          reminderVaccineDate={reminderVaccineDate}
          setReminderVaccineDate={setReminderVaccineDate}
          onSave={handleSaveReminder}
          saving={saving}
        />
      )}

      {/* Food done sheet */}
      <Modal visible={showFoodDoneModal} animationType="slide" transparent statusBarTranslucent>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.62)' }}>
          <View style={{
            backgroundColor: theme.bgCard,
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: Math.max(44, insets.bottom + 24),
            ...shadow(theme.textPrimary, 0.3, 24, 0, -6),
            elevation: 20,
          }}>
            {/* Drag handle */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: `${theme.textMuted}40` }} />
            </View>

            {/* Saved header */}
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${meta.tone}20`, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>✅</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.textPrimary, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>
                    {lastSavedFood.name || t('food.savedTitle')}
                  </Text>
                  {(lastSavedFood.grams || lastSavedFood.mealTimeVal) ? (
                    <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>
                      {[
                        lastSavedFood.grams ? `${lastSavedFood.grams}g` : '',
                        lastSavedFood.mealTimeVal ? ({'breakfast':'🌅','lunch':'🌞','snack':'🍪','dinner':'🌙'} as Record<string,string>)[lastSavedFood.mealTimeVal] ?? '' : '',
                      ].filter(Boolean).join('  ·  ')}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Emoji feedback */}
            <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14, textAlign: 'center' }}>
              {language === 'fr' ? 'Comment c\'était ?' : language === 'es' ? '¿Cómo estuvo?' : language === 'nl' ? 'Hoe was het?' : 'How was it?'}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 28 }}>
              {([
                { emoji: '😋', foodLiked: 'yes' as const, amountEaten: 'all' as const },
                { emoji: '😊', foodLiked: 'yes' as const, amountEaten: 'half' as const },
                { emoji: '😐', foodLiked: 'neutral' as const, amountEaten: 'half' as const },
                { emoji: '😕', foodLiked: 'no' as const, amountEaten: 'little' as const },
                { emoji: '🤢', foodLiked: 'no' as const, amountEaten: 'none' as const },
              ]).map(({ emoji, foodLiked: fl, amountEaten: ae }) => {
                const selected = feedbackSelectedEmoji === emoji;
                return (
                  <Pressable
                    key={emoji}
                    onPress={() => {
                      setFeedbackSelectedEmoji(emoji);
                      if (lastSavedFoodEntryId) {
                        const entry = entries.find((e) => e.id === lastSavedFoodEntryId);
                        if (entry) {
                          void updateEntry(lastSavedFoodEntryId, { payload: { ...entry.payload, foodLiked: fl, amountEaten: ae } });
                        }
                      }
                    }}
                    style={({ pressed }) => ({
                      width: 54, height: 54, borderRadius: 27,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: selected ? `${meta.tone}22` : `${theme.textMuted}0A`,
                      borderWidth: selected ? 2.5 : 1,
                      borderColor: selected ? meta.tone : `${theme.textMuted}20`,
                      transform: [{ scale: pressed ? 0.84 : selected ? 1.1 : 1 }],
                    })}
                  >
                    <Text style={{ fontSize: selected ? 28 : 24 }}>{emoji}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Actions */}
            <Pressable
              onPress={() => { setShowFoodDoneModal(false); resetFoodForm(); }}
              style={({ pressed }) => ({
                backgroundColor: meta.tone, borderRadius: 16, height: 54,
                alignItems: 'center', justifyContent: 'center', marginBottom: 10,
                opacity: pressed ? 0.86 : 1,
                ...shadow(meta.tone, 0.35, 12, 0, 4),
              })}
            >
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 15, letterSpacing: 0.1 }}>
                + {t('food.addAnother')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { setShowFoodDoneModal(false); router.back(); }}
              style={({ pressed }) => ({
                borderRadius: 16, height: 50, alignItems: 'center', justifyContent: 'center',
                borderWidth: 1.5, borderColor: `${theme.textMuted}30`,
                backgroundColor: `${theme.textMuted}08`,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: theme.textMuted, fontWeight: '600', fontSize: 15 }}>{t('food.goHome')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Share preview modal */}
      {editing && (
        <Modal visible={showSharePreview} transparent animationType="fade" onRequestClose={() => setShowSharePreview(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <View ref={shareCardRef} collapsable={false}>
              <ShareCard entry={editing as any} babyName={profile?.babyName} lang={language as any} />
            </View>

            <View style={{ width: '100%', gap: 10, marginTop: 24 }}>
              <Pressable
                onPress={() => {
                  setSharingImage(true);
                  setTimeout(() => {
                    void shareEntryAsImage(
                      () => captureRef(shareCardRef, { format: 'png', quality: 1.0, result: 'tmpfile' }),
                      editing as any,
                      profile?.babyName ?? '',
                      language as any,
                    ).finally(() => {
                      setSharingImage(false);
                      setShowSharePreview(false);
                    });
                  }, 150);
                }}
                disabled={sharingImage}
                style={({ pressed }) => ({
                  backgroundColor: sharingImage ? '#555' : meta.tone,
                  borderRadius: 14,
                  paddingVertical: 15,
                  alignItems: 'center',
                  flexDirection: 'row' as const,
                  justifyContent: 'center' as const,
                  gap: 8,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                {sharingImage ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="share-social-outline" size={20} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                      {language === 'fr' ? 'Partager cette image' : language === 'es' ? 'Compartir imagen' : language === 'nl' ? 'Afbeelding delen' : 'Share this image'}
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={() => setShowSharePreview(false)}
                style={({ pressed }) => ({ alignItems: 'center' as const, paddingVertical: 12, opacity: pressed ? 0.6 : 1 })}
              >
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: 15 }}>
                  {language === 'fr' ? 'Annuler' : language === 'es' ? 'Cancelar' : language === 'nl' ? 'Annuleren' : 'Cancel'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </Page>

    {/* Fixed footer — outside scroll, always accessible */}
    {!((type === 'sleep' || type === 'pump') && !editing) && (
      <Animated.View style={[styles.actionsStickyContainer, actionsAnimStyle, {
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50,
        backgroundColor: theme.bgCardAlt,
        borderTopColor: colors.border,
        paddingBottom: Math.max(20, insets.bottom + 10),
        ...(Platform.OS === 'web'
          ? ({
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
            } as any)
          : null),
      }]}>
        <Pressable
          onPress={saving ? undefined : () => void handlePrimarySave()}
          style={({ pressed }) => [
            styles.primaryActionBtn,
            { backgroundColor: theme.accent, opacity: saving ? 0.7 : pressed ? 0.88 : 1 },
          ]}
        >
          {saving ? (
            <ActivityIndicator color={theme.accentText} size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color={theme.accentText} />
              <Text style={[styles.primaryActionLabel, { color: theme.accentText }]}>
                {editing
                  ? (language === 'fr' ? 'Mettre à jour' : language === 'es' ? 'Actualizar' : language === 'nl' ? 'Bijwerken' : 'Update')
                  : (language === 'fr' ? 'Enregistrer' : language === 'es' ? 'Guardar' : language === 'nl' ? 'Opslaan' : 'Save')}
              </Text>
            </>
          )}
        </Pressable>

        {editing && (
          <View style={styles.secondaryActionsRow}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.secondaryActionBtn,
                { borderColor: colors.border, backgroundColor: pressed ? colors.border : 'transparent' },
              ]}
            >
              <Ionicons name="arrow-back-outline" size={18} color={colors.muted} />
              <Text style={[styles.secondaryActionLabel, { color: colors.muted }]}>
                {language === 'fr' ? 'Annuler' : language === 'es' ? 'Cancelar' : language === 'nl' ? 'Annuleren' : 'Cancel'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => { if (editing) setShowSharePreview(true); }}
              style={({ pressed }) => [
                styles.secondaryActionBtn,
                { borderColor: theme.accent, backgroundColor: pressed ? `${theme.accent}18` : 'transparent' },
              ]}
            >
              <Ionicons name="share-social-outline" size={18} color={theme.accent} />
              <Text style={[styles.secondaryActionLabel, { color: theme.accent }]}>
                {language === 'fr' ? 'Partager' : language === 'es' ? 'Compartir' : language === 'nl' ? 'Delen' : 'Share'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [
                styles.secondaryActionBtn,
                { borderColor: theme.red, backgroundColor: pressed ? `${theme.red}18` : 'transparent' },
              ]}
            >
              <Ionicons name="trash-outline" size={18} color={theme.red} />
              <Text style={[styles.secondaryActionLabel, { color: theme.red }]}>
                {language === 'fr' ? 'Supprimer' : language === 'es' ? 'Eliminar' : language === 'nl' ? 'Verwijderen' : 'Delete'}
              </Text>
            </Pressable>
          </View>
        )}
      </Animated.View>
    )}

    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  heroIconText: {
    fontSize: 18,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '900',
    flexShrink: 1,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  closeButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionCard: {
    gap: 10,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  medicationHero: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  medicationHeroDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  medicationHeroTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  medicationHeroBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  medQuickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  medIntervalRow: {
    flexDirection: 'row',
    gap: 8,
  },
  medIntervalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  medIntervalBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  medIntervalText: {
    fontSize: 12,
    fontWeight: '700',
  },
  medStatusCard: {
    paddingHorizontal: 2,
    paddingVertical: 2,
    gap: 2,
  },
  medStatusLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  medStatusText: {
    fontSize: 12,
  },
  medNextDoseText: {
    fontSize: 12,
    fontWeight: '600',
  },
  medQuickBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  medQuickTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  medQuickSub: {
    fontSize: 11,
    marginTop: 2,
  },
  medManualBtn: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medManualText: {
    fontSize: 12,
    fontWeight: '700',
  },
  medTimelineWrap: {
    marginTop: 12,
    gap: 8,
  },
  medTimelineEmpty: {
    fontSize: 12,
  },
  medTimelineItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  medTimelineDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 6,
  },
  medTimelineName: {
    fontSize: 12,
    fontWeight: '700',
  },
  medTimelineMeta: {
    fontSize: 11,
  },
  stack: {
    gap: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  symptomChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  symptomChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  vaccinePresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  vaccinePresetBtn: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  vaccinePresetText: {
    fontSize: 11,
    fontWeight: '700',
  },
  vaccineAddBtnInGrid: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  vaccineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  vaccineDoseButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaccineDoseButtonText: {
    fontSize: 20,
    fontWeight: '700',
  },
  vaccineDoseDisplay: {
    fontSize: 16,
    fontWeight: '900',
  },
  reminderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    marginTop: 16,
  },
  reminderToggleCheckbox: {
    fontSize: 18,
    fontWeight: '700',
    width: 24,
    textAlign: 'center',
  },
  reminderToggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  reminderModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  reminderModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  reminderModalHeader: {
    marginBottom: 24,
  },
  reminderModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  reminderModalSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  reminderModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  reminderPresetBtn: {
    flex: 1,
    minWidth: '31%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  reminderPresetText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  reminderCustomSection: {
    marginBottom: 20,
  },
  reminderLabel: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  reminderDateSection: {
    marginBottom: 20,
  },
  reminderSummary: {
    backgroundColor: 'rgba(201, 162, 39, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 39, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 20,
    gap: 10,
  },
  reminderSummaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  reminderSummaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderActions: {
    gap: 8,
  },
  actionsStickyContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    borderTopWidth: 1,
    gap: 10,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 16,
  },
  primaryActionLabel: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  secondaryActionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  reactionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  whoSuggestedBox: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  whoSuggestedTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  whoSuggestedMessage: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
    fontWeight: '500',
  },
  measureQuickActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  measureQuickBtn: {
    flex: 1,
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  measureQuickBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  measureMetaStrip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  measureMetaText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  whoSuggestedRow: {
    flexDirection: 'row',
    gap: 12,
  },
  whoSuggestedLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  whoSuggestedValue: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  whoSuggestedRange: {
    fontSize: 10,
    fontWeight: '500',
  },
  whoFeedback: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  sectionBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  infoStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  infoStripText: {
    fontSize: 10,
    fontWeight: '800',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tempPresets: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tempPreset: {
    flex: 1,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempPresetText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tempInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tempButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempButtonText: {
    fontSize: 22,
    fontWeight: '700',
  },
  tempStatusContainer: {
    marginTop: 12,
  },
  tempStatus: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  tempStatusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  diaperMinimalStack: {
    gap: 18,
  },
  savedWrap: {
    gap: 8,
    marginBottom: 8,
  },
  savedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  savedChip: {
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
  },
  savedChipTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  savedChipSubtitle: {
    fontSize: 9,
    fontWeight: '600',
  },
  savePresetButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2B7A55',
    backgroundColor: 'rgba(63,185,80,0.12)',
  },
  savePresetText: {
    color: '#3FB950',
    fontSize: 10,
    fontWeight: '700',
  },
  notesToggleWrap: {
    alignItems: 'center',
    marginVertical: 8,
  },
  notesToggle: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageWarningBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  ageWarningText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  recentFoodChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  recentFoodChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  foodPresetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
  },
  foodPresetLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  qtyChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  todayCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  quantityQuickButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickQuantityBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickQuantityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  seasonalBox: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  seasonalTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  seasonalBenefit: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  seasonalLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seasonalFoodTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 11,
    fontWeight: '600',
  },
});

