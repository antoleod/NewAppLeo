import { useEffect, useMemo, useState } from 'react';
import { Alert, AppState, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Page, SkeletonCard } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { BreastSide, EntryRecord } from '@/types';
import { buildSmartAlerts, getMeanFeedingInterval } from '@/lib/patterns';
import {
  defaultAppSettings,
  defaultModuleVisibility,
  getActiveBaby,
  getBabies,
  getAppSettings,
  getLastBottleAmount,
  getModuleVisibility,
  getMomHydration,
  setActiveBabyId,
  setLastBottleAmount,
  setMomHydration,
  getDeviceDisplayName,
  updateAppSettings,
} from '@/lib/storage';
import { QuantityPicker } from '@/components/QuantityPicker';
import { FullscreenTimerModal } from '@/components/FullscreenTimerModal';
import { NextFeedingCard } from '@/components/NextFeedingCard';
import { GetEntryIcon } from '@/components/EntryTypeIcons';
import { BottleIcon, BreastfeedingIcon } from '@/components/FeedingIcons';
import { haptics } from '@/lib/haptics';
import { shadow, textShadow } from '@/lib/shadow';

type QuickTimerMode = 'breast' | 'bottle' | null;

const touchTargetProps = {
  hitSlop: 8,
  pressRetentionOffset: 8,
} as const;

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

  const alerts: Array<{ food: string; count: number }> = [];
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

function getFoodHistory(entries: EntryRecord[]) {
  return entries
    .filter((e) => e.type === 'food')
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 8);
}

function getFoodStats(entries: EntryRecord[]) {
  const foodEntries = entries.filter((e) => e.type === 'food');
  if (foodEntries.length === 0) return { mostCommon: null, totalUnique: 0, totalGramsToday: 0, mealsToday: 0 };

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const todayEntries = foodEntries.filter((e) => new Date(e.occurredAt).getTime() >= startOfDay);
  const totalGramsToday = todayEntries.reduce((sum, e) => sum + (e.payload?.quantityGrams ?? 0), 0);

  const foodCounts = new Map<string, number>();
  foodEntries.forEach((entry) => {
    const food = entry.payload?.foodName?.toLowerCase() || '';
    if (food) foodCounts.set(food, (foodCounts.get(food) ?? 0) + 1);
  });

  let mostCommon: string | null = null;
  let maxCount = 0;
  foodCounts.forEach((count, food) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = food;
    }
  });

  return {
    mostCommon: mostCommon ? { name: mostCommon, count: maxCount } : null,
    totalUnique: foodCounts.size,
    totalGramsToday,
    mealsToday: todayEntries.length,
  };
}

