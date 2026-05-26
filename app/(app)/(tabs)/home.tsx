import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Page, SkeletonCard, SyncStatusBadge , QuantityPicker } from '@/components/shared';
import { useIconPack } from '@/components/icons/IconPackContext';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { useTimer } from '@/context/TimerContext';
import { useTranslation } from '@/hooks/useTranslation';
import { BreastSide, EntryRecord } from '@/types';
import { buildSmartAlerts } from '@/lib/patterns';
import { useFeedingSettings } from '@/hooks/useFeedingSettings';
import {
  defaultAppSettings,
  getActiveBaby,
  getBabies,
  getAppSettings,
  getLastBottleAmount,
  getMomHydration,
  setActiveBabyId,
  setLastBottleAmount,
  setMomHydration,
  getDeviceDisplayName,
  updateAppSettings,
} from '@/lib/storage';

import { FullscreenTimerModal , NextFeedingCard } from '@/components/home';

import { GetEntryIcon , BottleIcon, BreastfeedingIcon } from '@/components/history';

import ReanimatedSwipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import { confirmAction } from '@/lib/confirm';
import { haptics } from '@/lib/haptics';
import { mealTones } from '@/lib/entryComposer';
import { shadow, textShadow } from '@/lib/shadow';

const DEFAULT_SECTION_ORDER = [
  'nextFeed','statsStrip','quickAdd','smartSignals',
  'milkProgress','healthFood','recentActivity','foodHistory','growth','hydration',
] as const;

const ENTRY_COLORS: Record<string, string> = {
  feed: '#C9A227',
  sleep: '#3B82F6',
  diaper: '#F59E0B',
  food: '#D97706',
  temperature: '#EF4444',
  medication: '#06B6D4',
  vaccine: '#22C55E',
  measurement: '#8B5CF6',
  symptom: '#EC4899',
};

type QuickTimerMode = 'breast' | 'bottle' | null;

