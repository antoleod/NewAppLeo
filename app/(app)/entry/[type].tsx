import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import { Button, Card, Input, Page, Segment } from '@/components/shared';
import { useIconPack } from '@/components/icons/IconPackContext';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';
import { useLocale } from '@/context/LocaleContext';
import { useAuth } from '@/context/AuthContext';
import { useTimer } from '@/context/TimerContext';
import { useTranslation } from '@/hooks/useTranslation';
import { clamp } from '@/utils/date';
import { BreastSide, EntryPayload, EntryRecord, EntryType } from '@/types';
import { TimerWidget } from '@/components/home';
import { QuantityPicker } from '@/components/shared';
import { DateTimeField } from '@/components/shared';
import { VaccineReminderModal } from '@/components/home';
import { DiaperLevelPicker, FullscreenTimerModal } from '@/components/home';
import {
  DiaperSection,
  FeedSection,
  FoodSection,
  MeasurementSection,
  MedicationSection,
  MilestoneSection,
  PumpSection,
  SleepSection,
  SymptomSection,
  TemperatureSection,
  VaccineSection,
} from '@/components/entries';
import { getAppSettings, getSavedMedicines, upsertSavedMedicine, type SavedMedicine } from '@/lib/storage';
import { clearSleepDraft, getSleepDraft, saveSleepDraft, type SleepDraft } from '@/lib/sleepDraft';
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
import {
  typeLabelsI18n,
  typeMeta,
  symptomOptions,
  vaccinePresets,
  foodPresets,
  mealTimes,
  foodDefaultQuantities,
  getRecommendedMealTime,
  buildEntryTitle,
} from '@/lib/entryComposer';

