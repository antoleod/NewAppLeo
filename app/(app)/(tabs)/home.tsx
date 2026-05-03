import { useEffect, useMemo, useState } from 'react';
import { AppState, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { SafeAreaView } from 'react-native-safe-area-context';
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
  getModuleVisibility,
  getMomHydration,
  setActiveBabyId,
  setMomHydration,
  getDeviceDisplayName,
  updateAppSettings,
} from '@/lib/storage';
import { QuantityPicker } from '@/components/QuantityPicker';
import { FullscreenTimerModal } from '@/components/FullscreenTimerModal';
import { NextFeedingCard } from '@/components/NextFeedingCard';
import { GetEntryIcon } from '@/components/EntryTypeIcons';
import { haptics } from '@/lib/haptics';

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

function formatRelative(timestamp: string | undefined, _locale: string) {
  const hours = hoursSince(timestamp);
  if (hours === null) return '--';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 24) return `${Math.round(hours * 10) / 10} h`;
  return `${Math.round(hours / 24)} j`;
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

function getVaccineHistory(entries: EntryRecord[]) {
  return entries
    .filter((e) => e.type === 'vaccine')
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 5);
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
    .slice(0, 6);
}

function getFoodStats(entries: EntryRecord[]) {
  const foodEntries = entries.filter((e) => e.type === 'food');
  if (foodEntries.length === 0) return { mostCommon: null, totalUnique: 0 };

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
  };
}

