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
  updateAppSettings,
} from '@/lib/storage';
import { QuantityPicker } from '@/components/QuantityPicker';
import { FullscreenTimerModal } from '@/components/FullscreenTimerModal';
import { NextFeedingCard } from '@/components/NextFeedingCard';
import { GetEntryIcon } from '@/components/EntryTypeIcons';
import { haptics } from '@/lib/haptics';

const BG = 'rgba(13, 17, 23, 0.28)';
const CARD = 'rgba(18, 24, 34, 0.72)';
const CARD_BLUR = 'rgba(22, 27, 34, 0.65)';
const BORDER = 'rgba(255, 255, 255, 0.10)';
const BORDER_GLOW = 'rgba(201, 162, 39, 0.15)';
const GOLD = '#C9A227';
const GREEN = '#3FB950';
const BLUE = '#58A6FF';
const RED = '#E74C3C';
const MUTED = '#8B949E';
const TEXT = '#F0F6FC';
const YELLOW = '#F2C86F';

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

function getHealthStatus(entries: EntryRecord[]) {
  const lastTemp = entries.find((e) => e.type === 'temperature' || (e.type === 'measurement' && e.payload?.tempC));
  const tempC = lastTemp?.payload?.tempC;
  if (!tempC) return { status: 'unknown', color: MUTED, label: 'No data' };
  if (tempC < 37.5) return { status: 'normal', color: GREEN, label: 'Normal' };
  if (tempC < 38) return { status: 'fever_low', color: YELLOW, label: 'Febrícula' };
  return { status: 'fever', color: RED, label: 'Fiebre' };
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

function alertToneColor(tone: 'primary' | 'secondary' | 'success' | 'warning' | 'danger') {
  if (tone === 'danger') return RED;
  if (tone === 'warning') return '#F2C86F';
  if (tone === 'success') return GREEN;
  if (tone === 'secondary') return BLUE;
  return GOLD;
}

function GlassCard({ children, style, blur = true }: { children: React.ReactNode; style?: any; blur?: boolean }) {
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
}

function GradientButton({
  label,
  icon,
  onPress,
  colors,
  style,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  colors: [string, string];
  style?: any;
}) {
  return (
    <Pressable
      {...touchTargetProps}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: 60,
          borderRadius: 16,
          overflow: 'hidden',
          opacity: pressed ? 0.9 : 1,
          shadowColor: colors[0],
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 5,
        },
        style,
      ]}
    >
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }}>
        <Text style={{ fontSize: 24 }}>{icon}</Text>
        <Text style={{ color: TEXT, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function ActionButton({
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
}) {
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
}

export default function HomeScreen() {
  const { language } = useLocale();
  const locale = localeTag(language);
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { entries, summary, addEntry, loading } = useAppData();
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
      ? language === 'fr'
        ? 'Encore sous le repère'
        : 'Below target'
      : totalMilkToday > milkGoalMax
        ? language === 'fr'
          ? 'Au dessus de la zone'
          : 'Above target'
        : language === 'fr'
          ? 'Dans la zone'
          : 'In target';

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
  const lastFeedType = lastFeed?.payload?.mode === 'bottle' ? 'Biberon' : 'Sein';
  const timeSinceLastFeed = formatRelative(lastFeed?.occurredAt, locale);

  const recentEntries = entries.slice(0, 4);

  const activeFeedTitle =
    quickTimerMode === 'bottle'
      ? 'Biberon'
      : quickFeedSide === 'both'
        ? 'Sein des deux'
        : quickFeedSide === 'right'
          ? 'Sein droit'
          : 'Sein gauche';
  const activeFeedSubtitlePrefix =
    quickTimerMode === 'bottle'
      ? 'Biberon'
      : quickFeedSide === 'both'
        ? 'Les deux'
        : quickFeedSide === 'right'
          ? 'Droite'
          : 'Gauche';

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
          {/* Header with LinearGradient */}
          <Animated.View entering={FadeIn.duration(300)}>
            <LinearGradient colors={['rgba(22, 28, 40, 0.95)', 'rgba(13, 17, 25, 0.0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ paddingHorizontal: 16, paddingVertical: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: TEXT, fontSize: 24, fontWeight: '700' }}>
                  {t(`greeting.${getHourPeriod()}`)}, {profile?.displayName || 'maman'} ✨
                </Text>
                <Pressable
                  onPress={() => setShowHomeCustomizer(true)}
                  style={({ pressed }) => ({
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: BORDER,
                    backgroundColor: pressed ? `${BLUE}22` : CARD,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.88 : 1,
                  })}
                >
                  <Ionicons name="settings" size={16} color={TEXT} />
                </Pressable>
              </View>
              <Pressable
                onPress={() => setShowBabySwitcher(true)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 18 }}>🍼</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: TEXT, fontSize: 15, fontWeight: '700' }}>{activeBabyName}</Text>
                  {lastMeasurement && babyAge && (
                    <Text style={{ color: MUTED, fontSize: 11 }}>
                      {lastMeasurement.payload?.weightKg ?? '--'} kg · {lastMeasurement.payload?.heightCm ?? '--'} cm · {babyAge.months} {language === 'fr' ? 'mois' : 'months'} {babyAge.days} {language === 'fr' ? 'j' : 'd'}
                    </Text>
                  )}
                </View>
                <Text style={{ color: MUTED, fontSize: 14, fontWeight: '700' }}>›</Text>
              </Pressable>
            </LinearGradient>
          </Animated.View>

          {/* NextFeedingCard */}
          <Animated.View entering={FadeIn.duration(300).delay(60)} style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <NextFeedingCard onPress={openNextFeedPicker} />
          </Animated.View>

          {/* Health Status Card */}
          <Animated.View entering={FadeInDown.duration(260).delay(90)} style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <Pressable
              onPress={() => router.push('/entry/temperature')}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: `${healthStatus.color}44`,
                backgroundColor: `${healthStatus.color}12`,
                opacity: pressed ? 0.88 : 1,
              })}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: `${healthStatus.color}22`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View style={{ width: 20, height: 20 }}>
                  {GetEntryIcon('temperature', 20, healthStatus.color)}
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: MUTED, fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {t('health.status')}
                </Text>
                <Text style={{ color: TEXT, fontSize: 14, fontWeight: '700' }}>
                  {healthStatus.label}
                </Text>
              </View>
              <Text style={{ fontSize: 16 }}>›</Text>
            </Pressable>
          </Animated.View>

          {/* Food Status Card */}
          {lastFood && (
            <Animated.View entering={FadeInDown.duration(260).delay(105)} style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              <Pressable
                onPress={() => router.push('/entry/food')}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: `${BLUE}44`,
                  backgroundColor: `${BLUE}12`,
                  opacity: pressed ? 0.88 : 1,
                })}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: `${BLUE}22`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View style={{ width: 20, height: 20 }}>
                    {GetEntryIcon('food', 20, BLUE)}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: MUTED, fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>
                    {t('food.status')}
                  </Text>
                  <Text style={{ color: TEXT, fontSize: 14, fontWeight: '700' }}>
                    {lastFood.payload?.foodName || 'Comida registrada'} • {foodTodayCount} {t('food.today')}
                  </Text>
                </View>
                <Text style={{ fontSize: 16 }}>›</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Pinned Vaccines */}
          {pinnedVaccines.length > 0 && (
            <Animated.View entering={FadeInDown.duration(260).delay(110)} style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              <GlassCard style={{ paddingHorizontal: 14, paddingVertical: 12 }} blur={false}>
                <Text style={{ color: GREEN, fontSize: 10, letterSpacing: 1.5, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 }}>
                  {t('vaccine.scheduled')}
                </Text>
                <View style={{ gap: 8 }}>
                  {pinnedVaccines.map((vaccine) => {
                    const daysUntil = Math.ceil((new Date(vaccine.payload?.vaccineNextDueDate ?? '').getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <Pressable
                        key={vaccine.id}
                        onPress={() => router.push({ pathname: '/entry/[type]', params: { type: 'vaccine', id: vaccine.id } })}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          paddingVertical: 8,
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${GREEN}22`, alignItems: 'center', justifyContent: 'center' }}>
                          <View style={{ width: 14, height: 14 }}>
                            {GetEntryIcon('vaccine', 14, GREEN)}
                          </View>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700' }}>{vaccine.payload?.vaccineName}</Text>
                          <Text style={{ color: MUTED, fontSize: 11 }}>
                            {language === 'fr' ? 'Dose ' : 'Dose '}{vaccine.payload?.vaccineDose} • {daysUntil > 0 ? `${daysUntil}d` : 'Overdue'}
                          </Text>
                        </View>
                        {daysUntil > 0 ? (
                          daysUntil <= 7 ? (
                            <Ionicons name="alert-circle" size={14} color={YELLOW} />
                          ) : (
                            <Text style={{ color: TEXT, fontSize: 11, fontWeight: '600' }}>›</Text>
                          )
                        ) : (
                          <Text style={{ color: TEXT, fontSize: 11, fontWeight: '600' }}>!</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </GlassCard>
            </Animated.View>
          )}

          {/* Two Stat Cards */}
          <Animated.View entering={FadeInDown.duration(260).delay(120)} style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <GlassCard style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 12 }} blur={false}>
                <Text style={{ color: MUTED, fontSize: 9, letterSpacing: 1.2, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 }}>
                  {t('feeding.lastFeeding')}
                </Text>
                <Text style={{ color: TEXT, fontSize: 20, fontWeight: '700', marginBottom: 2 }}>{lastFeedTime}</Text>
                <Text style={{ color: MUTED, fontSize: 11 }}>
                  {lastFeedAmount} {lastFeed?.payload?.mode === 'bottle' ? 'ml' : 'min'} · {lastFeedType}
                </Text>
              </GlassCard>
              <GlassCard style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 12 }} blur={false}>
                <Text style={{ color: MUTED, fontSize: 9, letterSpacing: 1.2, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 }}>
                  {t('feeding.timeSinceLast')}
                </Text>
                <Text style={{ color: TEXT, fontSize: 20, fontWeight: '700', marginBottom: 2 }}>{timeSinceLastFeed}</Text>
                <Text style={{ color: MUTED, fontSize: 11 }}>
                  {t('feeding.elapsed')}
                </Text>
              </GlassCard>
            </View>
          </Animated.View>

          {/* Large Gradient Buttons */}
          <Animated.View entering={FadeInDown.duration(260).delay(180)} style={{ paddingHorizontal: 16, marginBottom: 12, flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <GradientButton
                label={t('feeding.breast')}
                icon="🤱"
                onPress={openNextFeedPicker}
                colors={[GOLD, '#A07818']}
              />
            </View>
            <View style={{ flex: 1 }}>
              <GradientButton
                label={t('feeding.bottle')}
                icon="🍼"
                onPress={() => startQuickTimer('bottle')}
                colors={['#1A6BB0', '#0D4F8C']}
              />
            </View>
          </Animated.View>

          {/* Milk Section */}
          <Animated.View entering={FadeInDown.duration(260).delay(240)} style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <GlassCard
              style={{
                paddingHorizontal: 14,
                paddingVertical: 12,
                gap: 10,
                borderColor: BORDER_GLOW,
              }}
              blur={false}
            >
              <Text style={{ color: GOLD, fontSize: 10, letterSpacing: 1.5, fontWeight: '600', textTransform: 'uppercase' }}>
                {t('milk.milk')}
              </Text>
              <View style={{ gap: 6 }}>
                <Text style={{ color: TEXT, fontSize: 20, fontWeight: '700' }}>{totalMilkToday} ml</Text>
                <View style={{ height: 6, borderRadius: 999, backgroundColor: BORDER, overflow: 'hidden' }}>
                  <Animated.View style={[{ height: '100%', backgroundColor: GOLD, borderRadius: 999 }, milkBarStyle]} />
                </View>
                <Text style={{ color: MUTED, fontSize: 11 }}>
                  {t('milk.target')} • {milkStatus}
                </Text>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Smart Signals - Only if urgent alerts */}
          {urgentAlerts.length > 0 && (
            <Animated.View entering={FadeInDown.duration(260).delay(300)} style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              <View style={{ gap: 6 }}>
                {urgentAlerts.slice(0, 2).map((alert) => (
                  <GlassCard
                    key={alert.id}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      borderColor: `${alertToneColor(alert.tone)}44`,
                      backgroundColor: `${alertToneColor(alert.tone)}12`,
                    }}
                    blur={false}
                  >
                    <Text style={{ fontSize: 18 }}>{alert.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700' }}>{alert.value}</Text>
                      <Text style={{ color: MUTED, fontSize: 11 }}>{alert.body}</Text>
                    </View>
                  </GlassCard>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Food Allergy Alerts */}
          {foodAllergyAlerts.length > 0 && (
            <Animated.View entering={FadeInDown.duration(260).delay(330)} style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              <GlassCard
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  borderColor: `${YELLOW}44`,
                  backgroundColor: `${YELLOW}12`,
                }}
                blur={false}
              >
                <Ionicons name="alert-circle" size={20} color={YELLOW} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700' }}>
                    {t('food.possibleAllergies')}
                  </Text>
                  <Text style={{ color: MUTED, fontSize: 11 }}>
                    {foodAllergyAlerts.slice(0, 2).map((a) => a.food).join(', ')}
                  </Text>
                </View>
              </GlassCard>
            </Animated.View>
          )}

          {/* Grid Actions - Expanded */}
          <Animated.View entering={FadeInDown.duration(260).delay(360)} style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Pressable
                  onPress={() => router.push('/entry/diaper')}
                  style={({ pressed }) => [
                    {
                      height: 56,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      backgroundColor: pressed ? `${GREEN}22` : CARD,
                      borderWidth: 1,
                      borderColor: BORDER,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <View style={{ width: 24, height: 24 }}>
                    {GetEntryIcon('diaper', 24, GREEN)}
                  </View>
                  <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{t('entry.diaper')}</Text>
                </Pressable>
              </View>
              <View style={{ flex: 1 }}>
                <Pressable
                  onPress={() => router.push('/entry/temperature')}
                  style={({ pressed }) => [
                    {
                      height: 56,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      backgroundColor: pressed ? `${RED}22` : CARD,
                      borderWidth: 1,
                      borderColor: BORDER,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <View style={{ width: 24, height: 24 }}>
                    {GetEntryIcon('temperature', 24, RED)}
                  </View>
                  <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{t('entry.temperature')}</Text>
                </Pressable>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Pressable
                  onPress={() => router.push('/entry/vaccine')}
                  style={({ pressed }) => [
                    {
                      height: 56,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      backgroundColor: pressed ? `${GREEN}22` : CARD,
                      borderWidth: 1,
                      borderColor: BORDER,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <View style={{ width: 24, height: 24 }}>
                    {GetEntryIcon('vaccine', 24, GREEN)}
                  </View>
                  <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{t('entry.vaccine')}</Text>
                </Pressable>
              </View>
              <View style={{ flex: 1 }}>
                <Pressable
                  onPress={() => router.push('/entry/symptom')}
                  style={({ pressed }) => [
                    {
                      height: 56,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      backgroundColor: pressed ? `${BLUE}22` : CARD,
                      borderWidth: 1,
                      borderColor: BORDER,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <View style={{ width: 24, height: 24 }}>
                    {GetEntryIcon('symptom', 24, BLUE)}
                  </View>
                  <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{t('entry.symptoms')}</Text>
                </Pressable>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Pressable
                  onPress={() => router.push('/entry/food')}
                  style={({ pressed }) => [
                    {
                      height: 56,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      backgroundColor: pressed ? `${BLUE}22` : CARD,
                      borderWidth: 1,
                      borderColor: BORDER,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <View style={{ width: 24, height: 24 }}>
                    {GetEntryIcon('food', 24, BLUE)}
                  </View>
                  <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{t('entry.food')}</Text>
                </Pressable>
              </View>
              <View style={{ flex: 1 }}>
                <Pressable
                  onPress={() => router.push('/entry/medication')}
                  style={({ pressed }) => [
                    {
                      height: 56,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      backgroundColor: pressed ? `${GREEN}22` : CARD,
                      borderWidth: 1,
                      borderColor: BORDER,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <View style={{ width: 24, height: 24 }}>
                    {GetEntryIcon('medication', 24, GREEN)}
                  </View>
                  <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{t('entry.medicine')}</Text>
                </Pressable>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Pressable
                  onPress={() => router.push('/entry/measurement')}
                  style={({ pressed }) => [
                    {
                      height: 56,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      backgroundColor: pressed ? `${BLUE}22` : CARD,
                      borderWidth: 1,
                      borderColor: BORDER,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <View style={{ width: 24, height: 24 }}>
                    {GetEntryIcon('measurement', 24, BLUE)}
                  </View>
                  <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{t('entry.measurement')}</Text>
                </Pressable>
              </View>
              <View style={{ flex: 1 }}>
                <Pressable
                  onPress={() => router.push('/entry/sleep')}
                  style={({ pressed }) => [
                    {
                      height: 56,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      backgroundColor: pressed ? `${BLUE}22` : CARD,
                      borderWidth: 1,
                      borderColor: BORDER,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <View style={{ width: 24, height: 24 }}>
                    {GetEntryIcon('sleep', 24, BLUE)}
                  </View>
                  <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{t('entry.sleep')}</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>

          {/* Growth Chart */}
          {weightMeasurements.length > 0 && (
            <Animated.View entering={FadeInDown.duration(260).delay(390)} style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              <GlassCard style={{ paddingHorizontal: 14, paddingVertical: 12 }} blur={false}>
                <Text style={{ color: GOLD, fontSize: 10, letterSpacing: 1.5, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 }}>
                  {t('growth.growth')}
                </Text>
                <Text style={{ color: TEXT, fontSize: 14, fontWeight: '700', marginBottom: 10 }}>
                  {t('growth.weight')}: {(weightMeasurements[0]?.weight ?? 0).toFixed(2)} kg
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 50, justifyContent: 'center' }}>
                  {(() => {
                    const weights = weightMeasurements.map((w) => w.weight ?? 0).filter((w) => w > 0);
                    if (weights.length === 0) return null;
                    const maxWeight = Math.max(...weights);
                    const minWeight = Math.min(...weights);
                    const range = maxWeight - minWeight || 1;
                    return weightMeasurements.map((m, i) => {
                      const w = m.weight ?? 0;
                      const height = ((w - minWeight) / range) * 40 + 10;
                      return (
                        <View
                          key={i}
                          style={{
                            flex: 1,
                            height,
                            borderRadius: 4,
                            backgroundColor: GOLD,
                            opacity: 0.8 + (i / weightMeasurements.length) * 0.2,
                          }}
                        />
                      );
                    });
                  })()}
                </View>
                <Text style={{ color: MUTED, fontSize: 10, marginTop: 8 }}>
                  {t('growth.lastMeasurements')}
                  {weightMeasurements.length}
                  {language === 'fr' ? ' mesures' : ' measurements'}
                </Text>
              </GlassCard>
            </Animated.View>
          )}

          {/* Vaccine History */}
          {vaccineHistory.length > 0 && (
            <Animated.View entering={FadeInDown.duration(260).delay(405)} style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              <GlassCard style={{ paddingHorizontal: 14, paddingVertical: 12 }} blur={false}>
                <Text style={{ color: GREEN, fontSize: 10, letterSpacing: 1.5, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 }}>
                  {t('vaccine.history')}
                </Text>
                <View style={{ gap: 6 }}>
                  {vaccineHistory.map((vaccine) => (
                    <Pressable
                      key={vaccine.id}
                      onPress={() => router.push({ pathname: '/entry/[type]', params: { type: 'vaccine', id: vaccine.id } })}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        paddingVertical: 8,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${GREEN}22`, alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: GREEN }} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700' }}>{vaccine.payload?.vaccineName}</Text>
                        <Text style={{ color: MUTED, fontSize: 11 }}>
                          {t('vaccine.dose')}{vaccine.payload?.vaccineDose}{vaccine.payload?.hasReminder ? ' • ' : ''}
                        </Text>
                        {vaccine.payload?.hasReminder && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="notifications" size={12} color={MUTED} />
                            <Text style={{ color: MUTED, fontSize: 11 }}>{t('vaccine.reminder')}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ color: MUTED, fontSize: 11 }}>{formatClock(vaccine.occurredAt, locale)}</Text>
                    </Pressable>
                  ))}
                </View>
              </GlassCard>
            </Animated.View>
          )}

          {/* Food History */}
          {foodHistory.length > 0 && (
            <Animated.View entering={FadeInDown.duration(260).delay(420)} style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              <GlassCard style={{ paddingHorizontal: 14, paddingVertical: 12 }} blur={false}>
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ color: BLUE, fontSize: 10, letterSpacing: 1.5, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 }}>
                    {t('food.history')}
                  </Text>
                  {foodStats.mostCommon && (
                    <Text style={{ color: MUTED, fontSize: 11 }}>
                      {t('food.favorite')}
                      <Text style={{ color: TEXT, fontWeight: '600' }}>{foodStats.mostCommon.name}</Text>
                      {' '}
                      ({foodStats.mostCommon.count}x)
                    </Text>
                  )}
                </View>
                <View style={{ gap: 6 }}>
                  {foodHistory.map((food) => (
                    <Pressable
                      key={food.id}
                      onPress={() => router.push({ pathname: '/entry/[type]', params: { type: 'food', id: food.id } })}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        paddingVertical: 8,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${BLUE}22`, alignItems: 'center', justifyContent: 'center' }}>
                        {(food.payload?.foodAllergies?.length ?? 0) > 0 ? (
                          <Ionicons name="alert-circle" size={16} color={YELLOW} />
                        ) : (
                          <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: BLUE }} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700' }}>{food.payload?.foodName}</Text>
                        <Text style={{ color: MUTED, fontSize: 11 }}>
                          {t('food.amount')}
                          {food.payload?.quantity}
                          {(food.payload?.foodAllergies?.length ?? 0) > 0 && ` • ${food.payload?.foodAllergies?.join(', ')}`}
                        </Text>
                      </View>
                      <Text style={{ color: MUTED, fontSize: 11 }}>{formatClock(food.occurredAt, locale)}</Text>
                    </Pressable>
                  ))}
                </View>
              </GlassCard>
            </Animated.View>
          )}

          {/* Recent Activity */}
          {recentEntries.length > 0 && (
            <Animated.View entering={FadeInDown.duration(260).delay(435)} style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              <GlassCard style={{ paddingHorizontal: 14, paddingVertical: 12 }} blur={false}>
                <Text style={{ color: GOLD, fontSize: 10, letterSpacing: 1.5, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 }}>
                  {t('recent.recent')}
                </Text>
                <View style={{ gap: 6 }}>
                  {recentEntries.map((entry) => {
                    const color =
                      entry.type === 'feed'
                        ? GOLD
                        : entry.type === 'sleep'
                          ? BLUE
                          : entry.type === 'diaper'
                            ? RED
                            : entry.type === 'medication'
                              ? GREEN
                              : '#A371F7';
                    return (
                      <Pressable
                        key={entry.id}
                        onPress={() => router.push({ pathname: '/entry/[type]', params: { type: entry.type, id: entry.id } })}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          paddingVertical: 8,
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center' }}>
                          <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: color }} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700' }}>{entry.title}</Text>
                          <Text style={{ color: MUTED, fontSize: 11 }}>
                            {entry.type === 'feed'
                              ? `${entry.payload?.amountMl ?? entry.payload?.durationMin ?? 0} ${entry.payload?.mode === 'bottle' ? 'ml' : 'min'}`
                              : entry.notes ?? entry.type}
                          </Text>
                        </View>
                        <Text style={{ color: MUTED, fontSize: 11 }}>{formatClock(entry.occurredAt, locale)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </GlassCard>
            </Animated.View>
          )}

          {/* Hydration */}
          <Animated.View entering={FadeInDown.duration(260).delay(495)} style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <GlassCard style={{ paddingHorizontal: 14, paddingVertical: 12, gap: 10 }} blur={false}>
              <Text style={{ color: GOLD, fontSize: 10, letterSpacing: 1.5, fontWeight: '600', textTransform: 'uppercase' }}>
                {t('hydration.hydration')}
              </Text>
              <Text style={{ color: MUTED, fontSize: 11 }}>
                {hydration} ml / {appSettings.hydrationGoalMl} ml
              </Text>
              <View style={{ height: 6, borderRadius: 999, backgroundColor: BORDER, overflow: 'hidden' }}>
                <View style={{ width: `${Math.max(0, Math.min(100, (hydration / appSettings.hydrationGoalMl) * 100))}%`, height: '100%', backgroundColor: BLUE }} />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { label: '+250ml', amount: 250 },
                  { label: '+500ml', amount: 500 },
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
                    <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700' }}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            </GlassCard>
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
                {language === 'fr' ? 'Prise par défaut' : 'Default feeding'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="🤱 Sein"
                    onPress={() => setDefaultFeedingMode('breast')}
                    variant={defaultFeedingMode === 'breast' ? 'secondary' : 'ghost'}
                    size="sm"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="🍼 Biberon"
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
                  {language === 'fr' ? 'Choisis le profil actif pour ce tableau de bord.' : 'Choose the active profile for this dashboard.'}
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
                            {active ? (language === 'fr' ? 'Actif' : 'Active') : t('common.add')}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: MUTED, fontSize: 12 }}>
                        {language === 'fr' ? 'Naissance: ' : 'Birth: '}
                        {baby.birthDate}
                      </Text>
                    </Pressable>
                  );
                })
              ) : (
                <View style={styles.emptySwitcherCard}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="people-outline" size={18} color={MUTED} />
                  </View>
                  <Text style={styles.emptySwitcherTitle}>{language === 'fr' ? "Aucun profil d'enfant" : 'No child profile yet'}</Text>
                  <Text style={styles.emptySwitcherSubtitle}>
                    {language === 'fr' ? "Va dans Profil pour creer un enfant, puis reviens ici pour l'activer." : 'Go to Profile to create one, then return here to set it active.'}
                  </Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.switcherFooter}>
              <Button
                label={language === 'fr' ? 'Ouvrir Profil' : 'Open Profile'}
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
                {quickTimerMode === 'bottle' ? (language === 'fr' ? 'Biberon terminé' : 'Bottle complete') : `${activeFeedTitle} ${language === 'fr' ? 'terminé' : 'complete'}`}
              </Text>
              <Text style={styles.sheetSubtitle}>
                {language === 'fr' ? 'Durée ' : 'Duration '}{Math.max(1, Math.round(timerElapsedSeconds / 60))} min -{language === 'fr' ? ' commence à ' : ' started at '}{formatClock(timerStartedAt ? new Date(timerStartedAt).toISOString() : undefined, locale)}
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
    borderRadius: 28,
    backgroundColor: 'rgba(18, 23, 31, 0.96)',
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 22,
    paddingVertical: 22,
    gap: 18,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  sheetTitle: {
    color: TEXT,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  sheetSubtitle: {
    color: MUTED,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  sheetActions: {
    gap: 12,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  menuSheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    maxHeight: '86%',
    borderRadius: 22,
    backgroundColor: 'rgba(18, 23, 31, 0.96)',
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 7,
  },
  menuTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '800',
  },
  menuSubtitle: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 18,
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
    backgroundColor: 'rgba(0,0,0,0.68)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  switcherSheet: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '84%',
    alignSelf: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(18, 23, 31, 0.96)',
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 7,
  },
  switcherTitle: {
    color: TEXT,
    fontSize: 20,
    fontWeight: '800',
  },
  switcherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  switcherBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${GOLD}88`,
    backgroundColor: `${GOLD}18`,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  switcherSubtitle: {
    color: MUTED,
    fontSize: 13,
    marginTop: 2,
  },
  switcherItem: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: BG,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  switcherList: {
    maxHeight: 320,
  },
  emptySwitcherCard: {
    borderRadius: 16,
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
    fontWeight: '800',
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