function GlassCard({ children, style, blur = true }: { children: React.ReactNode; style?: any; blur?: boolean }) {
  const { theme, colors } = useTheme();
  const content = (
    <View
      style={[
        {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.bgCard,
          ...shadow('#000', 0.24, 18, 0, 4),
          elevation: 6,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!blur) return content;

  return (
    <BlurView intensity={20} style={[{ borderRadius: 16, overflow: 'hidden' }, style]}>
      {content}
    </BlurView>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  color,
  style,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  color?: string;
  style?: any;
}) {
  const { theme } = useTheme();
  const btnColor = color ?? theme.blue;
  return (
    <Pressable
      {...touchTargetProps}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: 56,
          paddingHorizontal: 14,
          borderRadius: 12,
          backgroundColor: pressed ? `${btnColor}22` : theme.bgCard,
          borderWidth: 1,
          borderColor: theme.border,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: pressed ? 0.92 : 1,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={{ color: theme.textPrimary, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { language } = useLocale();
  const locale = localeTag(language);
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const { entries, summary, addEntry, loading } = useAppData();
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();

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
  const YELLOW = '#F2C86F';

  const getHealthStatus = (entries: EntryRecord[]) => {
    const lastTemp = entries.find((e) => e.type === 'temperature' || (e.type === 'measurement' && e.payload?.tempC));
    const tempC = lastTemp?.payload?.tempC;
    if (!tempC) return { status: 'unknown', color: MUTED, label: t('health.noData') };
    if (tempC < 37.5) return { status: 'normal', color: GREEN, label: t('health.normal') };
    if (tempC < 38) return { status: 'fever_low', color: YELLOW, label: t('health.feverLow') };
    return { status: 'fever', color: RED, label: t('health.fever') };
  };

  const alertToneColor = (tone: 'primary' | 'secondary' | 'success' | 'warning' | 'danger') => {
    if (tone === 'danger') return RED;
    if (tone === 'warning') return '#F2C86F';
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
      ...shadow('#000', 0.08, 24, 0, 8),
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
      ...shadow('#000', 0.08, 20, 0, 8),
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
      ...shadow('#000', 0.08, 20, 0, 8),
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
  const [babies, setBabies] = useState<Array<{ id: string; name: string; birthDate: string }>>([]);
  const [visibility, setVisibility] = useState(defaultModuleVisibility);
  const [appSettings, setAppSettingsState] = useState(defaultAppSettings);
  const [quickTimerMode, setQuickTimerMode] = useState<QuickTimerMode>(null);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [timerElapsedSeconds, setTimerElapsedSeconds] = useState(0);
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [showBabySwitcher, setShowBabySwitcher] = useState(false);
  const [showHomeCustomizer, setShowHomeCustomizer] = useState(false);
  const [showNextFeedPicker, setShowNextFeedPicker] = useState(false);
  const [quickAmount, setQuickAmount] = useState(150);
  const [quickFeedSide, setQuickFeedSide] = useState<BreastSide>('left');
  const [now, setNow] = useState(Date.now());
  const [defaultFeedingMode, setDefaultFeedingMode] = useState<'breast' | 'bottle'>('bottle');
  const [deviceDisplayName, setDeviceDisplayName] = useState('');

  const feedEntries = useMemo(() => entries.filter((entry) => entry.type === 'feed'), [entries]);
  const lastFeed = useMemo(() => feedEntries[0], [feedEntries]);
  const lastMeasurement = useMemo(() => entries.find((entry) => entry.type === 'measurement'), [entries]);

  const meanInterval = getMeanFeedingInterval(entries);
  const nextFeedDueIn = useMemo(() => {
    if (!meanInterval || !lastFeed) return null;
    return new Date(lastFeed.occurredAt).getTime() + meanInterval - now;
  }, [lastFeed, meanInterval, now]);

  const totalMilkToday = summary.today.bottleMl;

  const smartAlerts = useMemo(() => buildSmartAlerts(entries, profile), [entries, profile]);
  const urgentAlerts = smartAlerts.filter((a) => a.tone === 'warning' || a.tone === 'danger');
  const healthStatus = useMemo(() => getHealthStatus(entries), [entries]);
  const hasHealthData = healthStatus.status !== 'unknown';
  const weightMeasurements = useMemo(() => getWeightMeasurements(entries), [entries]);
  const pinnedVaccines = useMemo(() => getPinnedVaccines(entries), [entries]);
  const lastFood = useMemo(() => getLastFood(entries), [entries]);
  const foodTodayCount = useMemo(() => getFoodTodayCount(entries), [entries]);
  const foodAllergyAlerts = useMemo(() => getFoodAllergyAlerts(entries), [entries]);
  const foodHistory = useMemo(() => getFoodHistory(entries), [entries]);
  const foodStats = useMemo(() => getFoodStats(entries), [entries]);

  // Night feeds: 22:00 previous day → 06:00 today
  const nightFeeds = useMemo(() => {
    const today = new Date();
    const nightStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 22, 0, 0).getTime();
    const nightEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 6, 0, 0).getTime();
    const window = Math.max(nightEnd, Date.now());
    return feedEntries.filter((e) => {
      const ts = new Date(e.occurredAt).getTime();
      return ts >= nightStart && ts <= window;
    });
  }, [feedEntries]);

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

  useEffect(() => {
    const refresh = async () => {
      setBabies(await getBabies());
      const activeBaby = await getActiveBaby();
      if (!activeBaby) return;
      setBabyId(activeBaby.id);
      const hydrationDateKey = `appleo.momHydrationDate:${activeBaby.id}`;
      const storedHydrationDate = await AsyncStorage.getItem(hydrationDateKey);
      const todayDate = new Date().toISOString().slice(0, 10);
      let currentHydration: number;
      if (storedHydrationDate !== todayDate) {
        currentHydration = 0;
        await setMomHydration(activeBaby.id, 0);
        await AsyncStorage.setItem(hydrationDateKey, todayDate);
      } else {
        currentHydration = await getMomHydration(activeBaby.id);
      }
      setHydration(currentHydration);
      setVisibility(await getModuleVisibility());
      const settings = await getAppSettings();
      setAppSettingsState(settings);
      const storedFeedingMode = (settings as any).defaultFeedingMode;
      if (storedFeedingMode === 'breast' || storedFeedingMode === 'bottle') {
        setDefaultFeedingMode(storedFeedingMode);
      }
      setDeviceDisplayName(await getDeviceDisplayName());
      setQuickAmount(await getLastBottleAmount());
    };

    void refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh();
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!quickTimerMode || !timerStartedAt) return;
    const timer = setInterval(() => {
      setTimerElapsedSeconds(Math.floor((Date.now() - timerStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [quickTimerMode, timerStartedAt]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  function startQuickTimer(mode: 'breast' | 'bottle', side: BreastSide = 'left') {
    const startedAt = Date.now();
    haptics.medium();
    setQuickTimerMode(mode);
    setQuickFeedSide(side);
    setTimerStartedAt(startedAt);
    setTimerElapsedSeconds(0);
    setQuickAmount(mode === 'bottle' ? 150 : 90);
  }

  async function saveQuickTimerEntry() {
    if (!timerStartedAt) return;
    await addEntry({
      type: 'feed',
      title: quickTimerMode === 'breast' ? t('entry.titleFeedBreast') : t('entry.titleFeedBottle'),
      occurredAt: new Date(timerStartedAt).toISOString(),
      payload:
        quickTimerMode === 'breast'
          ? {
              mode: 'breast',
              side: quickFeedSide,
              durationMin: Math.max(1, Math.round(timerElapsedSeconds / 60)),
              amountMl: quickAmount,
            }
          : {
              mode: 'bottle',
              amountMl: quickAmount,
              durationMin: Math.max(1, Math.round(timerElapsedSeconds / 60)),
            },
    });
    haptics.success();
    if (quickTimerMode === 'bottle') {
      void setLastBottleAmount(quickAmount);
    }
    setQuickTimerMode(null);
    setShowSaveSheet(false);
    setTimerStartedAt(null);
    setTimerElapsedSeconds(0);
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

  const lastFeedTime = lastFeed ? formatClock(lastFeed.occurredAt, locale) : '--:--';
  const lastFeedAmount = lastFeed?.payload?.amountMl ?? lastFeed?.payload?.durationMin ?? 0;
  const lastFeedType = lastFeed?.payload?.mode === 'bottle' ? t('feeding.bottle') : t('feeding.breast');
  const timeSinceLastFeed = formatRelative(lastFeed?.occurredAt, locale);
  const elapsedHours = hoursSince(lastFeed?.occurredAt);
  const elapsedColor = elapsedHours === null ? MUTED : elapsedHours < 2 ? GREEN : elapsedHours < 3 ? '#F2C86F' : RED;

  const recentEntries = entries.slice(0, 4);

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
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
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
                  ...textShadow('rgba(0,0,0,0.55)', 0, 1, 3),
                  textTransform: 'uppercase',
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
                accessibilityLabel="Settings"
              >
                <Ionicons name="settings-outline" size={18} color={TEXT_SECONDARY} />
              </Pressable>
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

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* ZONE 1 — AT-A-GLANCE (most used, top fold)             */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          {/* 1. Next Feeding Card - "When next?" critical info */}
          <Animated.View entering={FadeIn.duration(300).delay(60)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <NextFeedingCard onPress={openNextFeedPicker} />
          </Animated.View>

          {/* 2. PRIMARY ACTIONS — Bottle + Breast on the same row */}
          <Animated.View entering={FadeInDown.duration(260).delay(80)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* Bottle — primary, wider */}
              <Pressable
                onPress={() => startQuickTimer('bottle')}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  flex: 3,
                  height: 58,
                  borderRadius: 16,
                  backgroundColor: pressed ? `${TEXT}D9` : TEXT,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  ...shadow('#000', 0.2, 12, 0, 4),
                  elevation: 5,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <BottleIcon color="#0D1117" size={26} />
                <Text style={{ color: '#0D1117', fontSize: 15, fontWeight: '800', letterSpacing: 0.1 }}>{t('feeding.bottle')}</Text>
                <Text style={{ color: 'rgba(0,0,0,0.40)', fontSize: 12, fontWeight: '700', marginLeft: 2 }}>{quickAmount} ml</Text>
              </Pressable>
              {/* Breast — secondary, narrower */}
              <Pressable
                onPress={() => setShowNextFeedPicker(true)}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  flex: 2,
                  height: 58,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: pressed ? ACCENT + '80' : BORDER,
                  backgroundColor: pressed ? ACCENT + '14' : CARD,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <BreastfeedingIcon color={TEXT} size={24} />
                <Text style={{ color: TEXT, fontSize: 13, fontWeight: '700' }}>{t('feeding.breast')}</Text>
              </Pressable>
            </View>
          </Animated.View>

          {/* 3. Today at a glance — compact 3-metric strip */}
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
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderRightWidth: idx < arr.length - 1 ? 1 : 0,
                    borderRightColor: BORDER,
                  }}
                >
                  <Text style={{ fontSize: 18, marginBottom: 2 }}>{item.emoji}</Text>
                  <Text style={{ color: TEXT, fontSize: 17, fontWeight: '700', letterSpacing: -0.3 }}>{item.value}</Text>
                  <Text style={{ color: MUTED, fontSize: 10, fontWeight: '500', marginTop: 1 }}>{item.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* 4. Quick-add grid — above fold for instant access */}
          <Animated.View entering={FadeInDown.duration(260).delay(120)} style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Text style={{ color: MUTED, fontSize: 11, fontWeight: '500', marginBottom: 10, paddingHorizontal: 2 }}>
              {t('home.addEntry')}
            </Text>
            {(() => {
              const actions = [
                { type: 'diaper', label: t('entry.diaper'), color: '#F59E0B' },
                { type: 'temperature', label: t('entry.temperature'), color: '#EF4444' },
                { type: 'vaccine', label: t('entry.vaccine'), color: '#22C55E' },
                { type: 'symptom', label: t('entry.symptoms'), color: '#EC4899' },
                { type: 'food', label: t('entry.food'), color: '#D97706' },
                { type: 'medication', label: t('entry.medicine'), color: '#06B6D4' },
                { type: 'measurement', label: t('entry.measurement'), color: '#8B5CF6' },
                { type: 'sleep', label: t('entry.sleep'), color: '#3B82F6' },
              ];
              const renderRow = (rowItems: typeof actions, isFirst: boolean) => (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: isFirst ? 0 : 8 }}>
                  {rowItems.map((action) => (
                    <Pressable
                      key={action.type}
                      onPress={() => router.push(`/entry/${action.type}` as any)}
                      accessibilityRole="button"
                      accessibilityLabel={action.label}
                      style={({ pressed }) => ({
                        flex: 1,
                        aspectRatio: 1,
                        borderRadius: 16,
                        backgroundColor: pressed ? `${action.color}12` : CARD,
                        borderWidth: 1,
                        borderColor: pressed ? `${action.color}55` : BORDER,
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 7,
                        paddingHorizontal: 5,
                        ...shadow('#000', pressed ? 0.08 : 0.14, pressed ? 8 : 12, 0, pressed ? 2 : 4),
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
                    </Pressable>
                  ))}
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

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* ZONE 2 — ALERTS & REMINDERS (urgent attention)         */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          {/* 4. Urgent alerts - immediate attention needed */}
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

    backgroundColor: pressed
      ? 'rgba(15, 23, 42, 0.72)'
      : 'rgba(15, 23, 42, 0.58)',

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
                     <View
    style={{
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: `${c}22`,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Ionicons name={iconName} size={18} color={c} />
  </View>

  <View style={{ flex: 1 }}>
    <Text
      style={{
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
        ...textShadow('rgba(0,0,0,0.45)', 0, 1, 2),
      }}
      numberOfLines={1}
    >
      {alert.value}
    </Text>

    <Text
      style={{
        color: 'rgba(255,255,255,0.78)',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 3,
        ...textShadow('rgba(0,0,0,0.35)', 0, 1, 1.5),
      }}
      numberOfLines={2}
    >
      {alert.body}
    </Text>
  </View>
</Pressable>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* 5. Food allergy alerts */}
          {foodAllergyAlerts.length > 0 && (
            <Animated.View entering={FadeInDown.duration(260).delay(160)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderRadius: 12,
                  backgroundColor: `${YELLOW}10`,
                  borderLeftWidth: 3,
                  borderLeftColor: YELLOW,
                }}
              >
                <Ionicons name="alert-circle-outline" size={18} color={YELLOW} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: TEXT, fontSize: 13, fontWeight: '700' }}>
                    {t('food.possibleAllergies')}
                  </Text>
                  <Text style={{ color: MUTED, fontSize: 11, fontWeight: '600', marginTop: 2 }}>
                    {foodAllergyAlerts.slice(0, 2).map((a) => a.food).join(', ')}
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* 5b. Active medication banner */}
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
                  <Text style={{ color: TEXT, fontSize: 13, fontWeight: '700' }}>
                    {t('home.medActive')}
                  </Text>
                  <Text style={{ color: MUTED, fontSize: 11, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
                    {activeMeds.map((e) => e.payload?.name).filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Ionicons name="add-circle-outline" size={20} color={BLUE} />
              </Pressable>
            </Animated.View>
          )}

          {/* 6. Pinned vaccines - upcoming reminders */}
          {pinnedVaccines.length > 0 && (
            <Animated.View entering={FadeInDown.duration(260).delay(180)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
              <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ color: TEXT, fontSize: 13, fontWeight: '700' }}>
                    {t('vaccine.scheduled')}
                  </Text>
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
                          <Text style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>
                            {t('vaccine.dose')}{vaccine.payload?.vaccineDose}
                          </Text>
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

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* ZONE 3 — DAILY OVERVIEW (today's progress)             */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          {/* 7. Status row - Health + Food today */}
          {(hasHealthData || lastFood) && (
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
                  {lastFood.payload?.foodName && (
                    <Text style={{ color: GOLD, fontSize: 11, fontWeight: '500', marginTop: 3 }} numberOfLines={1}>
                      {lastFood.payload.mealTime === 'breakfast' ? '🌅 '
                        : lastFood.payload.mealTime === 'lunch' ? '🌞 '
                        : lastFood.payload.mealTime === 'snack' ? '🍪 '
                        : lastFood.payload.mealTime === 'dinner' ? '🌙 ' : '🍴 '}
                      {lastFood.payload.foodName}
                    </Text>
                  )}
                </Pressable>
              )}
            </Animated.View>
          )}

          {/* 8. Milk progress today */}
          <Animated.View entering={FadeInDown.duration(260).delay(240)} style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <View>
                  <Text style={{ color: MUTED, fontSize: 11, fontWeight: '500', marginBottom: 2 }}>
                    {t('milk.milk')}
                  </Text>
                  <Text style={{ color: TEXT, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 }}>{totalMilkToday} <Text style={{ color: MUTED, fontSize: 14, fontWeight: '500' }}>ml</Text></Text>
                </View>
                <Text style={{ color: ACCENT, fontSize: 11, fontWeight: '600' }}>{milkStatus}</Text>
              </View>
              <View style={{ height: 4, borderRadius: 2, backgroundColor: BORDER_SOFT, overflow: 'hidden' }}>
                <Animated.View style={[{ height: '100%', backgroundColor: ACCENT, borderRadius: 2 }, milkBarStyle]} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Text style={{ color: MUTED, fontSize: 11 }}>
                  {t('milk.target')} {milkGoalMin}–{milkGoalMax} ml
                </Text>
                {weeklyBottleTrend.thisAvg !== null && weeklyBottleTrend.lastAvg !== null && (
                  <Text style={{ color: weeklyBottleTrend.thisAvg >= weeklyBottleTrend.lastAvg ? GREEN : RED, fontSize: 11, fontWeight: '700' }}>
                    {weeklyBottleTrend.thisAvg >= weeklyBottleTrend.lastAvg ? '↑' : '↓'} {Math.abs(weeklyBottleTrend.thisAvg - weeklyBottleTrend.lastAvg)} ml {t('feeding.trendVsLastWeek')}
                  </Text>
                )}
              </View>
            </View>
          </Animated.View>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* ZONE 4 — HISTORY & REFERENCE (scroll for details)      */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          {/* 10. Recent activity - unified timeline (most useful history) */}
          {recentEntries.length > 0 && (
            <Animated.View entering={FadeInDown.duration(260).delay(310)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
              <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ color: TEXT, fontSize: 13, fontWeight: '600' }}>
                    {t('recent.recent')}
                  </Text>
                </View>
                <View>
                  {recentEntries.map((entry, idx) => {
                    const color =
                      entry.type === 'feed'
                        ? GOLD
                        : entry.type === 'sleep'
                          ? BLUE
                          : entry.type === 'diaper'
                            ? ACCENT
                            : entry.type === 'medication'
                              ? ACCENT
                              : MUTED;
                    return (
                      <Pressable
                        key={entry.id}
                        onPress={() => router.push({ pathname: '/entry/[type]', params: { type: entry.type, id: entry.id } })}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          paddingVertical: 10,
                          borderTopWidth: idx > 0 ? 1 : 0,
                          borderTopColor: BORDER_SOFT,
                          opacity: pressed ? 0.6 : 1,
                        })}
                      >
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: TEXT, fontSize: 13, fontWeight: '500' }}>{entry.title}</Text>
                          <Text style={{ color: MUTED, fontSize: 11, marginTop: 1 }}>
                            {entry.type === 'feed'
                              ? `${entry.payload?.amountMl ?? entry.payload?.durationMin ?? 0} ${entry.payload?.mode === 'bottle' ? 'ml' : 'min'}`
                              : entry.notes ?? entry.type}
                          </Text>
                        </View>
                        <Text style={{ color: SOFT, fontSize: 11, fontWeight: '500' }}>{formatClock(entry.occurredAt, locale)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </Animated.View>
          )}

          {/* 12. Food history - past meals */}
          {foodHistory.length > 0 && (
            <Animated.View entering={FadeInDown.duration(260).delay(420)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
              <Pressable onPress={() => router.push('/entry/food')} style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD }}>
                {/* Header row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View>
                    <Text style={{ color: MUTED, fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 }}>{t('food.history')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: TEXT, fontSize: 20, fontWeight: '700', letterSpacing: -0.3 }}>
                        {foodStats.mealsToday}
                      </Text>
                      <Text style={{ color: SOFT, fontSize: 13, fontWeight: '500' }}>{t('food.today')}</Text>
                      {foodStats.totalGramsToday > 0 && (
                        <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: GOLD + '22' }}>
                          <Text style={{ color: GOLD, fontSize: 11, fontWeight: '700' }}>{foodStats.totalGramsToday}g</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {foodStats.mostCommon && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: MUTED, fontSize: 10 }}>{t('food.favorite')}</Text>
                      <Text style={{ color: TEXT, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{foodStats.mostCommon.name} · {foodStats.mostCommon.count}×</Text>
                    </View>
                  )}
                </View>
                {/* Meal entries */}
                <View style={{ gap: 2 }}>
                  {foodHistory.map((food, idx) => {
                    const hasAllergy = (food.payload?.foodAllergies?.length ?? 0) > 0;
                    const ml = food.payload?.mealTime;
                    const ae = food.payload?.amountEaten;
                    const liked = food.payload?.foodLiked;
                    const mealIcon = ml === 'breakfast' ? '🌅' : ml === 'lunch' ? '🌞' : ml === 'snack' ? '🍪' : ml === 'dinner' ? '🌙' : '🍴';
                    const aeEmoji = ae === 'all' ? '🍽️' : ae === 'half' ? '🥗' : ae === 'little' ? '🥄' : ae === 'none' ? '🚫' : null;
                    const likedEmoji = liked === 'yes' ? '❤️' : liked === 'no' ? '😣' : null;
                    const isToday = new Date(food.occurredAt).toDateString() === new Date().toDateString();
                    return (
                      <Pressable
                        key={food.id}
                        onPress={() => router.push({ pathname: '/entry/[type]', params: { type: 'food', id: food.id } })}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          paddingVertical: 9,
                          paddingHorizontal: 10,
                          borderRadius: 10,
                          marginBottom: 2,
                          backgroundColor: isToday ? (hasAllergy ? 'rgba(231,76,60,0.06)' : GOLD + '0A') : 'transparent',
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <Text style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{mealIcon}</Text>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ color: TEXT, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{food.payload?.foodName}</Text>
                          {(food.payload?.quantityGrams || hasAllergy) && (
                            <Text style={{ color: MUTED, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                              {food.payload?.quantityGrams ? `${food.payload.quantityGrams}g` : ''}
                              {hasAllergy ? ` · ⚠️ ${food.payload?.foodAllergies?.slice(0, 1).join('')}` : ''}
                            </Text>
                          )}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          {aeEmoji && <Text style={{ fontSize: 13 }}>{aeEmoji}</Text>}
                          {likedEmoji && <Text style={{ fontSize: 13 }}>{likedEmoji}</Text>}
                          <Text style={{ color: SOFT, fontSize: 11 }}>{formatClock(food.occurredAt, locale)}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </Pressable>
            </Animated.View>
          )}

          {/* 13. Growth chart - long-term tracking */}
          {weightMeasurements.length > 0 && (
            <Animated.View entering={FadeInDown.duration(260).delay(390)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
              <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View>
                    <Text style={{ color: MUTED, fontSize: 11, fontWeight: '500', marginBottom: 2 }}>
                      {t('growth.growth')}
                    </Text>
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
          )}

          {/* 13b. Missing-data prompt — shown once if key categories never tracked */}
          {entries.length > 5 && (!hasAnySleep || !hasAnyDiaper) && (
            <Animated.View entering={FadeInDown.duration(260).delay(480)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
              <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="information-circle-outline" size={18} color={MUTED} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
                    {t('home.trackMoreTitle')}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {!hasAnySleep && (
                      <Pressable
                        onPress={() => router.push('/entry/sleep')}
                        style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: pressed ? `${BLUE}25` : `${BLUE}15`, borderWidth: 1, borderColor: `${BLUE}40` })}
                      >
                        <Text style={{ color: BLUE, fontSize: 11, fontWeight: '700' }}>😴 {t('entry.sleep')}</Text>
                      </Pressable>
                    )}
                    {!hasAnyDiaper && (
                      <Pressable
                        onPress={() => router.push('/entry/diaper')}
                        style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: pressed ? `${ACCENT}25` : `${ACCENT}15`, borderWidth: 1, borderColor: `${ACCENT}40` })}
                      >
                        <Text style={{ color: ACCENT, fontSize: 11, fontWeight: '700' }}>🧷 {t('entry.diaper')}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            </Animated.View>
          )}

          {/* 14. Hydration - mom's wellness (least critical for baby tracking) */}
          <Animated.View entering={FadeInDown.duration(260).delay(495)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <View>
                  <Text style={{ color: MUTED, fontSize: 11, fontWeight: '500', marginBottom: 2 }}>
                    {t('hydration.hydration')}
                  </Text>
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
                      const next = hydration + item.amount;
                      setHydration(next);
                      await setMomHydration(babyId, next);
                    }}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: pressed ? `${BLUE}22` : CARD,
                      borderWidth: 1,
                      borderColor: BORDER,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.88 : 1,
                    })}
                  >
                    <Text style={{ color: TEXT, fontSize: 13, fontWeight: '600' }}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Animated.View>
        </View>
      </ScrollView>

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
            <Text style={styles.menuSubtitle}>
              {t('modal.toggleSections')}
            </Text>
            <View style={styles.customizerGrid}>
              {[
                { key: 'nextFeed', label: t('modal.nextFeeding') },
                { key: 'milkProgress', label: t('modal.milkProgress') },
                { key: 'smartSignals', label: t('modal.alerts') },
              ].map((item) => {
                const enabled = appSettings.dashboardMetrics[item.key as keyof typeof appSettings.dashboardMetrics];
                return (
                  <View key={item.key} style={styles.customizerItem}>
                    <Button
                      label={`${enabled ? t('modal.hide') : t('modal.show')} ${item.label}`}
                      onPress={() => void updateDashboardMetric(item.key as keyof typeof appSettings.dashboardMetrics, !enabled)}
                      variant={enabled ? 'secondary' : 'ghost'}
                      size="sm"
                    />
                  </View>
                );
              })}
            </View>

            <View style={{ gap: 6, marginTop: 12, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 12 }}>
              <Text style={{ color: MUTED, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>
                {t('home.defaultFeeding')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label={`🤱 ${t('feeding.breast')}`}
                    onPress={() => {
                      setDefaultFeedingMode('breast');
                      void updateAppSettings({ defaultFeedingMode: 'breast' } as any);
                    }}
                    variant={defaultFeedingMode === 'breast' ? 'secondary' : 'ghost'}
                    size="sm"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label={`🍼 ${t('feeding.bottle')}`}
                    onPress={() => {
                      setDefaultFeedingMode('bottle');
                      void updateAppSettings({ defaultFeedingMode: 'bottle' } as any);
                    }}
                    variant={defaultFeedingMode === 'bottle' ? 'secondary' : 'ghost'}
                    size="sm"
                  />
                </View>
              </View>
            </View>

            <View style={{ gap: 8, marginTop: 12 }}>
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
                            {active ? t('home.activeLabel') : t('common.add')}
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
        visible={Boolean(quickTimerMode && timerStartedAt && !showSaveSheet)}
        emoji={quickTimerMode === 'bottle' ? '\u{1F37C}' : '\u{1F931}'}
        title={activeFeedTitle}
        subtitlePrefix={activeFeedSubtitlePrefix}
        startedAt={timerStartedAt ?? Date.now()}
        elapsedSeconds={timerElapsedSeconds}
        animatePulse={appSettings.effects.emojiPulse}
        onStop={() => setShowSaveSheet(true)}
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
              <QuantityPicker value={quickAmount} onChange={setQuickAmount} largeTouchMode={appSettings.largeTouchMode} />
              <View style={styles.sheetActions}>
                <Button label={t('common.save')} onPress={saveQuickTimerEntry} />
                <Button
                  label={t('common.cancel')}
                  variant="ghost"
                  onPress={() => {
                    Alert.alert(
                      t('common.cancel'),
                      t('entry.discardSession'),
                      [
                        { text: t('entry.keepSession'), style: 'cancel' },
                        {
                          text: t('entry.discardConfirm'),
                          style: 'destructive',
                          onPress: () => {
                            setQuickTimerMode(null);
                            setShowSaveSheet(false);
                            setTimerStartedAt(null);
                            setTimerElapsedSeconds(0);
                            setQuickAmount(150);
                          },
                        },
                      ]
                    );
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