export default function EntryComposerScreen() {
  const { colors, theme } = useTheme();
  const { language } = useLocale();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ type?: string; id?: string; presetAmount?: string; presetMode?: string; presetSide?: string }>();
  const { entries, addEntry, updateEntry, deleteEntry, entryById } = useAppData();
  const { active: globalTimer, start: startGlobalTimer, stop: stopGlobalTimer, minimize: minimizeGlobalTimer } = useTimer();
  const toast = useToast();
  const { FaceHappy, FaceNeutral, FaceSad, AmountAll, AmountHalf, AmountLittle, AmountNone } = useIconPack();
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
  const [poopColor, setPoopColor] = useState<import('@/components/entries/DiaperSection').PoopColor | null>(null);
  const [poopConsistency, setPoopConsistency] = useState<import('@/components/entries/DiaperSection').PoopConsistency | null>(null);
  const [diaperLeaked, setDiaperLeaked] = useState(false);
  const [sleepQuality, setSleepQuality] = useState<import('@/components/entries/SleepSection').SleepQuality | null>(null);
  const minutesSinceLastDiaper = useMemo(() => {
    const last = entries.find((e) => e.type === 'diaper');
    if (!last) return null;
    return Math.max(0, (Date.now() - new Date(last.occurredAt).getTime()) / 60000);
  }, [entries]);
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
  const [temperatureValue, setTemperatureValue] = useState('');
  const [vaccineName, setVaccineName] = useState('');
  const [vaccineDose, setVaccineDose] = useState('1');
  const [vaccineNextDueDate, setVaccineNextDueDate] = useState(new Date());
  const [showReminderFlow, setShowReminderFlow] = useState(false);
  const [reminderStep, setReminderStep] = useState<'vaccine' | 'date'>('vaccine');
  const [reminderVaccineName, setReminderVaccineName] = useState('');
  const [reminderVaccineDate, setReminderVaccineDate] = useState(new Date());
  const [sharingImage, setSharingImage] = useState(false);
  const [showSharePreview, setShowSharePreview] = useState(false);
  const shareCardRef = useRef<View>(null);
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
  const { profile } = useAuth();
  const recentFoodEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.type === 'food' && typeof entry.payload?.foodName === 'string')
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
      .filter((entry) => entry.type === 'food' && entry.payload?.foodName)
      .forEach((entry) => {
        const foodName = entry.payload?.foodName;
        if (!foodName) return;
        const liked = entry.payload?.foodLiked;
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
  useEffect(() => {
    if (!editing) return;
    setOccurredAt(new Date(editing.occurredAt));
    setNotes(editing.notes ?? '');
    setNotesOpen(Boolean(editing.notes));
    setCaregiver(editing.payload?.caregiver ?? '');

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
        setFoodLiked(editing.payload?.foodLiked ?? null);
        setAmountEaten(editing.payload?.amountEaten ?? null);
        setMealTime(editing.payload?.mealTime ?? '');
        break;
      case 'sleep':
      case 'pump':
        setDurationMin(String(editing.payload?.durationMin ?? 30));
        if (editing.type === 'sleep') {
          setSleepQuality((editing.payload?.sleepQuality as any) ?? null);
        }
        if (editing.type === 'pump') {
          setAmountMl(String(editing.payload?.amountMl ?? 120));
        }
        break;
      case 'diaper':
        setPee(String(editing.payload?.pee ?? 0));
        setPoop(String(editing.payload?.poop ?? 0));
        setVomit(String(editing.payload?.vomit ?? 0));
        setPoopColor((editing.payload?.poopColor as any) ?? null);
        setPoopConsistency((editing.payload?.poopConsistency as any) ?? null);
        setDiaperLeaked(Boolean(editing.payload?.diaperLeaked));
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
        if (editing.payload?.intervalHours) {
          setMedIntervalHours(String(editing.payload.intervalHours));
        }
        break;
      case 'milestone':
        setTitle(editing.payload?.title ?? '');
        setIcon(editing.payload?.icon ?? 'sparkles');
        setPhotoUri(editing.payload?.photoUri ?? '');
        break;
      case 'symptom':
        setSymptoms(editing.payload?.tags ?? (editing.payload?.notes ?? '').split(',').map((value) => value.trim()).filter(Boolean));
        break;
      case 'temperature':
        setTemperatureValue(editing.payload?.tempC ? String(editing.payload.tempC) : '');
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
      case 'sleep': {
        // clientId travels with the saved entry so a subsequent draft-resume
        // can detect that this exact sleep session was already saved and
        // refuse to re-save it (prevents duplicates after a save-then-crash).
        const base: any = { durationMin: resolvedDuration, notes };
        if (sleepDraftClientId) base.clientId = sleepDraftClientId;
        if (sleepQuality) base.sleepQuality = sleepQuality;
        return base as EntryPayload;
      }
      case 'diaper': {
        const poopN = clamp(Number(poop) || 0, 0, 9);
        return {
          pee: clamp(Number(pee) || 0, 0, 9),
          poop: poopN,
          vomit: clamp(Number(vomit) || 0, 0, 9),
          poopColor: poopN > 0 && poopColor ? poopColor : undefined,
          poopConsistency: poopN > 0 && poopConsistency ? poopConsistency : undefined,
          diaperLeaked: diaperLeaked || undefined,
          notes,
        };
      }
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
        return { name, dosage, notes, intervalHours: Number(medIntervalHours) || 6 };
      case 'milestone':
        return { title: title || 'Milestone', icon, photoUri: photoUri || undefined, notes };
      case 'symptom':
        return { notes, tags: symptoms };
      case 'temperature':
        return { tempC: temperatureValue ? Number(temperatureValue) : undefined, notes };
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
    return buildEntryTitle({
      type, t,
      feedMode: mode,
      foodName,
      medicationName: name,
      milestoneTitle: title,
      temperatureValue,
      vaccineName,
    });
  }

  // The most common case: parent wakes up and just wants to mark the sleep
  // as ended at the current time. This skips the Resume→Stop dance entirely
  // and saves the entry directly with the elapsed duration. Uses the draft
  // values directly (not component state) to avoid React state-batching
  // timing issues — handleSave's buildPayload closure would otherwise see
  // a stale sleepDraftClientId on this same tick.
  async function endSleepDraftNow(draft: SleepDraft) {
    const alreadySaved = entries.some(
      (entry) => entry.type === 'sleep' && entry.payload?.clientId === draft.clientId,
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

      let savedEntryId = editing?.id ?? '';
      if (editing) {
        await updateEntry(editing.id, { type, title: titleValue, notes, occurredAt: timestamp, payload });
      } else {
        savedEntryId = await addEntry({ type, title: titleValue, notes, occurredAt: timestamp, payload });
      }
      if (type === 'medication' && name.trim()) {
        setSavedMedicines(await upsertSavedMedicine({ name, dosage }));
        const reminderEntry: EntryRecord = {
          id: editing?.id ?? `med_${Date.now()}`,
          type,
          title: titleValue,
          notes,
          occurredAt: timestamp,
          payload,
        };
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

      // Diaper: always close the modal and land on home so the user sees
      // their entry immediately in recent activity.
      if (type === 'diaper' && !editing) {
        toast.success(t('diaper.savedToast'));
        if (router.canGoBack()) router.back();
        else router.replace('/home');
        return;
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
      (entry) => entry.type === 'sleep' && entry.payload?.clientId === sleepDraftClientId,
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
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/home');
            }}
            onPressIn={() => {
              closeScale.value = withSpring(0.88, { damping: 10, stiffness: 300 });
              closeRotate.value = withTiming(45, { duration: 180 });
            }}
            onPressOut={() => {
              closeScale.value = withSpring(1, { damping: 8, stiffness: 200 });
              closeRotate.value = withSpring(0, { damping: 8, stiffness: 200 });
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
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
          <FeedSection
            mode={mode} setMode={setMode}
            amountMl={amountMl} setAmountMl={setAmountMl}
            durationMin={durationMin} setDurationMin={setDurationMin}
            side={side} setSide={setSide}
            largeTouchMode={largeTouchMode}
          />
        )}

        {type === 'food' && (
          <FoodSection
            editing={Boolean(editing)}
            foodName={foodName} setFoodName={setFoodName}
            quantityGrams={quantityGrams} setQuantityGrams={setQuantityGrams}
            mealTime={mealTime} setMealTime={setMealTime}
            foodAllergies={foodAllergies} setFoodAllergies={setFoodAllergies}
            foodMoreOpen={foodMoreOpen} setFoodMoreOpen={setFoodMoreOpen}
          />
        )}


        {type === 'sleep' && (
          <SleepSection
            editing={Boolean(editing)}
            activeSleepDraft={activeSleepDraft}
            sleepInputMode={sleepInputMode}
            setSleepInputMode={setSleepInputMode}
            sleepTimerRunning={sleepTimerRunning}
            setSleepTimerRunning={setSleepTimerRunning}
            durationMin={durationMin}
            setDurationMin={setDurationMin}
            sleepStopToken={sleepStopToken}
            saving={saving}
            largeTouchMode={largeTouchMode}
            onEndDraftNow={(d) => void endSleepDraftNow(d)}
            onResumeDraft={resumeSleepDraft}
            onDiscardDraft={confirmDiscardSleepDraft}
            occurredAt={occurredAt}
            sleepQuality={sleepQuality}
            setSleepQuality={setSleepQuality}
          />
        )}

        {type === 'diaper' && (
          <DiaperSection
            pee={pee} setPee={setPee}
            poop={poop} setPoop={setPoop}
            vomit={vomit} setVomit={setVomit}
            poopColor={poopColor} setPoopColor={setPoopColor}
            poopConsistency={poopConsistency} setPoopConsistency={setPoopConsistency}
            diaperLeaked={diaperLeaked} setDiaperLeaked={setDiaperLeaked}
            minutesSinceLast={minutesSinceLastDiaper}
          />
        )}

        {type === 'pump' && (
          <PumpSection
            durationMin={durationMin}
            setDurationMin={setDurationMin}
            amountMl={amountMl}
            setAmountMl={setAmountMl}
            largeTouchMode={largeTouchMode}
          />
        )}

        {type === 'measurement' && (
          <MeasurementSection
            weightKg={weightKg} setWeightKg={setWeightKg}
            heightCm={heightCm} setHeightCm={setHeightCm}
            headCircCm={headCircCm} setHeadCircCm={setHeadCircCm}
            tempC={tempC} setTempC={setTempC}
            babyBirthDate={profile?.babyBirthDate}
            lastMeasurementEntry={lastMeasurementEntry}
          />
        )}

        {type === 'medication' && (
          <MedicationSection
            typeLabel={typeLabel}
            name={name} setName={setName}
            dosage={dosage} setDosage={setDosage}
            medIntervalHours={medIntervalHours} setMedIntervalHours={setMedIntervalHours}
            savedMedicines={savedMedicines} setSavedMedicines={setSavedMedicines}
            occurredAt={occurredAt}
          />
        )}

        {type === 'milestone' && (
          <MilestoneSection
            title={title}
            setTitle={setTitle}
            icon={icon}
            setIcon={setIcon}
            photoUri={photoUri}
            setPhotoUri={setPhotoUri}
          />
        )}

        {type === 'symptom' && (
          <SymptomSection symptoms={symptoms} onChange={setSymptoms} />
        )}

        {type === 'temperature' && (
          <TemperatureSection value={temperatureValue} onChange={setTemperatureValue} />
        )}

        {type === 'vaccine' && (
          <VaccineSection
            vaccineName={vaccineName}
            setVaccineName={setVaccineName}
            vaccineDose={vaccineDose}
            setVaccineDose={setVaccineDose}
            vaccineNextDueDate={vaccineNextDueDate}
            setVaccineNextDueDate={setVaccineNextDueDate}
            onOpenReminder={() => setShowReminderFlow(true)}
          />
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

      {/* Food done sheet — two focused questions, no redundant info */}
      <Modal visible={showFoodDoneModal} animationType="slide" transparent statusBarTranslucent>
        <Pressable
          onPress={() => { setShowFoodDoneModal(false); router.back(); }}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.62)' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.bgCard,
              borderTopLeftRadius: 28, borderTopRightRadius: 28,
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: Math.max(28, insets.bottom + 16),
              ...shadow(theme.textPrimary, 0.3, 24, 0, -6),
              elevation: 20,
            }}
          >
            {/* Drag handle */}
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: `${theme.textMuted}40` }} />
            </View>

            {/* Compact header: just the dish name */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <Text style={{ fontSize: 20 }}>✅</Text>
              <Text
                style={{ flex: 1, color: theme.textPrimary, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 }}
                numberOfLines={1}
              >
                {lastSavedFood.name || t('food.savedTitle')}
              </Text>
              <Pressable
                onPress={() => { setShowFoodDoneModal(false); router.back(); }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t('common.skip')}
              >
                <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '600' }}>{t('common.skip')}</Text>
              </Pressable>
            </View>

            {/* Q1: did he like it? — 3 clear options */}
            <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
              {t('food.feedbackLiked')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
              {([
                { value: 'yes' as const,     Glyph: FaceHappy,   tone: '#56D364', tKey: 'food.likedYes' },
                { value: 'neutral' as const, Glyph: FaceNeutral, tone: '#8EB5EA', tKey: 'food.likedNeutral' },
                { value: 'no' as const,      Glyph: FaceSad,     tone: '#E07A7A', tKey: 'food.likedNo' },
              ]).map(({ value, Glyph, tone, tKey }) => {
                const selected = foodLiked === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => {
                      haptics.selection();
                      setFoodLiked(value);
                      if (lastSavedFoodEntryId) {
                        const entry = entries.find((e) => e.id === lastSavedFoodEntryId);
                        if (entry) {
                          void updateEntry(lastSavedFoodEntryId, { payload: { ...entry.payload, foodLiked: value } });
                        }
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={t(tKey)}
                    style={({ pressed }) => ({
                      flex: 1, minHeight: 60,
                      borderRadius: 14,
                      alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? tone : `${theme.textMuted}25`,
                      backgroundColor: selected ? `${tone}1A` : pressed ? `${theme.textMuted}10` : 'transparent',
                    })}
                  >
                    <Glyph size={26} color={tone} />
                    <Text style={{ fontSize: 10, fontWeight: selected ? '800' : '600', color: selected ? tone : theme.textMuted }}>
                      {t(tKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Q2: how much did he eat? — 4 portion icons */}
            <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
              {t('food.feedbackAmount')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 22 }}>
              {([
                { value: 'all' as const,    Glyph: AmountAll,    tone: '#56D364', tKey: 'food.amountAll' },
                { value: 'half' as const,   Glyph: AmountHalf,   tone: '#F0B85A', tKey: 'food.amountHalf' },
                { value: 'little' as const, Glyph: AmountLittle, tone: '#F0B85A', tKey: 'food.amountLittle' },
                { value: 'none' as const,   Glyph: AmountNone,   tone: '#E07A7A', tKey: 'food.amountNone' },
              ]).map(({ value, Glyph, tone, tKey }) => {
                const selected = amountEaten === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => {
                      haptics.selection();
                      setAmountEaten(value);
                      if (lastSavedFoodEntryId) {
                        const entry = entries.find((e) => e.id === lastSavedFoodEntryId);
                        if (entry) {
                          void updateEntry(lastSavedFoodEntryId, { payload: { ...entry.payload, amountEaten: value } });
                        }
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={t(tKey)}
                    style={({ pressed }) => ({
                      flex: 1, minHeight: 60,
                      borderRadius: 14,
                      alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? tone : `${theme.textMuted}25`,
                      backgroundColor: selected ? `${tone}1A` : pressed ? `${theme.textMuted}10` : 'transparent',
                    })}
                  >
                    <Glyph size={26} color={tone} />
                    <Text style={{ fontSize: 10, fontWeight: selected ? '800' : '600', color: selected ? tone : theme.textMuted }}>
                      {t(tKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Single primary CTA — secondary action is the "Skip" link in the header */}
            <Pressable
              onPress={() => { setShowFoodDoneModal(false); resetFoodForm(); }}
              style={({ pressed }) => ({
                backgroundColor: meta.tone, borderRadius: 14, height: 50,
                alignItems: 'center', justifyContent: 'center',
                opacity: pressed ? 0.86 : 1,
                ...shadow(meta.tone, 0.3, 10, 0, 3),
              })}
            >
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 15, letterSpacing: 0.1 }}>
                + {t('food.addAnother')}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Share preview modal */}
      {editing && (
        <Modal visible={showSharePreview} transparent animationType="fade" onRequestClose={() => setShowSharePreview(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <View ref={shareCardRef} collapsable={false}>
              <ShareCard entry={editing} babyName={profile?.babyName} lang={language} />
            </View>

            <View style={{ width: '100%', gap: 10, marginTop: 24 }}>
              <Pressable
                onPress={() => {
                  setSharingImage(true);
                  setTimeout(() => {
                    if (!editing) return;
                    void shareEntryAsImage(
                      () => captureRef(shareCardRef, { format: 'png', quality: 1.0, result: 'tmpfile' }),
                      editing,
                      profile?.babyName ?? '',
                      language,
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
    {!(type === 'sleep' && !editing) && (
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
          accessibilityRole="button"
          accessibilityState={{ busy: saving, disabled: saving }}
          accessibilityLabel={editing ? t('common.update', 'Update') : t('common.save')}
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
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace('/home');
              }}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
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