function getHourPeriod(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function localeTag(language: string) {
  if (language === 'es') return 'es-ES';
  if (language === 'en') return 'en-US';
  if (language === 'nl') return 'nl-BE';
  return 'fr-FR';
}

function hoursSince(timestamp?: string) {
  if (!timestamp) return null;
  return Math.max(0, (Date.now() - new Date(timestamp).getTime()) / 36e5);
}

function formatRelative(timestamp: string | undefined, locale: string) {
  const hours = hoursSince(timestamp);
  if (hours === null) return '--';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${String(m).padStart(2, '0')}`;
  }
  const dayAbbr = locale.startsWith('fr') ? 'j' : 'd';
  return `${Math.round(hours / 24)} ${dayAbbr}`;
}

function formatClock(timestamp: string | undefined, locale: string) {
  if (!timestamp) return '--:--';
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
}

function calculateBabyAge(birthDate: string) {
  const birth = new Date(birthDate);
  const today = new Date();
  let months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
  let days = today.getDate() - birth.getDate();
  if (days < 0) {
    months--;
    const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += lastMonth.getDate();
  }
  return { months, days };
}

function getEntryDisplayLabel(entry: EntryRecord, t: (key: string) => string): string {
  switch (entry.type) {
    case 'feed':
      return entry.payload?.mode === 'breast' ? t('entry.titleFeedBreast') : t('entry.titleFeedBottle');
    case 'sleep':
      return t('entry.titleSleep');
    case 'diaper':
      return t('entry.diaper');
    case 'food':
      return entry.payload?.foodName || t('entry.titleFoodDefault');
    case 'temperature':
      return t('entry.titleTemperatureReading');
    case 'medication':
      return entry.payload?.name || t('entry.medicine');
    case 'vaccine':
      return entry.payload?.vaccineName || t('entry.vaccine');
    case 'measurement':
      return t('entry.measurement');
    case 'symptom':
      return t('entry.symptoms');
    default:
      return entry.title;
  }
}

function getEntryDetail(entry: EntryRecord, t: (key: string) => string, _locale: string): string {
  switch (entry.type) {
    case 'feed':
      if (entry.payload?.mode === 'bottle' && entry.payload?.amountMl) return `${entry.payload.amountMl} ml`;
      if (entry.payload?.mode === 'breast') {
        const parts = [];
        if (entry.payload?.durationMin) parts.push(`${entry.payload.durationMin} min`);
        return parts.join(' · ');
      }
      return '';
    case 'sleep':
      if (!entry.payload?.durationMin) return '';
      return entry.payload.durationMin >= 60
        ? `${Math.floor(entry.payload.durationMin / 60)}h${String(entry.payload.durationMin % 60).padStart(2, '0')}`
        : `${entry.payload.durationMin} min`;
    case 'food':
      return entry.payload?.quantityGrams ? `${entry.payload.quantityGrams}g` : '';
    case 'temperature':
      return entry.payload?.tempC ? `${entry.payload.tempC}°C` : '';
    case 'medication':
      return entry.payload?.dosage || '';
    case 'vaccine':
      return entry.payload?.vaccineDose ? `${t('vaccine.dose')}${entry.payload.vaccineDose}` : '';
    case 'measurement':
      return [
        entry.payload?.weightKg ? `${entry.payload.weightKg} kg` : '',
        entry.payload?.heightCm ? `${entry.payload.heightCm} cm` : '',
      ].filter(Boolean).join(' · ');
    default:
      return entry.notes || '';
  }
}

function getWeightMeasurements(entries: EntryRecord[]) {
  return entries
    .filter((e) => e.type === 'measurement' && e.payload?.weightKg)
    .slice(0, 5)
    .map((e) => ({
      weight: e.payload.weightKg,
      date: new Date(e.occurredAt),
    }))
    .reverse();
}

function getPinnedVaccines(entries: EntryRecord[]) {
  return entries
    .filter((e) => e.type === 'vaccine' && e.payload?.hasReminder)
    .sort((a, b) => {
      const dateA = new Date(a.payload?.vaccineNextDueDate ?? '').getTime();
      const dateB = new Date(b.payload?.vaccineNextDueDate ?? '').getTime();
      return dateA - dateB;
    })
    .slice(0, 3);
}

function getLastFood(entries: EntryRecord[]) {
  return entries.find((e) => e.type === 'food');
}

function getFoodTodayCount(entries: EntryRecord[]) {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return entries.filter((e) => e.type === 'food' && new Date(e.occurredAt).getTime() >= startOfDay).length;
}

function getFoodAllergyAlerts(entries: EntryRecord[]) {
  const foodEntries = entries.filter((e) => e.type === 'food');
  if (foodEntries.length === 0) return [];

  const alerts: { food: string; count: number }[] = [];
  const allergyFoods = new Map<string, number>();

  foodEntries.slice(0, 20).forEach((entry) => {
    const food = entry.payload?.foodName?.toLowerCase() || '';
    if ((entry.payload?.foodAllergies?.length ?? 0) > 0) {
      allergyFoods.set(food, (allergyFoods.get(food) ?? 0) + 1);
    }
  });

  allergyFoods.forEach((count, food) => {
    if (count >= 2) {
      alerts.push({
        food,
        count,
      });
    }
  });

  return alerts;
}

type DiaperAlert =
  | { kind: 'liquidStreak'; count: number }
  | { kind: 'colorAlert'; color: 'red' | 'dark' };

function getDiaperHealthAlerts(entries: EntryRecord[]): DiaperAlert[] {
  const now = Date.now();
  const last24h = now - 24 * 3600000;
  const last48h = now - 48 * 3600000;
  const alerts: DiaperAlert[] = [];

  let liquidCount = 0;
  let colorAlert: 'red' | 'dark' | null = null;

  for (const e of entries) {
    if (e.type !== 'diaper') continue;
    const ts = new Date(e.occurredAt).getTime();
    if (!Number.isFinite(ts)) continue;
    const poop = Number(e.payload?.poop) || 0;
    if (poop === 0) continue;

    if (ts >= last24h && e.payload?.poopConsistency === 'liquid') liquidCount++;
    if (!colorAlert && ts >= last48h) {
      const c = e.payload?.poopColor;
      if (c === 'red' || c === 'dark') colorAlert = c;
    }
  }

  if (liquidCount >= 2) alerts.push({ kind: 'liquidStreak', count: liquidCount });
  if (colorAlert) alerts.push({ kind: 'colorAlert', color: colorAlert });
  return alerts;
}

type FoodSummary = {
  recent: EntryRecord[];
  mostCommon: { name: string; count: number } | null;
  totalUnique: number;
  totalGramsToday: number;
  mealsToday: number;
};

function getFoodSummary(entries: EntryRecord[]): FoodSummary {
  const empty: FoodSummary = { recent: [], mostCommon: null, totalUnique: 0, totalGramsToday: 0, mealsToday: 0 };
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const foodEntries: EntryRecord[] = [];
  const counts = new Map<string, number>();
  let totalGramsToday = 0;
  let mealsToday = 0;

  for (const entry of entries) {
    if (entry.type !== 'food') continue;
    foodEntries.push(entry);
    const name = entry.payload?.foodName?.toLowerCase();
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    if (new Date(entry.occurredAt).getTime() >= startOfDay) {
      mealsToday++;
      totalGramsToday += entry.payload?.quantityGrams ?? 0;
    }
  }

  if (foodEntries.length === 0) return empty;

  foodEntries.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  let mostCommonName: string | null = null;
  let maxCount = 0;
  counts.forEach((count, name) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommonName = name;
    }
  });

  return {
    recent: foodEntries.slice(0, 8),
    mostCommon: mostCommonName ? { name: mostCommonName, count: maxCount } : null,
    totalUnique: counts.size,
    totalGramsToday,
    mealsToday,
  };
}

type MealKind = 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'other';

function getMealKind(value?: string): MealKind {
  if (value === 'breakfast' || value === 'lunch' || value === 'snack' || value === 'dinner') return value;
  return 'other';
}

const MEAL_TONE: Record<MealKind, string> = mealTones;

type FoodHistoryRowProps = {
  entry: EntryRecord;
  locale: string;
  isToday: boolean;
  mealLabel: string;
  moreLabel: (n: number) => string;
  tokens: { text: string; muted: string; soft: string; gold: string; red: string; border: string };
  onPress: (id: string) => void;
};

const FoodHistoryRow = React.memo(function FoodHistoryRow({
  entry, locale, isToday, mealLabel, moreLabel, tokens, onPress,
}: FoodHistoryRowProps) {
  const p = entry.payload ?? {};
  const kind = getMealKind(p.mealTime);
  const ae = p.amountEaten;
  const liked = p.foodLiked;
  const allergies: string[] = Array.isArray(p.foodAllergies) ? p.foodAllergies : [];
  const hasAllergy = allergies.length > 0;
  const grams = p.quantityGrams;
  const name = p.foodName || '—';
  const pack = useIconPack();
  const mealMap = { breakfast: pack.MealMorning, lunch: pack.MealMidday, snack: pack.MealSnack, dinner: pack.MealEvening, other: pack.MealOther } as const;
  const MealG = mealMap[kind];
  const mealTone = MEAL_TONE[kind];
  const AmountG = ae === 'all' ? pack.AmountAll : ae === 'half' ? pack.AmountHalf : ae === 'little' ? pack.AmountLittle : ae === 'none' ? pack.AmountNone : null;
  const FaceG = liked === 'yes' ? pack.FaceHappy : liked === 'no' ? pack.FaceSad : null;
  const faceTone = liked === 'yes' ? '#56D364' : '#E07A7A';

  return (
    <Pressable
      onPress={() => onPress(entry.id)}
      accessibilityRole="button"
      accessibilityLabel={`${mealLabel} · ${name}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 10,
        marginBottom: 2,
        backgroundColor: pressed
          ? (hasAllergy ? 'rgba(231,76,60,0.10)' : tokens.gold + '22')
          : (isToday ? (hasAllergy ? 'rgba(231,76,60,0.08)' : tokens.gold + '14') : 'transparent'),
        borderLeftWidth: isToday ? 3 : 0,
        borderLeftColor: isToday ? (hasAllergy ? tokens.red : tokens.gold) : 'transparent',
      })}
    >
      <View style={{ width: 24, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={mealLabel}>
        <MealG size={20} color={mealTone} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: tokens.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{name}</Text>
        {(grams || hasAllergy) ? (
          <Text style={{ color: hasAllergy ? tokens.red : tokens.muted, fontSize: 11, marginTop: 2, fontWeight: hasAllergy ? '600' : '500' }} numberOfLines={2}>
            {grams ? `${grams}g` : ''}
            {grams && hasAllergy ? ' · ' : ''}
            {hasAllergy ? `⚠️ ${allergies[0]}${allergies.length > 1 ? ` ${moreLabel(allergies.length - 1)}` : ''}` : ''}
          </Text>
        ) : null}
      </View>
      <View style={{ width: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
        {AmountG ? <AmountG size={14} /> : null}
        {FaceG ? <FaceG size={14} color={faceTone} /> : null}
        <Text style={{ color: tokens.soft, fontSize: 11, fontWeight: '600', minWidth: 38, textAlign: 'right' }}>
          {formatClock(entry.occurredAt, locale)}
        </Text>
      </View>
    </Pressable>
  );
});


export default function HomeScreen() {
  const { language } = useLocale();
  const locale = localeTag(language);
  const { t, format } = useTranslation();
  const { profile, user } = useAuth();
  const { entries, summary, addEntry, deleteEntry, loading, forceReconnect } = useAppData();
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const iconPack = useIconPack();

  const BG = colors.background;
  const CARD = theme.bgCard;
  const BORDER = theme.border;
  const BORDER_SOFT = theme.bgCardAlt;
  const TEXT = theme.textPrimary;
  const TEXT_SECONDARY = theme.textSecondary;
  const MUTED = theme.textMuted;
  const SOFT = theme.textMuted;
  const ACCENT = theme.accent;
  const GOLD = theme.accent;
  const GREEN = theme.green;
  const BLUE = theme.blue;
  const RED = theme.red;
  const YELLOW = theme.yellow;

  const alertToneColor = (tone: 'primary' | 'secondary' | 'success' | 'warning' | 'danger') => {
    if (tone === 'danger') return RED;
    if (tone === 'warning') return YELLOW;
    if (tone === 'success') return GREEN;
    if (tone === 'secondary') return BLUE;
    return GOLD;
  };

  const styles = useMemo(() => StyleSheet.create({
    pageContent: {
      width: '100%',
      maxWidth: 1100,
      alignSelf: 'center',
    },
    sheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.62)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    sheetSafeArea: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetCard: {
      width: '100%',
      maxWidth: 420,
      alignSelf: 'center',
      borderRadius: 20,
      backgroundColor: CARD,
      borderWidth: 1,
      borderColor: BORDER,
      paddingHorizontal: 22,
      paddingVertical: 22,
      gap: 18,
      ...shadow(TEXT, 0.08, 24, 0, 8),
      elevation: 8,
    },
    sheetTitle: {
      color: TEXT,
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    sheetSubtitle: {
      color: MUTED,
      textAlign: 'center',
      fontSize: 13,
      lineHeight: 18,
    },
    sheetActions: {
      gap: 10,
    },
    menuOverlay: {
      flex: 1,
      backgroundColor: 'rgba(10, 10, 10, 0.45)',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    menuSheet: {
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
      maxHeight: '86%',
      borderRadius: 20,
      backgroundColor: CARD,
      borderWidth: 1,
      borderColor: BORDER,
      paddingHorizontal: 18,
      paddingVertical: 18,
      gap: 10,
      ...shadow(TEXT, 0.08, 20, 0, 8),
      elevation: 7,
    },
    menuTitle: {
      color: TEXT,
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    menuSubtitle: {
      color: MUTED,
      fontSize: 12,
      lineHeight: 17,
    },
    choiceGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    customizerGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    customizerItem: {
      flexBasis: '48%',
      minWidth: 140,
      flexGrow: 1,
    },
    switcherOverlay: {
      flex: 1,
      backgroundColor: 'rgba(10, 10, 10, 0.45)',
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
    switcherSheet: {
      width: '100%',
      maxWidth: 560,
      maxHeight: '84%',
      alignSelf: 'center',
      borderRadius: 20,
      backgroundColor: CARD,
      borderWidth: 1,
      borderColor: BORDER,
      paddingHorizontal: 18,
      paddingVertical: 18,
      gap: 12,
      ...shadow(TEXT, 0.08, 20, 0, 8),
      elevation: 7,
    },
    switcherTitle: {
      color: TEXT,
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    switcherHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    switcherBadge: {
      minWidth: 24,
      height: 24,
      paddingHorizontal: 6,
      borderRadius: 999,
      backgroundColor: `${ACCENT}15`,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    switcherSubtitle: {
      color: MUTED,
      fontSize: 12,
      marginTop: 2,
    },
    switcherItem: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: BORDER,
      backgroundColor: CARD,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 4,
    },
    switcherList: {
      maxHeight: 320,
    },
    emptySwitcherCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: BORDER,
      backgroundColor: BG,
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 8,
      alignItems: 'flex-start',
    },
    emptyIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: BORDER,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: CARD,
    },
    emptySwitcherTitle: {
      color: TEXT,
      fontSize: 14,
      fontWeight: '700',
    },
    emptySwitcherSubtitle: {
      color: MUTED,
      fontSize: 12,
      lineHeight: 17,
    },
    switcherFooter: {
      gap: 8,
    },
  }), [CARD, BORDER, TEXT, MUTED, ACCENT, BG]);

  const [hydration, setHydration] = useState(0);
  const [babyId, setBabyId] = useState<string | null>(null);
  const [babies, setBabies] = useState<{ id: string; name: string; birthDate: string }[]>([]);
  const [appSettings, setAppSettingsState] = useState(defaultAppSettings);
  const { active: activeTimer, elapsedSeconds: globalElapsed, start: startTimer, stop: stopTimer, minimize: minimizeTimer } = useTimer();
  const quickTimerMode: QuickTimerMode = activeTimer && (activeTimer.kind === 'breast' || activeTimer.kind === 'bottle')
    ? activeTimer.kind
    : null;
  const timerStartedAt = quickTimerMode ? activeTimer!.startedAt : null;
  const timerElapsedSeconds = quickTimerMode ? globalElapsed : 0;
  const isTimerMinimized = Boolean(activeTimer?.minimized && quickTimerMode);
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [showBabySwitcher, setShowBabySwitcher] = useState(false);
  const [showHomeCustomizer, setShowHomeCustomizer] = useState(false);
  const [showNextFeedPicker, setShowNextFeedPicker] = useState(false);
  const [quickAmount, setQuickAmount] = useState(150);
  const [quickFeedSide, setQuickFeedSide] = useState<BreastSide>('left');
  const [refreshing, setRefreshing] = useState(false);
  const [lastHydrationDelta, setLastHydrationDelta] = useState<number | null>(null);
  const [defaultFeedingMode, setDefaultFeedingMode] = useState<'breast' | 'bottle'>('bottle');
  const [deviceDisplayName, setDeviceDisplayName] = useState('');
  const swipeableRefs = useRef<Map<string, React.RefObject<SwipeableMethods | null>>>(new Map());

  const feedEntries = useMemo(() => entries.filter((entry) => entry.type === 'feed'), [entries]);
  const lastMeasurement = useMemo(() => entries.find((entry) => entry.type === 'measurement'), [entries]);

  const totalMilkToday = useMemo(() => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const todayFeeds = entries.filter(
      (e) => e.type === 'feed' && new Date(e.occurredAt).getTime() >= startOfDay,
    );
    const breastMl = todayFeeds
      .filter((e) => e.payload?.mode === 'breast')
      .reduce((sum, e) => sum + (e.payload?.amountMl ?? 0), 0);
    return summary.today.bottleMl + breastMl;
  }, [entries, summary.today.bottleMl]);

  const feedingCfg = useFeedingSettings();
  const smartAlerts = useMemo(() => buildSmartAlerts(entries, profile, feedingCfg, { t, format }), [entries, profile, feedingCfg, t, format]);
  const urgentAlerts = smartAlerts.filter((a) => a.tone === 'warning' || a.tone === 'danger');
  const healthStatus = useMemo(() => {
    const lastTemp = entries.find((e) => e.type === 'temperature' || (e.type === 'measurement' && e.payload?.tempC));
    const tempC = lastTemp?.payload?.tempC;
    if (!tempC) return { status: 'unknown', color: MUTED, label: t('health.noData') };
    if (tempC < 37.5) return { status: 'normal', color: GREEN, label: t('health.normal') };
    if (tempC < 38) return { status: 'fever_low', color: YELLOW, label: t('health.feverLow') };
    return { status: 'fever', color: RED, label: t('health.fever') };
  }, [entries, t, GREEN, MUTED, RED, YELLOW]);
  const hasHealthData = healthStatus.status !== 'unknown';
  const weightMeasurements = useMemo(() => getWeightMeasurements(entries), [entries]);
  const pinnedVaccines = useMemo(() => getPinnedVaccines(entries), [entries]);
  const lastFood = useMemo(() => getLastFood(entries), [entries]);
  const foodTodayCount = useMemo(() => getFoodTodayCount(entries), [entries]);
  const foodAllergyAlerts = useMemo(() => getFoodAllergyAlerts(entries), [entries]);
  const diaperHealthAlerts = useMemo(() => getDiaperHealthAlerts(entries), [entries]);
  const foodSummary = useMemo(() => getFoodSummary(entries), [entries]);
  const { recent: foodHistory, mealsToday, totalGramsToday, mostCommon: foodMostCommon } = foodSummary;

  // Weekly bottle trend: this week avg ml vs last week avg ml
  const weeklyBottleTrend = useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const bottleFeeds = feedEntries.filter((e) => e.payload?.mode === 'bottle');
    const thisWeek = bottleFeeds.filter((e) => now - new Date(e.occurredAt).getTime() < weekMs);
    const lastWeek = bottleFeeds.filter((e) => {
      const age = now - new Date(e.occurredAt).getTime();
      return age >= weekMs && age < 2 * weekMs;
    });
    const avg = (arr: typeof bottleFeeds) =>
      arr.length ? Math.round(arr.reduce((s, e) => s + (e.payload?.amountMl ?? 0), 0) / arr.length) : null;
    return { thisAvg: avg(thisWeek), lastAvg: avg(lastWeek), thisCount: thisWeek.length };
  }, [feedEntries]);

  // Active medications (last 72h), deduplicated by name
  const activeMeds = useMemo(() => {
    const cutoff = Date.now() - 72 * 60 * 60 * 1000;
    const seen = new Set<string>();
    return entries.filter((e) => {
      if (e.type !== 'medication') return false;
      if (new Date(e.occurredAt).getTime() < cutoff) return false;
      const name = (e.payload?.name ?? '').toLowerCase();
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }, [entries]);

  // Detect missing tracking categories
  const hasAnySleep = useMemo(() => entries.some((e) => e.type === 'sleep'), [entries]);
  const hasAnyDiaper = useMemo(() => entries.some((e) => e.type === 'diaper'), [entries]);

  const milkProgress = useSharedValue(0);

  const milkBarStyle = useAnimatedStyle(() => ({
    width: `${milkProgress.value}%`,
  }));

  // Tracks the last time refreshDashboard fully ran so we can dedupe rapid
  // AppState toggles (lock-screen peek, app-switcher, etc.) that otherwise
  // trigger a full cascade of AsyncStorage reads + state setters → blink.
  const lastRefreshRef = useRef(0);

  const refreshDashboard = React.useCallback(async () => {
    // Compute everything first, then commit ALL state in one synchronous
    // burst so React 18 auto-batches them into a single render. Without this
    // the 7 sequential `setX(await ...)` calls each trigger a re-render,
    // which is the source of the foreground "blink".
    const [babiesNext, activeBaby, settings, deviceName, quickAmt] = await Promise.all([
      getBabies(),
      getActiveBaby(),
      getAppSettings(),
      getDeviceDisplayName(),
      getLastBottleAmount(),
    ]);
    if (!activeBaby) {
      setBabies(babiesNext);
      setAppSettingsState(settings);
      setDeviceDisplayName(deviceName);
      setQuickAmount(quickAmt);
      return;
    }

    const hydrationDateKey = `appleo.momHydrationDate:${activeBaby.id}`;
    const todayDate = new Date().toISOString().slice(0, 10);
    const [storedHydrationDate, hydratedValue] = await Promise.all([
      AsyncStorage.getItem(hydrationDateKey),
      getMomHydration(activeBaby.id),
    ]);
    let currentHydration: number;
    if (storedHydrationDate !== todayDate) {
      currentHydration = 0;
      await setMomHydration(activeBaby.id, 0);
      await AsyncStorage.setItem(hydrationDateKey, todayDate);
    } else {
      currentHydration = hydratedValue;
    }
    const storedFeedingMode = (settings as any).defaultFeedingMode;

    // Single synchronous batch — React 18 collapses these into ONE render.
    setBabies(babiesNext);
    setBabyId(activeBaby.id);
    setHydration(currentHydration);
    setAppSettingsState(settings);
    if (storedFeedingMode === 'breast' || storedFeedingMode === 'bottle') {
      setDefaultFeedingMode(storedFeedingMode);
    }
    setDeviceDisplayName(deviceName);
    setQuickAmount(quickAmt);
    lastRefreshRef.current = Date.now();
  }, []);

  const onPullToRefresh = React.useCallback(async () => {
    setRefreshing(true);
    haptics.light();
    // Pull-to-refresh now forces a real Firestore reattach in addition to
    // the local dashboard refresh. Previously it only re-read AsyncStorage,
    // so the user could pull all day without ever fetching new remote data.
    try {
      forceReconnect();
      await refreshDashboard();
    } finally {
      // Brief delay so the native spinner finishes its animation cleanly.
      setTimeout(() => setRefreshing(false), 400);
    }
  }, [refreshDashboard, forceReconnect]);

  useEffect(() => {
    void refreshDashboard();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      // Dedupe: skip if we just refreshed within 3 s (lock-screen peek,
      // notification-overlay dismiss, multi-window switching, etc.).
      if (Date.now() - lastRefreshRef.current < 3000) return;
      void refreshDashboard();
    });
    return () => subscription.remove();
  }, [refreshDashboard]);

  useEffect(() => {
    const validIds = new Set(entries.map((e) => e.id));
    const refs = swipeableRefs.current;
    refs.forEach((_, id) => { if (!validIds.has(id)) refs.delete(id); });
  }, [entries]);

  function startQuickTimer(mode: 'breast' | 'bottle', side: BreastSide = 'left') {
    haptics.medium();
    setQuickFeedSide(side);
    startTimer(mode, { side });
  }

  async function saveQuickTimerEntry() {
    if (!timerStartedAt || !quickTimerMode) return;
    const elapsed = timerElapsedSeconds;
    const mode = quickTimerMode;
    await addEntry({
      type: 'feed',
      title: mode === 'breast' ? t('entry.titleFeedBreast') : t('entry.titleFeedBottle'),
      occurredAt: new Date(timerStartedAt).toISOString(),
      payload:
        mode === 'breast'
          ? {
              // Breast feeds have no real ml — tracked by duration + side only.
              mode: 'breast',
              side: quickFeedSide,
              durationMin: Math.max(1, Math.round(elapsed / 60)),
            }
          : {
              mode: 'bottle',
              amountMl: quickAmount,
              durationMin: Math.max(1, Math.round(elapsed / 60)),
            },
    });
    haptics.success();
    if (mode === 'bottle') {
      void setLastBottleAmount(quickAmount);
    }
    stopTimer();
    setShowSaveSheet(false);
    setQuickAmount(await getLastBottleAmount());
    setQuickFeedSide('left');
  }

  async function updateDashboardMetric(key: keyof typeof appSettings.dashboardMetrics, enabled: boolean) {
    const next = await updateAppSettings({
      dashboardMetrics: {
        ...appSettings.dashboardMetrics,
        [key]: enabled,
      },
    });
    setAppSettingsState(next);
  }

  async function restoreHomeCustomization() {
    const next = await updateAppSettings({
      dashboardMetrics: {
        ...defaultAppSettings.dashboardMetrics,
      },
    });
    setAppSettingsState(next);
    setShowHomeCustomizer(false);
  }



  async function switchBaby(nextBaby: { id: string }) {
    await setActiveBabyId(nextBaby.id);
    setBabyId(nextBaby.id);
    setHydration(await getMomHydration(nextBaby.id));
    setShowBabySwitcher(false);
  }

  function openNextFeedPicker() {
    if (defaultFeedingMode === 'breast') {
      setShowNextFeedPicker(true);
    } else {
      startQuickTimer('bottle');
    }
  }

  function beginNextFeed(mode: 'bottle' | 'breast', side: BreastSide = 'left') {
    setShowNextFeedPicker(false);
    startQuickTimer(mode, side);
  }

  const activeBabyName = babies.find((baby) => baby.id === babyId)?.name ?? profile?.babyName ?? 'Leo';
  const activeBaby = babies.find((baby) => baby.id === babyId);
  const babyAge = activeBaby ? calculateBabyAge(activeBaby.birthDate) : null;

  // Dynamic milk goal: age-adjusted, fallback to stored setting (default 600ml for 6+ months)
  const milkGoalTarget = useMemo(() => {
    if (activeBaby) {
      const age = calculateBabyAge(activeBaby.birthDate);
      if (age.months < 3) return 750;
      if (age.months < 6) return 680;
    }
    return appSettings.milkGoalMl;
  }, [activeBaby, appSettings.milkGoalMl]);

  const milkGoalMin = Math.round(milkGoalTarget * 0.75);
  const milkGoalMax = Math.round(milkGoalTarget * 1.3);
  const milkTargetPercent = Math.max(0, Math.min(100, (totalMilkToday / milkGoalTarget) * 100));

  useEffect(() => {
    milkProgress.value = withTiming(milkTargetPercent, { duration: 800 });
  }, [milkProgress, milkTargetPercent]);

  const milkStatus =
    totalMilkToday < milkGoalMin
      ? t('milk.belowTarget')
      : totalMilkToday > milkGoalMax
        ? t('milk.aboveTarget')
        : t('milk.inTarget');


  const recentEntries = useMemo(() => entries.slice(0, 6), [entries]);

  const activeFeedTitle =
    quickTimerMode === 'bottle'
      ? t('feeding.bottle')
      : quickFeedSide === 'both'
        ? t('modal.bothSides')
        : quickFeedSide === 'right'     
          ? t('modal.rightBreast')
          : t('modal.leftBreast');
  const activeFeedSubtitlePrefix =
    quickTimerMode === 'bottle'
      ? t('feeding.bottle')
      : quickFeedSide === 'both'
        ? t('modal.bothSides')
        : quickFeedSide === 'right'
          ? t('modal.rightBreast')
          : t('modal.leftBreast');

  const resolvedDisplayName = useMemo(() => {
    const fromDevice = deviceDisplayName.trim();
    if (fromDevice) return fromDevice;
    const fromCaregiver = (profile?.caregiverName ?? '').trim();
    if (fromCaregiver) return fromCaregiver;
    const fromProfile = (profile?.displayName ?? '').trim();
    if (fromProfile && fromProfile.toLowerCase() !== 'local') return fromProfile;
    const fromUserName = (user?.displayName ?? '').trim();
    if (fromUserName) return fromUserName;
    const fromUserEmail = (user?.email ?? '').trim();
    if (fromUserEmail.includes('@')) return fromUserEmail.split('@')[0];
    const fromProfileEmail = (profile?.authEmail ?? '').trim();
    if (fromProfileEmail && fromProfileEmail !== 'local@example.com' && fromProfileEmail.includes('@')) {
      return fromProfileEmail.split('@')[0];
    }
    return 'Parent';
  }, [deviceDisplayName, profile?.authEmail, profile?.caregiverName, profile?.displayName, user?.displayName, user?.email]);

  const dm = appSettings.dashboardMetrics;
  const sectionOrder: string[] = dm.sectionOrder?.length
    ? (dm.sectionOrder as unknown as string[])
    : [...DEFAULT_SECTION_ORDER];

  const CONFIGURABLE_SECTIONS = [
    { key: 'nextFeed',       label: t('modal.nextFeeding') },
    { key: 'statsStrip',     label: t('modal.statsStrip') },
    { key: 'quickAdd',       label: t('modal.quickAdd') },
    { key: 'smartSignals',   label: t('modal.alerts') },
    { key: 'milkProgress',   label: t('modal.milkProgress') },
    { key: 'healthFood',     label: t('modal.healthFood') },
    { key: 'recentActivity', label: t('modal.recentActivity') },
    { key: 'foodHistory',    label: t('modal.foodHistory') },
    { key: 'growth',         label: t('modal.growth') },
    { key: 'hydration',      label: t('modal.hydration') },
  ];

  async function moveSection(key: string, direction: 'up' | 'down') {
    const idx = sectionOrder.indexOf(key);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sectionOrder.length - 1) return;
    const next = [...sectionOrder];
    const swap = direction === 'up' ? idx - 1 : idx + 1;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    const updated = await updateAppSettings({ dashboardMetrics: { ...dm, sectionOrder: next } as any });
    setAppSettingsState(updated);
  }

  function renderSection(key: string): React.ReactNode {
    switch (key) {
      case 'nextFeed':
        if (dm.nextFeed === false) return null;
        return (
          <Animated.View entering={FadeIn.duration(300).delay(60)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <NextFeedingCard onPress={openNextFeedPicker} />
          </Animated.View>
        );

      case 'statsStrip':
        if (dm.statsStrip === false) return null;
        return (
          <Animated.View entering={FadeInDown.duration(260).delay(100)} style={{ paddingHorizontal: 20, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD, overflow: 'hidden' }}>
              {[
                { emoji: '🍼', value: summary.today.feedCount > 0 ? String(summary.today.feedCount) : '–', label: t('insights.feeds') },
                {
                  emoji: '😴',
                  value: summary.today.sleepMinutes > 0
                    ? Math.floor(summary.today.sleepMinutes / 60) > 0
                      ? `${Math.floor(summary.today.sleepMinutes / 60)}h`
                      : `${summary.today.sleepMinutes}m`
                    : '–',
                  label: t('insights.sleep'),
                },
                { emoji: '🧷', value: summary.today.diaperCount > 0 ? String(summary.today.diaperCount) : '–', label: t('insights.diapers') },
              ].map((item, idx, arr) => (
                <View
                  key={item.label}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={`${item.label}: ${item.value}`}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderRightWidth: idx < arr.length - 1 ? 1 : 0,
                    borderRightColor: BORDER,
                  }}
                >
                  <Text accessibilityElementsHidden style={{ fontSize: 18, marginBottom: 2 }}>{item.emoji}</Text>
                  <Text accessibilityElementsHidden style={{ color: TEXT, fontSize: 17, fontWeight: '700', letterSpacing: -0.3 }}>{item.value}</Text>
                  <Text accessibilityElementsHidden style={{ color: MUTED, fontSize: 10, fontWeight: '500', marginTop: 1 }}>{item.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        );

      case 'quickAdd':
        if (dm.quickAdd === false) return null;
        return (
          <Animated.View entering={FadeInDown.duration(260).delay(120)} style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Text style={{ color: MUTED, fontSize: 11, fontWeight: '500', marginBottom: 10, paddingHorizontal: 2 }}>
              {t('home.addEntry')}
            </Text>
            {(() => {
              const actions = [
                { type: 'diaper', label: t('entry.diaper'), color: ENTRY_COLORS.diaper },
                { type: 'temperature', label: t('entry.temperature'), color: ENTRY_COLORS.temperature },
                { type: 'vaccine', label: t('entry.vaccine'), color: ENTRY_COLORS.vaccine },
                { type: 'symptom', label: t('entry.symptoms'), color: ENTRY_COLORS.symptom },
                { type: 'food', label: t('entry.food'), color: ENTRY_COLORS.food },
                { type: 'medication', label: t('entry.medicine'), color: ENTRY_COLORS.medication },
                { type: 'measurement', label: t('entry.measurement'), color: ENTRY_COLORS.measurement },
                { type: 'sleep', label: t('entry.sleep'), color: ENTRY_COLORS.sleep },
              ];
              const timerKindForType: Record<string, 'sleep' | 'pump' | undefined> = {
                sleep: 'sleep',
                pump: 'pump',
              };
              const renderRow = (rowItems: typeof actions, isFirst: boolean) => (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: isFirst ? 0 : 8 }}>
                  {rowItems.map((action) => {
                    const tk = timerKindForType[action.type];
                    const running = Boolean(tk && activeTimer?.kind === tk);
                    return (
                      <Pressable
                        key={action.type}
                        onPress={() => router.push(`/entry/${action.type}` as any)}
                        accessibilityRole="button"
                        accessibilityLabel={running ? `${action.label} · ${t('timer.running')}` : action.label}
                        style={({ pressed }) => ({
                          flex: 1,
                          aspectRatio: 1,
                          borderRadius: 16,
                          backgroundColor: pressed ? `${action.color}12` : CARD,
                          borderWidth: running ? 2 : 1,
                          borderColor: running ? action.color : (pressed ? `${action.color}55` : BORDER),
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 7,
                          paddingHorizontal: 5,
                          ...shadow(TEXT, pressed ? 0.08 : 0.14, pressed ? 8 : 12, 0, pressed ? 2 : 4),
                          elevation: pressed ? 1 : 3,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        })}
                      >
                        <View
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 14,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: `${action.color}14`,
                            borderWidth: 1,
                            borderColor: `${action.color}22`,
                          }}
                        >
                          {GetEntryIcon(action.type, 29, action.color)}
                        </View>
                        <Text style={{ color: TEXT_SECONDARY, fontSize: 10.5, fontWeight: '600', textAlign: 'center' }} numberOfLines={1}>{action.label}</Text>
                        {running ? (
                          <View
                            accessibilityElementsHidden
                            style={{
                              position: 'absolute',
                              top: 6,
                              right: 6,
                              minWidth: 10,
                              height: 10,
                              borderRadius: 5,
                              backgroundColor: action.color,
                              borderWidth: 2,
                              borderColor: CARD,
                            }}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              );
              return (
                <>
                  {renderRow(actions.slice(0, 4), true)}
                  {renderRow(actions.slice(4, 8), false)}
                </>
              );
            })()}
          </Animated.View>
        );

      case 'smartSignals':
        if (dm.smartSignals === false) return null;
        return (
          <View>
            {urgentAlerts.length > 0 && (
              <Animated.View entering={FadeInDown.duration(260).delay(140)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                <View style={{ gap: 6 }}>
                  {urgentAlerts.slice(0, 2).map((alert) => {
                    const c = alertToneColor(alert.tone);
                    const iconName =
                      alert.tone === 'danger' ? 'alert-circle' :
                      alert.tone === 'warning' ? 'warning' :
                      alert.tone === 'success' ? 'checkmark-circle' :
                      'notifications';
                    return (
                      <Pressable
                        key={alert.id}
                        onPress={() => haptics.selection()}
                        style={({ pressed }) => ({
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          borderRadius: 16,
                          backgroundColor: pressed ? 'rgba(15, 23, 42, 0.72)' : 'rgba(15, 23, 42, 0.58)',
                          borderWidth: 1,
                          borderColor: `${c}45`,
                          borderLeftWidth: 4,
                          borderLeftColor: c,
                          ...shadow('#000', 0.22, 8, 0, 4),
                          elevation: 4,
                          opacity: pressed ? 0.9 : 1,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        })}
                      >
                        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: `${c}22`, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name={iconName} size={18} color={c} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800', ...textShadow('rgba(0,0,0,0.45)', 0, 1, 2) }} numberOfLines={1}>
                            {alert.value}
                          </Text>
                          <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 11, fontWeight: '600', marginTop: 3, ...textShadow('rgba(0,0,0,0.35)', 0, 1, 1.5) }} numberOfLines={2}>
                            {alert.body}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </Animated.View>
            )}
            {foodAllergyAlerts.length > 0 && (
              <Animated.View entering={FadeInDown.duration(260).delay(160)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                <View style={{ paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, backgroundColor: `${YELLOW}10`, borderLeftWidth: 3, borderLeftColor: YELLOW }}>
                  <Ionicons name="alert-circle-outline" size={18} color={YELLOW} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: TEXT, fontSize: 13, fontWeight: '700' }}>{t('food.possibleAllergies')}</Text>
                    <Text style={{ color: MUTED, fontSize: 11, fontWeight: '600', marginTop: 2 }}>
                      {foodAllergyAlerts.slice(0, 2).map((a) => a.food).join(', ')}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            )}
            {diaperHealthAlerts.length > 0 && (
              <Animated.View entering={FadeInDown.duration(260).delay(165)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                {diaperHealthAlerts.map((alert, idx) => {
                  const isUrgent = alert.kind === 'colorAlert';
                  const tone = isUrgent ? RED : YELLOW;
                  const title = alert.kind === 'liquidStreak'
                    ? t('diaper.alertDiarrhea')
                    : t('diaper.alertColor');
                  const body = alert.kind === 'liquidStreak'
                    ? format('diaper.alertDiarrheaBody', { count: alert.count })
                    : t(alert.color === 'red' ? 'diaper.alertColorRedBody' : 'diaper.alertColorDarkBody');
                  return (
                    <Pressable
                      key={`${alert.kind}-${idx}`}
                      onPress={() => router.push('/entry/diaper')}
                      accessibilityRole="button"
                      accessibilityLabel={title}
                      style={({ pressed }) => ({
                        marginTop: idx === 0 ? 0 : 8,
                        paddingHorizontal: 14, paddingVertical: 12,
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        borderRadius: 12,
                        backgroundColor: pressed ? `${tone}22` : `${tone}10`,
                        borderLeftWidth: 3, borderLeftColor: tone,
                      })}
                    >
                      <Ionicons
                        name={isUrgent ? 'warning-outline' : 'water-outline'}
                        size={18}
                        color={tone}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: TEXT, fontSize: 13, fontWeight: '700' }}>{title}</Text>
                        <Text style={{ color: MUTED, fontSize: 11, fontWeight: '600', marginTop: 2 }}>
                          {body}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </Animated.View>
            )}
            {activeMeds.length > 0 && (
              <Animated.View entering={FadeInDown.duration(260).delay(170)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                <Pressable
                  onPress={() => router.push('/entry/medication')}
                  style={({ pressed }) => ({
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    borderRadius: 12,
                    backgroundColor: pressed ? `${BLUE}25` : `${BLUE}15`,
                    borderLeftWidth: 3,
                    borderLeftColor: BLUE,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Ionicons name="medical-outline" size={18} color={BLUE} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: TEXT, fontSize: 13, fontWeight: '700' }}>{t('home.medActive')}</Text>
                    <Text style={{ color: MUTED, fontSize: 11, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
                      {activeMeds.map((e) => e.payload?.name).filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={20} color={BLUE} />
                </Pressable>
              </Animated.View>
            )}
            {pinnedVaccines.length > 0 && (
              <Animated.View entering={FadeInDown.duration(260).delay(180)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ color: TEXT, fontSize: 13, fontWeight: '700' }}>{t('vaccine.scheduled')}</Text>
                    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: `${ACCENT}15` }}>
                      <Text style={{ color: ACCENT, fontSize: 10, fontWeight: '600' }}>{pinnedVaccines.length}</Text>
                    </View>
                  </View>
                  <View style={{ gap: 2 }}>
                    {pinnedVaccines.map((vaccine, idx) => {
                      const daysUntil = Math.ceil((new Date(vaccine.payload?.vaccineNextDueDate ?? '').getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const isUrgent = daysUntil <= 7;
                      return (
                        <Pressable
                          key={vaccine.id}
                          onPress={() => router.push({ pathname: '/entry/[type]', params: { type: 'vaccine', id: vaccine.id } })}
                          style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                            paddingVertical: 10,
                            borderTopWidth: idx > 0 ? 1 : 0,
                            borderTopColor: BORDER_SOFT,
                            opacity: pressed ? 0.6 : 1,
                          })}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: TEXT, fontSize: 13, fontWeight: '500' }}>{vaccine.payload?.vaccineName}</Text>
                            <Text style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>{t('vaccine.dose')}{vaccine.payload?.vaccineDose}</Text>
                          </View>
                          <Text style={{ color: isUrgent ? YELLOW : SOFT, fontSize: 12, fontWeight: '600' }}>
                            {daysUntil > 0 ? `${daysUntil}d` : t('vaccine.overdue')}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </Animated.View>
            )}
          </View>
        );

      case 'milkProgress':
        if (dm.milkProgress === false) return null;
        return (
          <Animated.View entering={FadeInDown.duration(260).delay(240)} style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <View>
                  <Text style={{ color: MUTED, fontSize: 11, fontWeight: '500', marginBottom: 2 }}>{t('milk.milk')}</Text>
                  <Text style={{ color: TEXT, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 }}>{totalMilkToday} <Text style={{ color: MUTED, fontSize: 14, fontWeight: '500' }}>ml</Text></Text>
                </View>
                <Text style={{ color: ACCENT, fontSize: 11, fontWeight: '600' }}>{milkStatus}</Text>
              </View>
              <View style={{ height: 4, borderRadius: 2, backgroundColor: BORDER_SOFT, overflow: 'hidden' }}>
                <Animated.View style={[{ height: '100%', backgroundColor: ACCENT, borderRadius: 2 }, milkBarStyle]} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Text style={{ color: MUTED, fontSize: 11 }}>{t('milk.target')} {milkGoalMin}–{milkGoalMax} ml</Text>
                {weeklyBottleTrend.thisAvg !== null && weeklyBottleTrend.lastAvg !== null && (
                  <Text style={{ color: weeklyBottleTrend.thisAvg >= weeklyBottleTrend.lastAvg ? GREEN : RED, fontSize: 11, fontWeight: '700' }}>
                    {weeklyBottleTrend.thisAvg >= weeklyBottleTrend.lastAvg ? '↑' : '↓'} {Math.abs(weeklyBottleTrend.thisAvg - weeklyBottleTrend.lastAvg)} ml {t('feeding.trendVsLastWeek')}
                  </Text>
                )}
              </View>
            </View>
          </Animated.View>
        );

      case 'healthFood':
        if (dm.healthFood === false) return null;
        if (!hasHealthData && !lastFood) return null;
        return (
          <Animated.View entering={FadeInDown.duration(260).delay(220)} style={{ paddingHorizontal: 20, marginBottom: 12, flexDirection: 'row', gap: 8 }}>
            {hasHealthData && (
              <Pressable
                onPress={() => router.push('/entry/temperature')}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: BORDER,
                  backgroundColor: pressed ? BORDER_SOFT : CARD,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                })}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: healthStatus.color }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: MUTED, fontSize: 10, fontWeight: '500' }}>{t('health.status')}</Text>
                  <Text style={{ color: TEXT, fontSize: 13, fontWeight: '600' }}>{healthStatus.label}</Text>
                </View>
              </Pressable>
            )}
            {lastFood && (
              <Pressable
                onPress={() => router.push('/entry/food')}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: BORDER,
                  backgroundColor: pressed ? BORDER_SOFT : CARD,
                })}
              >
                <Text style={{ color: MUTED, fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginBottom: 3 }}>{t('food.status')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
                  <Text style={{ color: TEXT, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 }}>{foodTodayCount}</Text>
                  <Text style={{ color: SOFT, fontSize: 12 }}>{t('food.today')}</Text>
                </View>
                {lastFood.payload?.foodName && (() => {
                  const k = getMealKind(lastFood.payload.mealTime);
                  const lastFoodMealMap = { breakfast: iconPack.MealMorning, lunch: iconPack.MealMidday, snack: iconPack.MealSnack, dinner: iconPack.MealEvening, other: iconPack.MealOther } as const;
                  const LG = lastFoodMealMap[k];
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                      <LG size={12} color={MEAL_TONE[k]} />
                      <Text style={{ color: GOLD, fontSize: 11, fontWeight: '500' }} numberOfLines={1}>
                        {lastFood.payload.foodName}
                      </Text>
                    </View>
                  );
                })()}
              </Pressable>
            )}
          </Animated.View>
        );

      case 'recentActivity':
        if (dm.recentActivity === false) return null;
        if (recentEntries.length === 0) return null;
        return (
          <Animated.View entering={FadeInDown.duration(260).delay(310)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: MUTED, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>{t('recent.recent')}</Text>
                <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: `${ACCENT}15` }}>
                  <Text style={{ color: ACCENT, fontSize: 10, fontWeight: '700' }}>{recentEntries.length}</Text>
                </View>
              </View>
              <View>
                {recentEntries.map((entry, idx) => {
                  const color = ENTRY_COLORS[entry.type] ?? MUTED;
                  const label = getEntryDisplayLabel(entry, t);
                  const detail = getEntryDetail(entry, t, locale);

                  const swipeRef = (() => {
                    if (!swipeableRefs.current.has(entry.id))
                      swipeableRefs.current.set(entry.id, React.createRef<SwipeableMethods | null>());
                    return swipeableRefs.current.get(entry.id)!;
                  })();

                  // Swipe-RIGHT (finger moves right) reveals Delete on the
                  // left edge — destructive actions are kept further from the
                  // dominant thumb to avoid accidents. Swipe-LEFT (finger
                  // moves left) reveals Edit on the right edge — that's what
                  // the user instinctively reaches for after spotting a typo.
                  const renderLeftAction = () => (
                    <Pressable
                      onPress={async () => {
                        haptics.medium();
                        const ok = await confirmAction({
                          title: t('common.delete'),
                          message: label,
                          confirmLabel: t('common.delete'),
                          cancelLabel: t('common.cancel'),
                          destructive: true,
                        });
                        if (ok) { haptics.success(); void deleteEntry(entry.id); }
                        else swipeRef.current?.close();
                      }}
                      style={{
                        width: 88, flexDirection: 'row',
                        justifyContent: 'center', alignItems: 'center', gap: 6,
                        backgroundColor: RED, marginBottom: 1,
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{t('common.delete')}</Text>
                    </Pressable>
                  );

                  const renderRightAction = () => (
                    <Pressable
                      onPress={() => {
                        haptics.light();
                        swipeRef.current?.close();
                        router.push({ pathname: '/entry/[type]', params: { type: entry.type, id: entry.id } });
                      }}
                      style={{
                        width: 88, flexDirection: 'row',
                        justifyContent: 'center', alignItems: 'center', gap: 6,
                        backgroundColor: BLUE, marginBottom: 1,
                      }}
                    >
                      <Ionicons name="pencil-outline" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{t('common.edit')}</Text>
                    </Pressable>
                  );

                  return (
                    <ReanimatedSwipeable
                      key={entry.id}
                      ref={swipeRef}
                      renderLeftActions={renderLeftAction}
                      renderRightActions={renderRightAction}
                      leftThreshold={40}
                      rightThreshold={40}
                      overshootLeft={false}
                      overshootRight={false}
                      friction={2}
                    >
                      <Pressable
                        onPress={() => router.push({ pathname: '/entry/[type]', params: { type: entry.type, id: entry.id } })}
                        accessibilityRole="button"
                        accessibilityLabel={`${label}${detail ? ` · ${detail}` : ''} · ${formatClock(entry.occurredAt, locale)} · ${formatRelative(entry.occurredAt, locale)}`}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          paddingVertical: 9,
                          paddingHorizontal: 2,
                          borderTopWidth: idx > 0 ? 1 : 0,
                          borderTopColor: BORDER_SOFT,
                          backgroundColor: CARD,
                          opacity: pressed ? 0.65 : 1,
                        })}
                      >
                        <View style={{
                          width: 34, height: 34, borderRadius: 10,
                          backgroundColor: `${color}18`,
                          borderWidth: 1, borderColor: `${color}28`,
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          {entry.type === 'feed'
                            ? (entry.payload?.mode === 'bottle'
                              ? <BottleIcon color={color} size={18} />
                              : <BreastfeedingIcon color={color} size={18} />)
                            : GetEntryIcon(entry.type, 18, color)}
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ color: TEXT, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{label}</Text>
                          {detail ? (
                            <Text style={{ color: MUTED, fontSize: 11, marginTop: 1, fontWeight: '500' }} numberOfLines={1}>{detail}</Text>
                          ) : null}
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 2, paddingRight: 2 }}>
                          <Text style={{ color: SOFT, fontSize: 12, fontWeight: '600' }}>{formatClock(entry.occurredAt, locale)}</Text>
                          <Text style={{ color: MUTED, fontSize: 10 }}>{formatRelative(entry.occurredAt, locale)}</Text>
                        </View>
                      </Pressable>
                    </ReanimatedSwipeable>
                  );
                })}
              </View>
            </View>
          </Animated.View>
        );

      case 'foodHistory': {
        if (dm.foodHistory === false) return null;
        if (foodHistory.length === 0) return null;
        const rowTokens = { text: TEXT, muted: MUTED, soft: SOFT, gold: GOLD, red: RED, border: BORDER };
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfYesterday = startOfToday - 86400000;
        const mealLabelFor = (kind: MealKind) => t(`food.meal${kind.charAt(0).toUpperCase() + kind.slice(1)}` as any);
        const moreLabel = (n: number) => format('food.moreCount', { count: n });
        const goToEdit = (id: string) => {
          haptics.selection();
          router.push({ pathname: '/entry/[type]', params: { type: 'food', id } });
        };
        const goToAdd = () => {
          haptics.selection();
          router.push('/entry/food');
        };
        const goToHistory = () => router.push('/history');

        type Group = { key: string; label: string; items: EntryRecord[] };
        const groups: Group[] = [];
        const pushTo = (key: string, label: string, item: EntryRecord) => {
          let g = groups.find((x) => x.key === key);
          if (!g) { g = { key, label, items: [] }; groups.push(g); }
          g.items.push(item);
        };
        for (const food of foodHistory) {
          const ts = new Date(food.occurredAt).getTime();
          if (ts >= startOfToday) pushTo('today', t('food.dayToday'), food);
          else if (ts >= startOfYesterday) pushTo('yesterday', t('food.dayYesterday'), food);
          else {
            const d = new Date(food.occurredAt);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            const label = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
            pushTo(key, label, food);
          }
        }

        return (
          <Animated.View entering={FadeInDown.duration(260).delay(420)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 4 }}>{t('food.history')}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={{ color: TEXT, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 }}>{mealsToday}</Text>
                    <Text style={{ color: SOFT, fontSize: 13, fontWeight: '500' }}>{t('food.today')}</Text>
                    {totalGramsToday > 0 ? (
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: GOLD + '22' }}>
                        <Text style={{ color: GOLD, fontSize: 11, fontWeight: '700' }}>{totalGramsToday}g</Text>
                      </View>
                    ) : null}
                  </View>
                  {foodMostCommon ? (
                    <Text style={{ color: MUTED, fontSize: 11, fontWeight: '500', marginTop: 4 }} numberOfLines={1}>
                      <Text style={{ color: MUTED, fontWeight: '600' }}>{t('food.favorite')}</Text>
                      <Text style={{ color: TEXT, fontWeight: '600' }}>{foodMostCommon.name}</Text>
                      <Text style={{ color: SOFT }}> · {foodMostCommon.count}×</Text>
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={goToAdd}
                  accessibilityRole="button"
                  accessibilityLabel={t('food.addEntry')}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    width: 36, height: 36, borderRadius: 18,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: pressed ? GOLD + '33' : GOLD + '1A',
                    borderWidth: 1, borderColor: GOLD + '33',
                  })}
                >
                  <Ionicons name="add" size={20} color={GOLD} />
                </Pressable>
              </View>

              <View style={{ gap: 2 }}>
                {groups.map((group, gi) => (
                  <Fragment key={group.key}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: gi === 0 ? 0 : 8, marginBottom: 4 }}>
                      <Text style={{ color: MUTED, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>{group.label}</Text>
                      <View style={{ flex: 1, height: 1, backgroundColor: BORDER_SOFT }} />
                    </View>
                    {group.items.map((food) => (
                      <FoodHistoryRow
                        key={food.id}
                        entry={food}
                        locale={locale}
                        isToday={group.key === 'today'}
                        mealLabel={mealLabelFor(getMealKind(food.payload?.mealTime))}
                        moreLabel={moreLabel}
                        tokens={rowTokens}
                        onPress={goToEdit}
                      />
                    ))}
                  </Fragment>
                ))}
              </View>

              <Pressable
                onPress={goToHistory}
                accessibilityRole="button"
                accessibilityLabel={t('food.seeAll')}
                style={({ pressed }) => ({
                  marginTop: 10,
                  paddingVertical: 10,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                  backgroundColor: pressed ? BORDER_SOFT : 'transparent',
                })}
              >
                <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 }}>{t('food.seeAll')}</Text>
                <Ionicons name="chevron-forward" size={14} color={ACCENT} />
              </Pressable>
            </View>
          </Animated.View>
        );
      }

      case 'growth':
        if (dm.growth === false) return null;
        if (weightMeasurements.length === 0) return null;
        return (
          <Animated.View entering={FadeInDown.duration(260).delay(390)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                <View>
                  <Text style={{ color: MUTED, fontSize: 11, fontWeight: '500', marginBottom: 2 }}>{t('growth.growth')}</Text>
                  <Text style={{ color: TEXT, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 }}>
                    {(weightMeasurements[0]?.weight ?? 0).toFixed(2)} <Text style={{ color: SOFT, fontSize: 14, fontWeight: '500' }}>kg</Text>
                  </Text>
                </View>
                <Text style={{ color: SOFT, fontSize: 11, fontWeight: '500' }}>
                  {weightMeasurements.length} {t('home.measurements')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 44 }}>
                {(() => {
                  const weights = weightMeasurements.map((w) => w.weight ?? 0).filter((w) => w > 0);
                  if (weights.length === 0) return null;
                  const maxWeight = Math.max(...weights);
                  const minWeight = Math.min(...weights);
                  const range = maxWeight - minWeight || 1;
                  return weightMeasurements.map((m, i) => {
                    const w = m.weight ?? 0;
                    const height = ((w - minWeight) / range) * 36 + 8;
                    return (
                      <View
                        key={i}
                        style={{
                          flex: 1,
                          height,
                          borderRadius: 3,
                          backgroundColor: ACCENT,
                          opacity: 0.4 + (i / weightMeasurements.length) * 0.6,
                        }}
                      />
                    );
                  });
                })()}
              </View>
            </View>
          </Animated.View>
        );

      case 'hydration':
        if (dm.hydration === false) return null;
        return (
          <Animated.View entering={FadeInDown.duration(260).delay(495)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <View>
                  <Text style={{ color: MUTED, fontSize: 11, fontWeight: '500', marginBottom: 2 }}>{t('hydration.hydration')}</Text>
                  <Text style={{ color: TEXT, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 }}>
                    {hydration} <Text style={{ color: SOFT, fontSize: 13, fontWeight: '500' }}>/ {appSettings.hydrationGoalMl} ml</Text>
                  </Text>
                </View>
              </View>
              <View style={{ height: 4, borderRadius: 2, backgroundColor: BORDER_SOFT, overflow: 'hidden', marginBottom: 12 }}>
                <View style={{ width: `${Math.max(0, Math.min(100, (hydration / appSettings.hydrationGoalMl) * 100))}%`, height: '100%', backgroundColor: BLUE }} />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { label: '+250 ml', amount: 250 },
                  { label: '+500 ml', amount: 500 },
                ].map((item) => (
                  <Pressable
                    key={item.label}
                    onPress={async () => {
                      if (!babyId) return;
                      haptics.light();
                      const next = hydration + item.amount;
                      setHydration(next);
                      setLastHydrationDelta(item.amount);
                      await setMomHydration(babyId, next);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: pressed ? `${BLUE}22` : CARD,
                      borderWidth: 1,
                      borderColor: BORDER,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.88 : 1,
                    })}
                  >
                    <Text style={{ color: TEXT, fontSize: 13, fontWeight: '700' }}>{item.label}</Text>
                  </Pressable>
                ))}
                {lastHydrationDelta !== null && hydration > 0 ? (
                  <Pressable
                    onPress={async () => {
                      if (!babyId) return;
                      haptics.light();
                      const next = Math.max(0, hydration - lastHydrationDelta);
                      setHydration(next);
                      setLastHydrationDelta(null);
                      await setMomHydration(babyId, next);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('home.undoLast')}
                    style={({ pressed }) => ({
                      width: 38, height: 38,
                      borderRadius: 10,
                      backgroundColor: pressed ? `${RED}22` : `${RED}10`,
                      borderWidth: 1,
                      borderColor: `${RED}55`,
                      alignItems: 'center', justifyContent: 'center',
                    })}
                  >
                    <Ionicons name="arrow-undo" size={16} color={RED} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          </Animated.View>
        );

      default:
        return null;
    }
  }

  if (loading && entries.length === 0) {
    return (
      <Page contentStyle={styles.pageContent}>
        <View style={{ paddingHorizontal: 16, paddingTop: 24, gap: 14 }}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><SkeletonCard lines={1} /></View>
            <View style={{ flex: 1 }}><SkeletonCard lines={1} /></View>
          </View>
          <SkeletonCard lines={4} />
        </View>
      </Page>
    );
  }

  return (
    <Page scroll={false} contentStyle={styles.pageContent}>
      <GestureScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullToRefresh}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
      >
        <View style={{ paddingBottom: Math.max(100, insets.bottom + 80) }}>
          {/* Premium Compact Header */}
          <Animated.View entering={FadeIn.duration(300)} style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
            {/* Top row: greeting + settings */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  color: TEXT,
                  fontSize: 12,
                  fontWeight: '700',
                  letterSpacing: 0.6,
                  marginBottom: 3,
                  opacity: 0.72,
                  ...textShadow('rgba(255,255,255,0.10)', 0, 1, 2),
                  textTransform: 'uppercase',
                   shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
                }}>
                  {t(`greeting.${getHourPeriod()}`)}
                </Text>
                <Text style={{
                  color: TEXT,
                  fontSize: 24,
                  fontWeight: '800',
                  letterSpacing: -0.6,
                  ...textShadow('rgba(0,0,0,0.5)', 0, 1, 6),
                }}>
                  {resolvedDisplayName}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <SyncStatusBadge />
                <Pressable
                  onPress={() => setShowHomeCustomizer(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: BORDER,
                    backgroundColor: pressed ? BORDER_SOFT : CARD,
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                  })}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.customizeHome')}
                >
                  <Ionicons name="options-outline" size={18} color={TEXT_SECONDARY} />
                </Pressable>
              </View>
            </View>

            {/* Baby chip - compact and premium */}
            <Pressable
              onPress={() => setShowBabySwitcher(true)}
              accessibilityRole="button"
              accessibilityLabel={activeBabyName}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: BORDER,
                backgroundColor: pressed ? BORDER_SOFT : CARD,
              })}
            >
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${ACCENT}15`, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: ACCENT, fontSize: 14, fontWeight: '700' }}>{activeBabyName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: TEXT, fontSize: 14, fontWeight: '600' }}>{activeBabyName}</Text>
                {babyAge && (
                  <Text style={{ color: MUTED, fontSize: 11, marginTop: 1 }}>
                    {babyAge.months}{t('home.ageMonth')}{babyAge.days}{t('home.ageDay')}
                    {lastMeasurement?.payload?.weightKg && ` · ${lastMeasurement.payload.weightKg} kg`}
                    {lastMeasurement?.payload?.heightCm && ` · ${lastMeasurement.payload.heightCm} cm`}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={SOFT} />
            </Pressable>
          </Animated.View>

          {/* Primary actions — always visible */}
          <Animated.View entering={FadeInDown.duration(260).delay(80)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => (activeTimer?.kind === 'bottle' ? minimizeTimer() : startQuickTimer('bottle'))}
                accessibilityRole="button"
                accessibilityLabel={activeTimer?.kind === 'bottle' ? `${t('feeding.bottle')} · ${t('timer.running')}` : t('feeding.bottle')}
                style={({ pressed }) => {
                  const running = activeTimer?.kind === 'bottle';
                  return {
                    flex: 3,
                    height: 58,
                    borderRadius: 16,
                    borderWidth: running ? 2 : 1.5,
                    borderColor: running ? BLUE : (pressed ? BLUE + '80' : BORDER),
                    backgroundColor: running ? BLUE + '12' : (pressed ? BLUE + '14' : CARD),
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  };
                }}
              >
                <BottleIcon color={TEXT} size={24} />
                <Text style={{ color: TEXT, fontSize: 13, fontWeight: '700' }}>{t('feeding.bottle')}</Text>
                <Text style={{ color: TEXT_SECONDARY, fontSize: 12, fontWeight: '600', marginLeft: 2 }}>{quickAmount} ml</Text>
                {activeTimer?.kind === 'bottle' ? (
                  <View accessibilityElementsHidden style={{ position: 'absolute', top: 6, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: BLUE, borderWidth: 2, borderColor: CARD }} />
                ) : null}
              </Pressable>
              <Pressable
                onPress={() => (activeTimer?.kind === 'breast' ? minimizeTimer() : setShowNextFeedPicker(true))}
                accessibilityRole="button"
                accessibilityLabel={activeTimer?.kind === 'breast' ? `${t('feeding.breast')} · ${t('timer.running')}` : t('feeding.breast')}
                style={({ pressed }) => {
                  const running = activeTimer?.kind === 'breast';
                  return {
                    flex: 2,
                    height: 58,
                    borderRadius: 16,
                    borderWidth: running ? 2 : 1.5,
                    borderColor: running ? ACCENT : (pressed ? ACCENT + '80' : BORDER),
                    backgroundColor: running ? ACCENT + '12' : (pressed ? ACCENT + '14' : CARD),
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  };
                }}
              >
                <BreastfeedingIcon color={TEXT} size={24} />
                <Text style={{ color: TEXT, fontSize: 13, fontWeight: '700' }}>{t('feeding.breast')}</Text>
                {activeTimer?.kind === 'breast' ? (
                  <View accessibilityElementsHidden style={{ position: 'absolute', top: 6, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: ACCENT, borderWidth: 2, borderColor: CARD }} />
                ) : null}
              </Pressable>
            </View>
          </Animated.View>

          {/* Dynamic ordered sections */}
          {sectionOrder.map((key) => (
            <Fragment key={key}>{renderSection(key)}</Fragment>
          ))}

          {/* Missing data prompt — always last, conditional on data */}
          {entries.length > 5 && (!hasAnySleep || !hasAnyDiaper) && (
            <Animated.View entering={FadeInDown.duration(260).delay(480)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
              <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="information-circle-outline" size={18} color={MUTED} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>{t('home.trackMoreTitle')}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {!hasAnySleep && (
                      <Pressable onPress={() => router.push('/entry/sleep')} style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: pressed ? `${BLUE}25` : `${BLUE}15`, borderWidth: 1, borderColor: `${BLUE}40` })}>
                        <Text style={{ color: BLUE, fontSize: 11, fontWeight: '700' }}>😴 {t('entry.sleep')}</Text>
                      </Pressable>
                    )}
                    {!hasAnyDiaper && (
                      <Pressable onPress={() => router.push('/entry/diaper')} style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: pressed ? `${ACCENT}25` : `${ACCENT}15`, borderWidth: 1, borderColor: `${ACCENT}40` })}>
                        <Text style={{ color: ACCENT, fontSize: 11, fontWeight: '700' }}>🧷 {t('entry.diaper')}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            </Animated.View>
          )}
        </View>
      </GestureScrollView>

      {/* ========== MODALS ========== */}

      <Modal visible={showNextFeedPicker} transparent animationType="fade" onRequestClose={() => setShowNextFeedPicker(false)}>
        <View style={styles.menuOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowNextFeedPicker(false)} />
          <BlurView intensity={30} style={StyleSheet.absoluteFill} />
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>{t('modal.chooseSide')}</Text>
            <Text style={styles.menuSubtitle}>
              {t('modal.chooseBeforeLaunch')}
            </Text>
            <View style={styles.choiceGrid}>
              {[
                { label: t('modal.leftBreast'), side: 'left' as BreastSide, color: GOLD },
                { label: t('modal.rightBreast'), side: 'right' as BreastSide, color: GREEN },
                { label: t('modal.bothSides'), side: 'both' as BreastSide, color: TEXT },
              ].map(({ label, side, color }) => (
                <Pressable
                  key={side}
                  onPress={() => beginNextFeed('breast', side)}
                  style={({ pressed }) => ({
                    flex: 1,
                    minWidth: 130,
                    height: 80,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: color,
                    backgroundColor: pressed ? `${color}22` : `${color}12`,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    justifyContent: 'center',
                    gap: 4,
                    opacity: pressed ? 0.88 : 1,
                  })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <BreastfeedingIcon color={color} size={20} />
                    <Text style={{ color, fontSize: 13, fontWeight: '700' }}>{label}</Text>
                  </View>
                  <Text style={{ color: MUTED, fontSize: 11 }}>
                    {t('modal.immediateTimer')}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Button label={t('common.close')} onPress={() => setShowNextFeedPicker(false)} variant="ghost" />
          </View>
        </View>
      </Modal>

      <Modal visible={showHomeCustomizer} transparent animationType="fade" onRequestClose={() => setShowHomeCustomizer(false)}>
        <View style={styles.menuOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowHomeCustomizer(false)} />
          <BlurView intensity={30} style={StyleSheet.absoluteFill} />
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>{t('modal.customize')}</Text>
            <Text style={styles.menuSubtitle}>{t('modal.toggleSections')}</Text>

            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {sectionOrder.map((key, idx) => {
                const section = CONFIGURABLE_SECTIONS.find((s) => s.key === key);
                if (!section) return null;
                const isEnabled = Boolean(dm[key as keyof typeof dm]);
                return (
                  <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                    <View style={{ gap: 1 }}>
                      <Pressable
                        onPress={() => void moveSection(key, 'up')}
                        style={{ width: 26, height: 20, alignItems: 'center', justifyContent: 'center', opacity: idx === 0 ? 0.2 : 1 }}
                        disabled={idx === 0}
                      >
                        <Ionicons name="chevron-up" size={14} color={MUTED} />
                      </Pressable>
                      <Pressable
                        onPress={() => void moveSection(key, 'down')}
                        style={{ width: 26, height: 20, alignItems: 'center', justifyContent: 'center', opacity: idx === sectionOrder.length - 1 ? 0.2 : 1 }}
                        disabled={idx === sectionOrder.length - 1}
                      >
                        <Ionicons name="chevron-down" size={14} color={MUTED} />
                      </Pressable>
                    </View>
                    <Text style={{ flex: 1, color: isEnabled ? TEXT : MUTED, fontSize: 13, fontWeight: '600' }}>
                      {section.label}
                    </Text>
                    <Pressable
                      onPress={() => void updateDashboardMetric(key as any, !isEnabled)}
                      style={({ pressed }) => ({
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                        backgroundColor: pressed
                          ? (isEnabled ? `${ACCENT}30` : BORDER)
                          : (isEnabled ? `${ACCENT}18` : 'transparent'),
                        borderWidth: 1,
                        borderColor: isEnabled ? ACCENT : BORDER,
                      })}
                    >
                      <Text style={{ color: isEnabled ? ACCENT : MUTED, fontSize: 11, fontWeight: '700' }}>
                        {isEnabled ? t('modal.hide') : t('modal.show')}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>

            <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 12 }}>
              <Text style={{ color: MUTED, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>
                {t('home.defaultFeeding')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label={`🤱 ${t('feeding.breast')}`}
                    onPress={() => { setDefaultFeedingMode('breast'); void updateAppSettings({ defaultFeedingMode: 'breast' } as any); }}
                    variant={defaultFeedingMode === 'breast' ? 'secondary' : 'ghost'}
                    size="sm"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label={`🍼 ${t('feeding.bottle')}`}
                    onPress={() => { setDefaultFeedingMode('bottle'); void updateAppSettings({ defaultFeedingMode: 'bottle' } as any); }}
                    variant={defaultFeedingMode === 'bottle' ? 'secondary' : 'ghost'}
                    size="sm"
                  />
                </View>
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Button label={t('modal.restoreAll')} onPress={() => void restoreHomeCustomization()} variant="secondary" />
              <Button label={t('common.close')} onPress={() => setShowHomeCustomizer(false)} variant="ghost" />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showBabySwitcher} transparent animationType="fade" onRequestClose={() => setShowBabySwitcher(false)}>
        <View style={styles.switcherOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowBabySwitcher(false)} />
          <BlurView intensity={30} style={StyleSheet.absoluteFill} />
          <View style={styles.switcherSheet}>
            <View style={styles.switcherHeader}>
              <View>
                <Text style={styles.switcherTitle}>{t('header.switchChild')}</Text>
                <Text style={styles.switcherSubtitle}>
                  {t('home.switcherSubtitle')}
                </Text>
              </View>
              <View style={styles.switcherBadge}>
                <Text style={{ color: GOLD, fontSize: 11, fontWeight: '800' }}>{babies.length}</Text>
              </View>
            </View>
            <ScrollView style={styles.switcherList} contentContainerStyle={{ gap: 8, paddingBottom: 4 }} showsVerticalScrollIndicator={false}>
              {babies.length ? (
                babies.map((baby) => {
                  const active = baby.id === babyId;
                  return (
                    <Pressable
                      key={baby.id}
                      onPress={() => {
                        void switchBaby(baby);
                      }}
                      style={({ pressed }) => [
                        styles.switcherItem,
                        {
                          borderColor: active ? GOLD : BORDER,
                          backgroundColor: active ? `${GOLD}18` : CARD,
                          opacity: pressed ? 0.88 : 1,
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <Text style={{ color: active ? GOLD : TEXT, fontSize: 15, fontWeight: '700' }}>{baby.name}</Text>
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: active ? `${GOLD}66` : BORDER,
                            backgroundColor: active ? `${GOLD}22` : BG,
                          }}
                        >
                          <Text style={{ color: active ? GOLD : MUTED, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>
                            {active ? t('home.activeLabel') : t('home.selectLabel')}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: MUTED, fontSize: 12 }}>
                        {t('header.birth')}{baby.birthDate}
                      </Text>
                    </Pressable>
                  );
                })
              ) : (
                <View style={styles.emptySwitcherCard}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="people-outline" size={18} color={MUTED} />
                  </View>
                  <Text style={styles.emptySwitcherTitle}>{t('home.noChildTitle')}</Text>
                  <Text style={styles.emptySwitcherSubtitle}>{t('home.noChildBody')}</Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.switcherFooter}>
              <Button
                label={t('home.openProfile')}
                onPress={() => {
                  setShowBabySwitcher(false);
                  router.push('/profile');
                }}
                variant="secondary"
              />
              <Button label={t('common.close')} onPress={() => setShowBabySwitcher(false)} variant="ghost" />
            </View>
          </View>
        </View>
      </Modal>

      <FullscreenTimerModal
        visible={Boolean(quickTimerMode && timerStartedAt && !showSaveSheet && !isTimerMinimized)}
        emoji={quickTimerMode === 'bottle' ? '\u{1F37C}' : '\u{1F931}'}
        title={activeFeedTitle}
        subtitlePrefix={activeFeedSubtitlePrefix}
        startedAt={timerStartedAt ?? Date.now()}
        elapsedSeconds={timerElapsedSeconds}
        animatePulse={appSettings.effects.emojiPulse}
        onStop={() => setShowSaveSheet(true)}
        onMinimize={minimizeTimer}
      />

      <Modal visible={showSaveSheet} transparent animationType="slide" onRequestClose={() => setShowSaveSheet(false)}>
        <View style={styles.sheetOverlay}>
          <SafeAreaView edges={['bottom']} style={styles.sheetSafeArea}>
            <View style={styles.sheetCard}>
              <Text style={styles.sheetTitle}>
                {quickTimerMode === 'bottle' ? t('home.bottleComplete') : `${activeFeedTitle} ${t('home.feedComplete')}`}
              </Text>
              <Text style={styles.sheetSubtitle}>
                {t('entry.duration')} {Math.max(1, Math.round(timerElapsedSeconds / 60))} min · {t('home.feedStartedAt')} {formatClock(timerStartedAt ? new Date(timerStartedAt).toISOString() : undefined, locale)}
              </Text>
              {quickTimerMode === 'bottle' ? (
                <QuantityPicker value={quickAmount} onChange={setQuickAmount} largeTouchMode={appSettings.largeTouchMode} />
              ) : null}
              <View style={styles.sheetActions}>
                <Button label={t('common.save')} onPress={saveQuickTimerEntry} />
                <Button
                  label={t('common.cancel')}
                  variant="ghost"
                  onPress={async () => {
                    const ok = await confirmAction({
                      title: t('common.cancel'),
                      message: t('entry.discardSession'),
                      confirmLabel: t('entry.discardConfirm'),
                      cancelLabel: t('entry.keepSession'),
                      destructive: true,
                    });
                    if (ok) {
                      stopTimer();
                      setShowSaveSheet(false);
                      void getLastBottleAmount().then(setQuickAmount);
                    }
                  }}
                />
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </Page>
  );
}