export default function HomeScreen() {
  const { language } = useLocale();
  const locale = localeTag(language);
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const { entries, summary, addEntry, loading } = useAppData();
  const { theme, colors } = useTheme();

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
  const YELLOW = theme.red;

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

  const GlassCard = ({ children, style, blur = true }: { children: React.ReactNode; style?: any; blur?: boolean }) => {
    const content = (
      <View
        style={[
          {
            borderRadius: 16,
            borderWidth: 1,
            borderColor: BORDER,
            backgroundColor: CARD,
            shadowColor: '#000',
            shadowOpacity: 0.24,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 4 },
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
  };

  const ActionButton = ({
    label,
    icon,
    onPress,
    color = BLUE,
    style,
  }: {
    label: string;
    icon: string;
    onPress: () => void;
    color?: string;
    style?: any;
  }) => {
    return (
      <Pressable
        {...touchTargetProps}
        onPress={onPress}
        style={({ pressed }) => [
          {
            height: 56,
            paddingHorizontal: 14,
            borderRadius: 12,
            backgroundColor: pressed ? `${color}22` : CARD,
            borderWidth: 1,
            borderColor: BORDER,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: pressed ? 0.92 : 1,
          },
          style,
        ]}
      >
        <Text style={{ fontSize: 18 }}>{icon}</Text>
        <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{label}</Text>
      </Pressable>
    );
  };

  const styles = StyleSheet.create({
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
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
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
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
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
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
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
  });

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
  const [defaultFeedingMode, setDefaultFeedingMode] = useState<'breast' | 'bottle'>('breast');
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
  const milkGoalMin = 750;
  const milkGoalMax = 1050;
  const milkTargetPercent = Math.max(0, Math.min(100, (totalMilkToday / milkGoalMax) * 100));
  const milkStatus =
    totalMilkToday < milkGoalMin
      ? t('milk.belowTarget')
      : totalMilkToday > milkGoalMax
        ? t('milk.aboveTarget')
        : t('milk.inTarget');

  const smartAlerts = useMemo(() => buildSmartAlerts(entries, profile), [entries, profile]);
  const urgentAlerts = smartAlerts.filter((a) => a.tone === 'warning' || a.tone === 'danger');
  const healthStatus = useMemo(() => getHealthStatus(entries), [entries]);
  const weightMeasurements = useMemo(() => getWeightMeasurements(entries), [entries]);
  const pinnedVaccines = useMemo(() => getPinnedVaccines(entries), [entries]);
  const vaccineHistory = useMemo(() => getVaccineHistory(entries), [entries]);
  const lastFood = useMemo(() => getLastFood(entries), [entries]);
  const foodTodayCount = useMemo(() => getFoodTodayCount(entries), [entries]);
  const foodAllergyAlerts = useMemo(() => getFoodAllergyAlerts(entries), [entries]);
  const foodHistory = useMemo(() => getFoodHistory(entries), [entries]);
  const foodStats = useMemo(() => getFoodStats(entries), [entries]);

  const milkProgress = useSharedValue(0);

  useEffect(() => {
    milkProgress.value = withTiming(milkTargetPercent, { duration: 800 });
  }, [milkProgress, milkTargetPercent]);

  const milkBarStyle = useAnimatedStyle(() => ({
    width: `${milkProgress.value}%`,
  }));

  useEffect(() => {
    const refresh = async () => {
      setBabies(await getBabies());
      const activeBaby = await getActiveBaby();
      if (!activeBaby) return;
      setBabyId(activeBaby.id);
      setHydration(await getMomHydration(activeBaby.id));
      setVisibility(await getModuleVisibility());
      setAppSettingsState(await getAppSettings());
      setDeviceDisplayName(await getDeviceDisplayName());
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
      title:
        quickTimerMode === 'breast'
          ? quickFeedSide === 'both'
            ? 'Breast feed both'
            : quickFeedSide === 'right'
              ? 'Breast feed right'
              : 'Breast feed left'
          : 'Bottle feed',
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
    setQuickTimerMode(null);
    setShowSaveSheet(false);
    setTimerStartedAt(null);
    setTimerElapsedSeconds(0);
    setQuickAmount(150);
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

  const lastFeedTime = lastFeed ? formatClock(lastFeed.occurredAt, locale) : '--:--';
  const lastFeedAmount = lastFeed?.payload?.amountMl ?? lastFeed?.payload?.durationMin ?? 0;
  const lastFeedType = lastFeed?.payload?.mode === 'bottle' ? t('feeding.bottle') : t('feeding.breast');
  const timeSinceLastFeed = formatRelative(lastFeed?.occurredAt, locale);

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
    <Page contentStyle={styles.pageContent}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <View style={{ paddingBottom: 80 }}>
          {/* Premium Compact Header */}
          <Animated.View entering={FadeIn.duration(300)} style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
            {/* Top row: greeting + settings */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: MUTED, fontSize: 12, fontWeight: '500', letterSpacing: 0.3, marginBottom: 2 }}>
                  {t(`greeting.${getHourPeriod()}`)}
                </Text>
                <Text style={{ color: TEXT, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 }}>
                  {resolvedDisplayName}
                </Text>
              </View>
              <Pressable
                onPress={() => setShowHomeCustomizer(true)}
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: BORDER,
                  backgroundColor: pressed ? BORDER_SOFT : CARD,
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <Ionicons name="settings-outline" size={18} color={TEXT_SECONDARY} />
              </Pressable>
            </View>

            {/* Baby chip - compact and premium */}
            <Pressable
              onPress={() => setShowBabySwitcher(true)}
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

          {/* 2. PRIMARY ACTION - Feeding CTA (most frequent action) */}
          <Animated.View entering={FadeInDown.duration(260).delay(80)} style={{ paddingHorizontal: 20, marginBottom: 12, flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={openNextFeedPicker}
              style={({ pressed }) => ({
                flex: 1,
                height: 56,
                borderRadius: 14,
                backgroundColor: pressed ? '#1A1A1A' : TEXT,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              })}
            >
              <Text style={{ fontSize: 18 }}>🤱</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600', letterSpacing: 0.2 }}>{t('feeding.breast')}</Text>
            </Pressable>
            <Pressable
              onPress={() => startQuickTimer('bottle')}
              style={({ pressed }) => ({
                flex: 1,
                height: 56,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: TEXT,
                backgroundColor: pressed ? BORDER_SOFT : CARD,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              })}
            >
              <Text style={{ fontSize: 18 }}>🍼</Text>
              <Text style={{ color: TEXT, fontSize: 15, fontWeight: '600', letterSpacing: 0.2 }}>{t('feeding.bottle')}</Text>
            </Pressable>
          </Animated.View>

          {/* 3. Quick context - Last feed stats */}
          <Animated.View entering={FadeInDown.duration(260).delay(100)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD }}>
                <Text style={{ color: MUTED, fontSize: 11, fontWeight: '500', marginBottom: 6 }}>
                  {t('feeding.lastFeeding')}
                </Text>
                <Text style={{ color: TEXT, fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginBottom: 4 }}>{lastFeedTime}</Text>
                <Text style={{ color: SOFT, fontSize: 11 }}>
                  {lastFeedAmount} {lastFeed?.payload?.mode === 'bottle' ? 'ml' : 'min'} · {lastFeedType}
                </Text>
              </View>
              <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD }}>
                <Text style={{ color: MUTED, fontSize: 11, fontWeight: '500', marginBottom: 6 }}>
                  {t('feeding.timeSinceLast')}
                </Text>
                <Text style={{ color: TEXT, fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginBottom: 4 }}>{timeSinceLastFeed}</Text>
                <Text style={{ color: SOFT, fontSize: 11 }}>
                  {t('feeding.elapsed')}
                </Text>
              </View>
            </View>
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
                        borderRadius: 12,
                        backgroundColor: pressed ? `${c}15` : `${c}08`,
                        borderWidth: 1,
                        borderColor: `${c}20`,
                        borderLeftWidth: 4,
                        borderLeftColor: c,
                        opacity: pressed ? 0.9 : 1,
                      })}
                    >
                      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: `${c}15`, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name={iconName} size={18} color={c} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: TEXT, fontSize: 13, fontWeight: '600' }}>{alert.value}</Text>
                        <Text style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>{alert.body}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={`${c}50`} />
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
                  <Text style={{ color: TEXT, fontSize: 13, fontWeight: '600' }}>
                    {t('food.possibleAllergies')}
                  </Text>
                  <Text style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>
                    {foodAllergyAlerts.slice(0, 2).map((a) => a.food).join(', ')}
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* 6. Pinned vaccines - upcoming reminders */}
          {pinnedVaccines.length > 0 && (
            <Animated.View entering={FadeInDown.duration(260).delay(180)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
              <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ color: TEXT, fontSize: 13, fontWeight: '600' }}>
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
                            {language === 'fr' ? 'Dose ' : 'Dose '}{vaccine.payload?.vaccineDose}
                          </Text>
                        </View>
                        <Text style={{ color: isUrgent ? YELLOW : SOFT, fontSize: 12, fontWeight: '600' }}>
                          {daysUntil > 0 ? `${daysUntil}d` : 'Overdue'}
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
          <Animated.View entering={FadeInDown.duration(260).delay(220)} style={{ paddingHorizontal: 20, marginBottom: 12, flexDirection: 'row', gap: 8 }}>
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
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                })}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ACCENT }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: MUTED, fontSize: 10, fontWeight: '500' }}>{t('food.status')}</Text>
                  <Text style={{ color: TEXT, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                    {foodTodayCount} {t('food.today')}
                  </Text>
                </View>
              </Pressable>
            )}
          </Animated.View>

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
            </View>
          </Animated.View>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* ZONE 4 — QUICK ADD (secondary entries)                 */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          {/* 9. Quick add grid - exactly 2 rows × 4 buttons */}
          <Animated.View entering={FadeInDown.duration(260).delay(260)} style={{ paddingHorizontal: 20, marginBottom: 16 }}>
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
                        shadowColor: '#000',
                        shadowOpacity: pressed ? 0.08 : 0.14,
                        shadowRadius: pressed ? 8 : 12,
                        shadowOffset: { width: 0, height: pressed ? 2 : 4 },
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
          {/* ZONE 5 — HISTORY & REFERENCE (scroll for details)      */}
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

          {/* 11. Vaccine history - past vaccinations */}
          {vaccineHistory.length > 0 && (
            <Animated.View entering={FadeInDown.duration(260).delay(405)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
              <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD }}>
                <Text style={{ color: TEXT, fontSize: 13, fontWeight: '600', marginBottom: 10 }}>
                  {t('vaccine.history')}
                </Text>
                <View>
                  {vaccineHistory.map((vaccine, idx) => (
                    <Pressable
                      key={vaccine.id}
                      onPress={() => router.push({ pathname: '/entry/[type]', params: { type: 'vaccine', id: vaccine.id } })}
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
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: TEXT, fontSize: 13, fontWeight: '500' }}>{vaccine.payload?.vaccineName}</Text>
                        <Text style={{ color: MUTED, fontSize: 11, marginTop: 1 }}>
                          {t('vaccine.dose')}{vaccine.payload?.vaccineDose}
                        </Text>
                      </View>
                      <Text style={{ color: SOFT, fontSize: 11, fontWeight: '500' }}>{formatClock(vaccine.occurredAt, locale)}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </Animated.View>
          )}

          {/* 12. Food history - past meals */}
          {foodHistory.length > 0 && (
            <Animated.View entering={FadeInDown.duration(260).delay(420)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
              <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD }}>
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ color: TEXT, fontSize: 13, fontWeight: '600' }}>
                    {t('food.history')}
                  </Text>
                  {foodStats.mostCommon && (
                    <Text style={{ color: MUTED, fontSize: 11, marginTop: 4 }}>
                      {t('food.favorite')}<Text style={{ color: TEXT, fontWeight: '500' }}>{foodStats.mostCommon.name}</Text> · {foodStats.mostCommon.count}x
                    </Text>
                  )}
                </View>
                <View>
                  {foodHistory.map((food, idx) => {
                    const hasAllergy = (food.payload?.foodAllergies?.length ?? 0) > 0;
                    return (
                      <Pressable
                        key={food.id}
                        onPress={() => router.push({ pathname: '/entry/[type]', params: { type: 'food', id: food.id } })}
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
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: hasAllergy ? YELLOW : GOLD }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: TEXT, fontSize: 13, fontWeight: '500' }}>{food.payload?.foodName}</Text>
                          <Text style={{ color: MUTED, fontSize: 11, marginTop: 1 }}>
                            {t('food.amount')}{food.payload?.quantity}
                            {hasAllergy && ` · ${food.payload?.foodAllergies?.join(', ')}`}
                          </Text>
                        </View>
                        <Text style={{ color: SOFT, fontSize: 11, fontWeight: '500' }}>{formatClock(food.occurredAt, locale)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
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
                    <Text style={{ fontSize: 16 }}>🤱</Text>
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
                    onPress={() => setDefaultFeedingMode('breast')}
                    variant={defaultFeedingMode === 'breast' ? 'secondary' : 'ghost'}
                    size="sm"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label={`🍼 ${t('feeding.bottle')}`}
                    onPress={() => setDefaultFeedingMode('bottle')}
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
                    setQuickTimerMode(null);
                    setShowSaveSheet(false);
                    setTimerStartedAt(null);
                    setTimerElapsedSeconds(0);
                    setQuickAmount(150);
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
