import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { AppState, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, Animated } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated2, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  withDelay,
  interpolate,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Page } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { BreastSide } from '@/types';
import { buildSmartAlerts, getMeanFeedingInterval } from '@/lib/patterns';
import { getMedicationTimelineStatus } from '@/utils/entries';
import { getCareStagePolicy, getSickChildStatus } from '@/lib/careGuidance';
import cacheManager from '@/utils/cacheManager';
import { isSameDay, startOfDay } from '@/utils/date';
import {
  defaultHomeSectionOrder,
  defaultAppSettings,
  defaultModuleVisibility,
  HomeSectionKey,
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
import { BabyFlowIcon } from '@/components/BabyFlowIcon';

// Enhanced semantic color system
const COLORS = {
  bg: 'rgba(13, 17, 23, 0.95)',
  card: 'rgba(22, 27, 34, 0.92)',
  border: 'rgba(255, 255, 255, 0.08)',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  success: '#10B981',
  warning: '#F59E0B',
  alert: '#EF4444',
  primary: '#3B82F6',
  info: '#06B6D4',
  empty: '#6B7280',
  gold: '#F59E0B',
  green: '#10B981',
  red: '#EF4444',
  blue: '#3B82F6',
};

const BG = COLORS.bg;
const CARD = COLORS.card;
const BORDER = COLORS.border;
const TEXT = COLORS.text;
const MUTED = COLORS.textMuted;
const GREEN = COLORS.green;
const GOLD = COLORS.gold;
const RED = COLORS.red;
const BLUE = COLORS.blue;

// Type definitions for module system
type ModuleState = 'empty' | 'active' | 'alert' | 'completed' | 'pending';
type ModulePriority = 'critical' | 'high' | 'normal' | 'low';
type ModuleSize = 'compact' | 'expanded' | 'full';

interface ModuleConfig {
  id: string;
  type: string;
  state: ModuleState;
  priority: ModulePriority;
  size: ModuleSize;
  lastUpdated: number;
  urgency: number;
  contextRelevant: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  href: string;
  priority: number;
  context: string[];
  color: string;
}

// Helper functions
const localeTag = (lang: string) => (lang === 'fr' ? 'fr-FR' : lang === 'nl' ? 'nl-BE' : 'en-US');

const formatClock = (date: string | Date, locale: string) => {
  if (!date) return '--:--';
  const d = new Date(date);
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
};

const formatRelative = (date: string | Date, locale: string) => {
  if (!date) return '--';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
  return `${Math.floor(diffMins / 1440)}d`;
};

const formatCountdown = (ms: number | null, language: string) => {
  if (!ms) return '--';
  const absMs = Math.abs(ms);
  const mins = Math.floor(absMs / 60000);
  const hours = Math.floor(mins / 60);

  if (hours > 0) {
    const remainingMins = mins % 60;
    return `${hours}h${remainingMins > 0 ? remainingMins : ''}`;
  }
  return `${mins}m`;
};

const formatAvailability = (date: string | null, locale: string, language: string) => {
  if (!date) return '--';
  const d = new Date(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();

  if (diffMs <= 0) return 'Now';

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
};

const getStateBorderColor = (state: ModuleState) => {
  switch (state) {
    case 'alert': return COLORS.alert;
    case 'active': return COLORS.warning;
    case 'completed': return COLORS.success;
    case 'empty': return COLORS.empty;
    default: return COLORS.border;
  }
};

// Component styles
const styles = StyleSheet.create({
  pageContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContent: {
    backgroundColor: CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 8,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT,
    marginLeft: 12,
  },
});

// Helper components
function PressScale({ children, onPress, pressedScale = 0.95, style }: any) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ transform: [{ scale: pressed ? pressedScale : 1 }] }, style]}>
      {children}
    </Pressable>
  );
}

function StatCell({ label, value, icon, index, highlight }: any) {
  const colors = [COLORS.info, COLORS.warning, COLORS.success, COLORS.primary, COLORS.gold];
  const color = colors[index % colors.length];

  return (
    <PressScale
      onPress={() => {
        // Navigate to relevant section based on stat type
        if (label.toLowerCase().includes('feed')) {
          router.push('/insights/feeding');
        } else if (label.toLowerCase().includes('sleep')) {
          router.push('/insights/sleep');
        } else if (label.toLowerCase().includes('diaper')) {
          router.push('/insights/diapers');
        }
      }}
      pressedScale={0.96}
      style={{ flexBasis: '31%', flexGrow: 1, minWidth: 80 }}
    >
      <View style={{
        paddingHorizontal: 6,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: highlight ? `${color}20` : 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: highlight ? `${color}40` : 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center'
      }}>
        <Text style={{ color: color, fontSize: 15, fontWeight: '700' }}>{value}</Text>
        <Text style={{ color: MUTED, fontSize: 9, marginTop: 1, fontWeight: '500' }}>{label}</Text>
      </View>
    </PressScale>
  );
}

function HomeSectionCard({ children, sectionKey, isMobile, canMoveUp, canMoveDown, onMoveUp, onMoveDown, onHide }: any) {
  return (
    <View style={{ marginBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 }}>
        <View style={{ flex: 1 }} />
        {isMobile && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={onMoveUp}
              disabled={!canMoveUp}
              style={({ pressed }) => ({
                width: 28,
                height: 28,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: BORDER,
                backgroundColor: pressed ? '#1B2430' : BG,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: canMoveUp ? 1 : 0.35,
              })}
            >
              <Ionicons name="chevron-up" size={14} color={TEXT} />
            </Pressable>
            <Pressable
              onPress={onMoveDown}
              disabled={!canMoveDown}
              style={({ pressed }) => ({
                width: 28,
                height: 28,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: BORDER,
                backgroundColor: pressed ? '#1B2430' : BG,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: canMoveDown ? 1 : 0.35,
              })}
            >
              <Ionicons name="chevron-down" size={14} color={TEXT} />
            </Pressable>
            <Pressable
              onPress={onHide}
              style={({ pressed }) => ({
                width: 28,
                height: 28,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: BORDER,
                backgroundColor: pressed ? '#341B1B' : BG,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Ionicons name="eye-off-outline" size={14} color={TEXT} />
            </Pressable>
          </View>
        )}
      </View>
      {children}
    </View>
  );
}

function ActivityRow({
  color,
  title,
  detail,
  time,
  onPress,
}: {
  color: string;
  title: string;
  detail: string;
  time: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const highlight = useSharedValue(0);

  return (
    <Animated2.View>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 8,
            backgroundColor: pressed ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
          },
        ]}
      >
        <View style={{ width: 3, height: 3, borderRadius: 999, backgroundColor: color, marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: TEXT, fontSize: 13, fontWeight: '600' }}>{title}</Text>
          <Text style={{ color: MUTED, fontSize: 11 }}>{detail}</Text>
        </View>
        <Text style={{ color: MUTED, fontSize: 11 }}>{time}</Text>
      </Pressable>
    </Animated2.View>
  );
}

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const { language, t } = useLocale();
  const locale = localeTag(language);
  const { profile } = useAuth();
  const { entries, summary, addEntry } = useAppData();
  const [hydration, setHydration] = useState(0);
  const [babyId, setBabyId] = useState<string | null>(null);
  const [babies, setBabies] = useState<Array<{ id: string; name: string; birthDate: string }>>([]);
  const [visibility, setVisibility] = useState(defaultModuleVisibility);
  const [appSettings, setAppSettingsState] = useState(defaultAppSettings);
  const [quickTimerMode, setQuickTimerMode] = useState<'bottle' | 'breast' | null>(null);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [timerElapsedSeconds, setTimerElapsedSeconds] = useState(0);
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [showBabySwitcher, setShowBabySwitcher] = useState(false);
  const [showSmartSignalsMenu, setShowSmartSignalsMenu] = useState(false);
  const [showHomeCustomizer, setShowHomeCustomizer] = useState(false);
  const [showNextFeedPicker, setShowNextFeedPicker] = useState(false);
  const [quickAmount, setQuickAmount] = useState(150);
  const [quickFeedSide, setQuickFeedSide] = useState<BreastSide>('left');
  const [now, setNow] = useState(Date.now());
  const isCompactPhone = width < 390;
  const isLargePhone = width >= 430;
  const sectionPadH = isCompactPhone ? 6 : 8;
  const sectionPadV = isCompactPhone ? 4 : 6;
  const twoColBasis = isCompactPhone ? ('100%' as const) : ('48%' as const);
  const quickActionBasis = isCompactPhone ? ('48%' as const) : ('31%' as const);
  const latestEntryDay = useMemo(() => {
    const latest = entries[0];
    return latest ? startOfDay(new Date(latest.occurredAt)) : null;
  }, [entries]);
  const today = useMemo(() => startOfDay(new Date()), []);
  const todaysEntries = useMemo(() => entries.filter((entry) => isSameDay(entry.occurredAt, today)), [entries, today]);
  const activeSummaryDate = todaysEntries.length ? today : latestEntryDay;
  const activeDayEntries = useMemo(() => {
    if (!activeSummaryDate) return [] as typeof entries;
    return entries.filter((entry) => isSameDay(entry.occurredAt, activeSummaryDate));
  }, [activeSummaryDate, entries]);
  const effectiveSummary = useMemo(() => {
    const feedEntriesForDay = activeDayEntries.filter((entry) => entry.type === 'feed');
    const foodCount = activeDayEntries.filter((entry) => entry.type === 'food').length;
    const bottleMl = feedEntriesForDay
      .filter((entry) => entry.payload?.mode === 'bottle')
      .reduce((sum, entry) => sum + (entry.payload?.amountMl ?? 0), 0);
    const sleepMinutes = activeDayEntries
      .filter((entry) => entry.type === 'sleep')
      .reduce((sum, entry) => sum + (entry.payload?.durationMin ?? 0), 0);
    const diaperCount = activeDayEntries.filter((entry) => entry.type === 'diaper').length;
    return {
      feedCount: feedEntriesForDay.length,
      foodCount,
      bottleMl,
      sleepMinutes,
      diaperCount,
    };
  }, [activeDayEntries]);

  // Optimized dependencies with better memoization
  const feedEntries = useMemo(() => entries.filter((entry) => entry.type === 'feed'), [entries]);
  const lastFeed = useMemo(() => feedEntries[0] ?? null, [feedEntries]);
  const lastBreastFeed = useMemo(() => feedEntries.find((entry) => entry.payload?.mode === 'breast') ?? null, [feedEntries]);
  const lastBottleFeed = useMemo(() => feedEntries.find((entry) => entry.payload?.mode === 'bottle') ?? null, [feedEntries]);
  const lastDiaper = useMemo(() => entries.find((entry) => entry.type === 'diaper') ?? null, [entries]);
  const lastMeasurement = useMemo(() => entries.find((entry) => entry.type === 'measurement') ?? null, [entries]);

  // Cached expensive computations
  const meanInterval = useMemo(() => getMeanFeedingInterval(entries), [entries]);
  const smartAlerts = useMemo(() => buildSmartAlerts(entries, profile), [entries, profile]);
  const medicationTimeline = useMemo(() => getMedicationTimelineStatus(entries, appSettings), [entries, appSettings]);
  const careStage = useMemo(() => getCareStagePolicy(profile), [profile]);

  // Optimized next feed calculation
  const nextFeedDueIn = useMemo(() => {
    if (!meanInterval || !lastFeed) return null;
    return new Date(lastFeed.occurredAt).getTime() + meanInterval - now;
  }, [lastFeed, meanInterval, now]);

  // Optimized sick child status
  const sickChild = useMemo(() => {
    const medicineName = medicationTimeline.lastMedicine?.payload?.name;
    return getSickChildStatus(entries, medicineName);
  }, [entries, medicationTimeline.lastMedicine?.payload?.name]);

  // State-driven module system
  const moduleConfigs = useMemo((): ModuleConfig[] => {
    const configs: ModuleConfig[] = [];
    const currentTime = Date.now();

    // Next Feed Module - Critical priority when due or overdue
    if (nextFeedDueIn !== null) {
      const state: ModuleState = nextFeedDueIn <= 0 ? 'alert' : nextFeedDueIn < 30 * 60 * 1000 ? 'active' : 'pending';
      const urgency = nextFeedDueIn <= 0 ? 100 : Math.max(0, 100 - (nextFeedDueIn / (2 * 60 * 60 * 1000)) * 100);

      configs.push({
        id: 'nextFeed',
        type: 'feeding',
        state,
        priority: nextFeedDueIn <= 0 ? 'critical' : nextFeedDueIn < 30 * 60 * 1000 ? 'high' : 'normal',
        size: nextFeedDueIn <= 0 ? 'full' : 'expanded',
        lastUpdated: lastFeed ? new Date(lastFeed.occurredAt).getTime() : 0,
        urgency,
        contextRelevant: true,
      });
    }

    // Smart Signals Module - High priority for alerts
    if (smartAlerts.length > 0) {
      const hasCriticalAlert = smartAlerts.some(alert => alert.tone === 'danger');
      configs.push({
        id: 'smartSignals',
        type: 'alerts',
        state: hasCriticalAlert ? 'alert' : 'active',
        priority: hasCriticalAlert ? 'critical' : 'high',
        size: hasCriticalAlert ? 'full' : 'expanded',
        lastUpdated: Math.max(...smartAlerts.map(alert => currentTime)),
        urgency: hasCriticalAlert ? 90 : 70,
        contextRelevant: true,
      });
    }

    // Daily Status Module - Normal priority, compact size
    const totalMilkToday = effectiveSummary.bottleMl;
    configs.push({
      id: 'dailyStatus',
      type: 'status',
      state: totalMilkToday > 0 ? 'active' : 'empty',
      priority: 'normal',
      size: 'compact',
      lastUpdated: currentTime,
      urgency: 40,
      contextRelevant: true,
    });

    // Medication Module - Always visible with logging capability
    const hasActiveMeds = medicationTimeline.lastMedicine &&
      (currentTime - new Date(medicationTimeline.lastMedicine.occurredAt).getTime()) < 6 * 60 * 60 * 1000;

    configs.push({
      id: 'medication',
      type: 'medication',
      state: hasActiveMeds ? 'active' : medicationTimeline.lastMedicine ? 'completed' : 'empty',
      priority: hasActiveMeds ? 'high' : 'normal',
      size: hasActiveMeds ? 'expanded' : 'compact',
      lastUpdated: medicationTimeline.lastMedicine ? new Date(medicationTimeline.lastMedicine.occurredAt).getTime() : 0,
      urgency: hasActiveMeds ? 80 : 30,
      contextRelevant: true,
    });

    // Guidance Module - Low priority, compact
    configs.push({
      id: 'guidance',
      type: 'guidance',
      state: 'completed',
      priority: 'low',
      size: 'compact',
      lastUpdated: currentTime,
      urgency: 20,
      contextRelevant: !careStage.hiddenActionTypes.includes('feed'),
    });

    return configs.sort((a, b) => {
      // Sort by priority first, then urgency, then lastUpdated
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) return bPriority - aPriority;
      if (a.urgency !== b.urgency) return b.urgency - a.urgency;
      return b.lastUpdated - a.lastUpdated;
    });
  }, [nextFeedDueIn, lastFeed, smartAlerts, medicationTimeline, careStage, effectiveSummary.bottleMl]);

  // Intelligent quick actions based on context
  const intelligentQuickActions = useMemo((): QuickAction[] => {
    const actions: QuickAction[] = [];
    const currentTime = Date.now();

    // Feed actions - highest priority when feed is due
    if (nextFeedDueIn !== null && nextFeedDueIn <= 0) {
      actions.push({
        id: 'feed-now',
        label: 'Feed Now',
        icon: 'restaurant',
        href: '/entry/feed',
        priority: 100,
        context: ['feeding', 'urgent'],
        color: COLORS.alert,
      });
    }

    // Breast feed if recent bottle feed
    if (lastBottleFeed && (currentTime - new Date(lastBottleFeed.occurredAt).getTime()) < 2 * 60 * 60 * 1000) {
      actions.push({
        id: 'breast-feed',
        label: 'Breast',
        icon: 'water',
        href: '/entry/feed?presetMode=breast',
        priority: 80,
        context: ['feeding'],
        color: COLORS.primary,
      });
    }

    // Medication action - Always available for logging
    const hasRecentMeds = medicationTimeline.lastMedicine &&
      (currentTime - new Date(medicationTimeline.lastMedicine.occurredAt).getTime()) < 6 * 60 * 60 * 1000;

    actions.push({
      id: 'medication-log',
      label: hasRecentMeds ? 'Medicine' : 'Log Medicine',
      icon: 'medical',
      href: '/entry/medication',
      priority: hasRecentMeds ? 90 : 70,
      context: ['medication', 'health'],
      color: hasRecentMeds ? COLORS.warning : COLORS.info,
    });

    // Diaper if recent feed
    if (lastFeed && (currentTime - new Date(lastFeed.occurredAt).getTime()) > 45 * 60 * 1000) {
      actions.push({
        id: 'diaper',
        label: 'Diaper',
        icon: 'cube',
        href: '/entry/diaper',
        priority: 60,
        context: ['care'],
        color: COLORS.info,
      });
    }

    // Sleep if been awake long enough
    if (lastFeed && (currentTime - new Date(lastFeed.occurredAt).getTime()) > 2 * 60 * 60 * 1000) {
      actions.push({
        id: 'sleep',
        label: 'Sleep',
        icon: 'moon',
        href: '/entry/sleep',
        priority: 50,
        context: ['care'],
        color: COLORS.success,
      });
    }

    return actions.sort((a, b) => b.priority - a.priority).slice(0, 4); // Top 4 actions
  }, [nextFeedDueIn, lastBottleFeed, lastFeed, medicationTimeline]);

  const totalMilkToday = effectiveSummary.bottleMl;
  const milkGoalMin = 750;
  const milkGoalMax = 1050;
  const milkTargetPercent = Math.max(0, Math.min(100, (totalMilkToday / milkGoalMax) * 100));
  const milkStatus =
    totalMilkToday < milkGoalMin
      ? language === 'fr'
        ? 'En dessous de la zone'
        : 'Below target'
      : totalMilkToday > milkGoalMax
        ? language === 'fr'
          ? 'Au dessus de la zone'
          : 'Above target'
        : language === 'fr'
          ? 'Dans la zone'
          : 'In target';

  const milkProgress = useSharedValue(0);
  const nextFeedPulse = useSharedValue(1);

  useEffect(() => {
    milkProgress.value = withTiming(milkTargetPercent, { duration: 800 });
  }, [milkProgress, milkTargetPercent]);

  useEffect(() => {
    if (nextFeedDueIn && nextFeedDueIn > 0) {
      nextFeedPulse.value = 1;
      return;
    }
    nextFeedPulse.value = withRepeat(withSequence(withTiming(1.04, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1, false);
  }, [nextFeedDueIn, nextFeedPulse]);

  const milkBarStyle = useAnimatedStyle(() => ({
    width: `${milkProgress.value}%`,
  }));

  const nextBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nextFeedPulse.value }],
  }));

  // Optimized data refresh with caching
  const refreshData = useCallback(async () => {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = `home_data_${babyId}`;
      const cachedData = cacheManager.get(cacheKey) as any;

      if (cachedData && cachedData.timestamp && (Date.now() - cachedData.timestamp) < 30000) { // 30 seconds cache
        setBabies(cachedData.babies);
        setVisibility(cachedData.visibility);
        setAppSettingsState(cachedData.settings);

        if (cachedData.activeBaby) {
          setBabyId(cachedData.activeBaby.id);
          setHydration(cachedData.hydration);
        }
        return;
      }

      // Fetch fresh data
      const [nextBabies, activeBaby, nextVisibility, nextSettings] = await Promise.all([
        getBabies(),
        getActiveBaby(),
        getModuleVisibility(),
        getAppSettings(),
      ]);

      setBabies(nextBabies);
      setVisibility(nextVisibility);
      setAppSettingsState(nextSettings);

      if (!activeBaby) {
        setBabyId(null);
        setHydration(0);

        // Cache empty state
        cacheManager.set(cacheKey, {
          babies: nextBabies,
          visibility: nextVisibility,
          settings: nextSettings,
          activeBaby: null,
          hydration: 0,
          timestamp: Date.now(),
        });
        return;
      }

      setBabyId(activeBaby.id);
      const hydration = await getMomHydration(activeBaby.id);
      setHydration(hydration);

      // Cache fresh data
      cacheManager.set(cacheKey, {
        babies: nextBabies,
        visibility: nextVisibility,
        settings: nextSettings,
        activeBaby,
        hydration,
        timestamp: Date.now(),
      });

      console.log(`Data refresh took: ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [babyId]);

  useEffect(() => {
    let mounted = true;

    void refreshData();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && mounted) {
        void refreshData();
      }
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [refreshData]);

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

  const quickActions: Array<[string, string, string]> = [
    [t('home.breast', 'Breast'), 'quick-breast', 'feed'],
    [t('home.bottle', 'Bottle'), 'quick-bottle', 'feed'],
    ['Diaper', '/entry/diaper', 'diaper'],
    ['Sleep', '/entry/sleep', 'sleep'],
    [t('home.pump', 'Pump'), '/entry/pump', 'pump'],
    ['Medication', '/entry/medication', 'medication'],
    [t('home.food', 'Food'), '/entry/food', 'food'],
    ['Measurement', '/entry/measurement', 'measurement'],
    ['Milestone', '/entry/milestone', 'milestone'],
  ];
  const presetActions = [
    { label: `150 ml`, href: '/entry/feed?presetMode=bottle&presetAmount=150' },
    { label: `180 ml`, href: '/entry/feed?presetMode=bottle&presetAmount=180' },
    { label: t('home.left_breast', 'Left breast'), href: '/entry/feed?presetMode=breast&presetSide=left' },
    { label: `20 min`, href: '/entry/pump' },
  ];
  const hydrationButtons = ['+250 ml', '+500 ml'];
  const visibleActions = quickActions.filter(([, , key]) => visibility[key] && !careStage.hiddenActionTypes.includes(key));
  const showSmartSignals = appSettings.dashboardMetrics.smartSignals;
  const timelineChips = useMemo(() => {
    const source = entries.slice(0, 24);
    const chips: Array<{ key: string; label: string; count: number; type: string }> = [];
    const seen = new Map<string, number>();

    for (const entry of source) {
      const current = seen.get(entry.type) ?? 0;
      seen.set(entry.type, current + 1);
      if (current > 0) continue;
      const label = entry.type.slice(0, 3).toUpperCase();
      chips.push({ key: `${entry.id}`, label, count: 1, type: entry.type });
    }

    return chips.map((chip) => ({
      ...chip,
      count: seen.get(chip.type) ?? 1,
    }));

  }, [entries]);

  const renderedLabels = useMemo(
    () => [t('home.new', 'New'), ...visibleActions.map(([label]) => label), ...presetActions.map((item) => item.label), ...hydrationButtons],
    [visibleActions],
  );

  useEffect(() => {
    const seen = new Set<string>();
    for (const label of renderedLabels) {
      if (seen.has(label)) {
        console.warn('DUPLICATE BUTTON DETECTED:', label);
      }
      seen.add(label);
    }
  }, [renderedLabels]);

  function startQuickTimer(mode: 'breast' | 'bottle', side: BreastSide = 'left') {
    const startedAt = Date.now();
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
            ? t('home.breast_both', 'Breast feed both')
            : quickFeedSide === 'right'
              ? t('home.breast_right', 'Breast feed right')
              : t('home.breast_left', 'Breast feed left')
          : t('home.bottle_feed', 'Bottle feed'),
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

  async function updateHomeSectionOrder(nextOrder: HomeSectionKey[]) {
    const next = await updateAppSettings({
      homeSectionOrder: nextOrder,
    });
    setAppSettingsState(next);
  }

  async function moveHomeSection(key: HomeSectionKey, direction: 'up' | 'down') {
    const current = [...appSettings.homeSectionOrder];
    const index = current.indexOf(key);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;
    [current[index], current[targetIndex]] = [current[targetIndex], current[index]];
    await updateHomeSectionOrder(current);
  }

  async function hideHomeSection(key: HomeSectionKey) {
    await updateDashboardMetric(key as keyof typeof appSettings.dashboardMetrics, false);
  }

  async function restoreHomeCustomization() {
    const next = await updateAppSettings({
      dashboardMetrics: {
        ...defaultAppSettings.dashboardMetrics,
      },
      homeSectionOrder: [...defaultHomeSectionOrder],
    });
    setAppSettingsState(next);
    setShowHomeCustomizer(false);
    setShowSmartSignalsMenu(false);
  }

  const recentEntries = entries.slice(0, 6);
  const activeBabyName = babies.find((baby) => baby.id === babyId)?.name ?? profile?.babyName ?? 'Leo';
  const contextualSuggestions = sickChild.enabled
    ? [
      { label: 'Hydration', href: '/entry/feed' },
      { label: 'Diapers', href: '/entry/diaper' },
      { label: 'Temperature', href: '/entry/measurement' },
      { label: 'Stools', href: '/entry/diaper' },
      { label: 'Behavior', href: '/entry/symptom' },
    ]
    : careStage.homeSuggestions;
  const activeFeedTitle =
    quickTimerMode === 'bottle'
      ? t('home.bottle', 'Bottle')
      : quickFeedSide === 'both'
        ? t('home.breast_both', 'Breast both')
        : quickFeedSide === 'right'
          ? t('home.breast_right', 'Breast right')
          : t('home.breast_left', 'Breast left');
  const activeFeedSubtitlePrefix =
    quickTimerMode === 'bottle'
      ? t('home.bottle', 'Bottle')
      : quickFeedSide === 'both'
        ? t('home.both', 'Both')
        : quickFeedSide === 'right'
          ? t('home.right', 'Right')
          : t('home.left', 'Left');

  async function switchBaby(nextBaby: { id: string }) {
    await setActiveBabyId(nextBaby.id);
    setBabyId(nextBaby.id);
    setHydration(await getMomHydration(nextBaby.id));
    setShowBabySwitcher(false);
  }

  function openNextFeedPicker() {
    setShowNextFeedPicker(true);
  }

  function closeNextFeedPicker() {
    setShowNextFeedPicker(false);
  }

  const orderedSections = appSettings.homeSectionOrder.filter((key): key is HomeSectionKey =>
    (defaultHomeSectionOrder as readonly string[]).includes(key),
  );

  const sectionEyebrowStyle = () => ({
    color: MUTED,
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  });

  const sectionTitleStyle = () => ({
    color: TEXT,
    fontSize: 18,
    fontWeight: '800' as const,
    marginTop: 2,
  });

  return (
    <Page contentStyle={[styles.pageContent, { maxWidth: isLargePhone ? 760 : 680 }]}>
      <View
        style={{
          backgroundColor: 'transparent',
          borderRadius: 16,
          paddingTop: isCompactPhone ? 1 : 2,
          paddingHorizontal: isCompactPhone ? 1 : isLargePhone ? 4 : 2,
          paddingBottom: Math.max(40, Math.round(height * 0.05)),
        }}
      >
        <Animated2.View entering={FadeIn.duration(300)} style={{ marginBottom: 4 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: isCompactPhone ? 'wrap' : 'nowrap',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={sectionEyebrowStyle()}>{t('home.home', 'Home')}</Text>
              <Pressable
                onPress={() => setShowBabySwitcher(true)}
                style={({ pressed }) => ({
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: BORDER,
                  backgroundColor: pressed ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <Text style={[sectionTitleStyle(), { fontSize: 16 }]}>{activeBabyName}</Text>
                <Text style={{ color: MUTED, fontSize: 11, fontWeight: '700' }}>▼</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: isCompactPhone ? 'auto' : 0 }}>
              <HeaderAction label={t('home.new', 'New')} onPress={() => router.push('/entry/feed')} />
              <Pressable
                onPress={() => setShowHomeCustomizer(true)}
                style={({ pressed }) => ({
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: pressed ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                  borderWidth: 1,
                  borderColor: pressed ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                })}
              >
                <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700', lineHeight: 16 }}>⋮</Text>
              </Pressable>
            </View>
          </View>
        </Animated2.View>

        {orderedSections.map((sectionKey, index) => {
          const canMoveUp = index > 0;
          const canMoveDown = index < orderedSections.length - 1;
          const delay = 60 + index * 40;
          const hidden = !appSettings.dashboardMetrics[sectionKey as keyof typeof appSettings.dashboardMetrics];

          if (hidden) return null;

          if (sectionKey === 'nextFeed') {
            return (
              <HomeSectionCard
                key={sectionKey}
                sectionKey={sectionKey}
                isMobile={Platform.OS !== 'web'}
                canMoveUp={canMoveUp}
                canMoveDown={canMoveDown}
                onMoveUp={() => void moveHomeSection(sectionKey, 'up')}
                onMoveDown={() => void moveHomeSection(sectionKey, 'down')}
                onHide={() => void hideHomeSection(sectionKey)}
              >
                <Animated2.View entering={FadeIn.duration(300).delay(delay)}>
                  <NextFeedingCard onPress={openNextFeedPicker} />
                </Animated2.View>
              </HomeSectionCard>
            );
          }

          if (sectionKey === 'smartSignals') {
            if (!(showSmartSignals && smartAlerts.length)) return null;
            return (
              <HomeSectionCard
                key={sectionKey}
                sectionKey={sectionKey}
                isMobile={Platform.OS !== 'web'}
                canMoveUp={canMoveUp}
                canMoveDown={canMoveDown}
                onMoveUp={() => void moveHomeSection(sectionKey, 'up')}
                onMoveDown={() => void moveHomeSection(sectionKey, 'down')}
                onHide={() => void hideHomeSection(sectionKey)}
              >
                <Animated2.View entering={FadeIn.duration(300).delay(delay)}>
                  <View style={{ paddingHorizontal: sectionPadH, paddingVertical: sectionPadV, borderRadius: 14, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={sectionEyebrowStyle()}>{t('home.reminders', 'Reminders')}</Text>
                        <Text style={sectionTitleStyle()}>{t('home.smart_signals', 'Priority alerts')}</Text>
                      </View>
                      <Pressable
                        onPress={() => setShowSmartSignalsMenu(true)}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: BORDER,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(255,255,255,0.04)',
                        }}
                      >
                        <Ionicons name="ellipsis-horizontal" size={16} color={TEXT} />
                      </Pressable>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {smartAlerts.map((alert) => (
                        <View key={alert.id} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: `${alert.tone === 'danger' ? COLORS.alert : alert.tone === 'warning' ? COLORS.warning : COLORS.info}22`, borderWidth: 1, borderColor: alert.tone === 'danger' ? COLORS.alert : alert.tone === 'warning' ? COLORS.warning : COLORS.info, alignItems: 'center' }}>
                          <Text style={{ color: alert.tone === 'danger' ? COLORS.alert : alert.tone === 'warning' ? COLORS.warning : COLORS.info, fontSize: 12, fontWeight: '700' }}>{alert.title}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </Animated2.View>
              </HomeSectionCard>
            );
          }

          if (sectionKey === 'dailyStatus') {
            return (
              <HomeSectionCard key={sectionKey} sectionKey={sectionKey} isMobile={Platform.OS !== 'web'} canMoveUp={canMoveUp} canMoveDown={canMoveDown} onMoveUp={() => void moveHomeSection(sectionKey, 'up')} onMoveDown={() => void moveHomeSection(sectionKey, 'down')} onHide={() => void hideHomeSection(sectionKey)}>
                <Animated2.View entering={FadeIn.duration(300).delay(delay)}>
                  <View style={{ paddingHorizontal: sectionPadH, paddingVertical: sectionPadV, borderRadius: 14, backgroundColor: '#172018', borderWidth: 1, borderColor: BORDER, gap: 4 }}>
                    <View style={{ flexDirection: 'row', gap: 4, flexWrap: isCompactPhone ? 'wrap' : 'nowrap' }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={sectionEyebrowStyle()}>{t('home.milk', 'Milk')}</Text>
                        <Text style={{ color: TEXT, fontSize: 24, fontWeight: '700' }}>{totalMilkToday} ml</Text>
                        <Text style={{ color: MUTED, fontSize: 10 }}>{milkStatus}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 2, alignItems: 'flex-end', paddingRight: 80 }}>
                        <Text style={{ color: GREEN, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' }}>{t('home.next_feed_label', 'Next feed')}</Text>
                        <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700', textAlign: 'right' }}>{formatCountdown(nextFeedDueIn, language)}</Text>
                        <Animated2.View style={[nextBadgeStyle, { marginTop: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: nextFeedDueIn && nextFeedDueIn > 0 ? `${GREEN}18` : `${GOLD}18` }]}>
                          <Text style={{ color: nextFeedDueIn && nextFeedDueIn > 0 ? GREEN : GOLD, fontSize: 10, fontWeight: '700' }}>
                            {lastFeed ? formatRelative(lastFeed.occurredAt, locale) : '--'}
                          </Text>
                        </Animated2.View>
                      </View>
                    </View>
                    <View style={{ height: 5, borderRadius: 999, backgroundColor: BORDER, overflow: 'hidden' }}>
                      <Animated2.View style={[{ height: '100%', backgroundColor: GREEN, borderRadius: 999 }, milkBarStyle]} />
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                      {[
                        { label: t('home.feeds', 'Feeds'), value: String(effectiveSummary.feedCount), icon: 'water-outline' as const },
                        { label: t('home.bottle', 'Bottle'), value: `${effectiveSummary.bottleMl} ml`, icon: 'water-outline' as const },
                        { label: t('insights.sleep', 'Sleep'), value: `${effectiveSummary.sleepMinutes}m`, icon: 'moon-outline' as const },
                        { label: t('home.diapers', 'Diapers'), value: String(effectiveSummary.diaperCount), icon: 'cube-outline' as const },
                        { label: t('home.food', 'Food'), value: String(effectiveSummary.foodCount), icon: 'restaurant-outline' as const },
                      ].map((item, statIndex) => (
                        <StatCell key={item.label} label={item.label} value={item.value} icon={item.icon} index={statIndex} highlight={statIndex === 1} />
                      ))}
                    </View>
                  </View>
                </Animated2.View>
              </HomeSectionCard>
            );
          }

          if (sectionKey === 'guidance') {
            return (
              <HomeSectionCard key={sectionKey} sectionKey={sectionKey} isMobile={Platform.OS !== 'web'} canMoveUp={canMoveUp} canMoveDown={canMoveDown} onMoveUp={() => void moveHomeSection(sectionKey, 'up')} onMoveDown={() => void moveHomeSection(sectionKey, 'down')} onHide={() => void hideHomeSection(sectionKey)}>
                <Animated2.View entering={FadeIn.duration(300).delay(delay)}>
                  <View style={{ paddingHorizontal: sectionPadH, paddingVertical: sectionPadV, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 2 }}>
                    <Text style={sectionEyebrowStyle()}>Belgian guidance</Text>
                    <Text style={[sectionTitleStyle(), { fontSize: 16, paddingRight: 96 }]}>{careStage.ageLabel}</Text>
                    <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700' }}>{careStage.feedingFocus}</Text>
                    <Text style={{ color: MUTED, fontSize: 10, lineHeight: 14 }}>{careStage.waterGuidance}</Text>
                    <Text style={{ color: MUTED, fontSize: 10, lineHeight: 14 }}>{careStage.foodGuidance}</Text>
                  </View>
                </Animated2.View>
              </HomeSectionCard>
            );
          }

          if (sectionKey === 'lastFeeds') {
            return (
              <HomeSectionCard key={sectionKey} sectionKey={sectionKey} isMobile={Platform.OS !== 'web'} canMoveUp={canMoveUp} canMoveDown={canMoveDown} onMoveUp={() => void moveHomeSection(sectionKey, 'up')} onMoveDown={() => void moveHomeSection(sectionKey, 'down')} onHide={() => void hideHomeSection(sectionKey)}>
                <Animated2.View entering={FadeIn.duration(300).delay(delay)}>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: isCompactPhone ? 'wrap' : 'nowrap' }}>
                    {[
                      { label: t('home.last_breast', 'Last breast'), value: formatClock(lastBreastFeed?.occurredAt || '', locale), detail: formatRelative(lastBreastFeed?.occurredAt || '', locale) },
                      { label: t('home.last_bottle', 'Last bottle'), value: formatClock(lastBottleFeed?.occurredAt || '', locale), detail: formatRelative(lastBottleFeed?.occurredAt || '', locale) },
                    ].map((item) => (
                      <View key={item.label} style={{ flexBasis: twoColBasis, flexGrow: 1, minWidth: isCompactPhone ? 120 : 150, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 4 }}>
                        <Text style={{ color: MUTED, fontSize: 10, fontWeight: '600', letterSpacing: 1.2 }}>{item.label.toUpperCase()}</Text>
                        <Text style={{ color: TEXT, fontSize: 20, fontWeight: '700' }}>{item.value}</Text>
                        <Text style={{ color: MUTED, fontSize: 11 }}>{item.detail}</Text>
                      </View>
                    ))}
                  </View>
                </Animated2.View>
              </HomeSectionCard>
            );
          }

          if (sectionKey === 'medication') {
            return (
              <HomeSectionCard key={sectionKey} sectionKey={sectionKey} isMobile={Platform.OS !== 'web'} canMoveUp={canMoveUp} canMoveDown={canMoveDown} onMoveUp={() => void moveHomeSection(sectionKey, 'up')} onMoveDown={() => void moveHomeSection(sectionKey, 'down')} onHide={() => void hideHomeSection(sectionKey)}>
                <Animated2.View entering={FadeIn.duration(300).delay(delay)}>
                  <View style={{ paddingHorizontal: sectionPadH, paddingVertical: sectionPadV, borderRadius: 12, backgroundColor: getStateBorderColor(medicationTimeline.lastMedicine ? 'completed' : 'empty') === COLORS.success ? `${COLORS.success}15` : CARD, borderWidth: 1.5, borderColor: getStateBorderColor(medicationTimeline.lastMedicine ? 'completed' : 'empty'), gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: COLORS.warning, fontSize: 9, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase' }}>Medication</Text>
                        <Text style={{ color: TEXT, fontSize: 15, fontWeight: '800', marginTop: 1 }}>
                          {medicationTimeline.lastMedicine?.payload?.name ?? 'No medicine logged'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: medicationTimeline.lastMedicine ? COLORS.success : COLORS.empty }} />
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ color: MUTED, fontSize: 11 }}>
                          {medicationTimeline.lastMedicine
                            ? `Last given ${formatClock(medicationTimeline.lastMedicine.occurredAt, locale)}`
                            : 'Informational support only'}
                        </Text>
                        {!medicationTimeline.lastMedicine && (
                          <Text style={{ color: MUTED, fontSize: 10, fontStyle: 'italic' }}>Tap Log to add medication</Text>
                        )}
                      </View>
                      <Pressable
                        onPress={() => router.push('/entry/medication')}
                        style={({ pressed }) => ({
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 999,
                          borderWidth: 1.5,
                          borderColor: COLORS.warning,
                          backgroundColor: pressed ? `${COLORS.warning}22` : `${COLORS.warning}15`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: pressed ? '0px 0px 4px rgba(255, 165, 0, 0.3)' : '0px 0px 4px rgba(255, 165, 0, 0.2)',
                          elevation: 2,
                        })}
                      >
                        <Text style={{ color: COLORS.warning, fontSize: 12, fontWeight: '700' }}>Log Medicine</Text>
                      </Pressable>
                    </View>

                    {medicationTimeline.lastMedicine && (
                      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                        <View style={{ flexBasis: twoColBasis, flexGrow: 1, minWidth: isCompactPhone ? 120 : 150, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: `${COLORS.success}15`, borderWidth: 1, borderColor: COLORS.success, gap: 4 }}>
                          <Text style={{ color: COLORS.success, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>Next same medicine</Text>
                          <Text style={{ color: COLORS.success, fontSize: 18, fontWeight: '800' }}>{formatAvailability(medicationTimeline.nextAllowedAt, locale, language)}</Text>
                          <Text style={{ color: MUTED, fontSize: 11 }}>{medicationTimeline.nextAllowedLabel ?? 'Check Belgian guidance, label, or pharmacist instructions'}</Text>
                        </View>
                        {appSettings.medicationAlternatingPlan.enabled ? (
                          <View style={{ flexBasis: twoColBasis, flexGrow: 1, minWidth: isCompactPhone ? 120 : 150, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: `${COLORS.info}15`, borderWidth: 1, borderColor: COLORS.info, gap: 4 }}>
                            <Text style={{ color: COLORS.info, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>Other medicine</Text>
                            <Text style={{ color: medicationTimeline.otherMedicineAvailable ? COLORS.info : TEXT, fontSize: 18, fontWeight: '800' }}>
                              {medicationTimeline.otherMedicineAvailable ? 'Available' : 'Not yet'}
                            </Text>
                            <Text style={{ color: MUTED, fontSize: 11 }}>
                              {medicationTimeline.otherMedicineLabel ?? 'Manual alternating plan only'}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    )}

                    {!medicationTimeline.lastMedicine && (
                      <View style={{ marginTop: 8, padding: 12, borderRadius: 10, backgroundColor: `${COLORS.info}10`, borderWidth: 1, borderColor: `${COLORS.info}30`, alignItems: 'center' }}>
                        <Text style={{ color: COLORS.info, fontSize: 11, fontWeight: '600', textAlign: 'center', marginBottom: 4 }}>Informational only</Text>
                        <Text style={{ color: MUTED, fontSize: 10, textAlign: 'center', lineHeight: 14 }}>Follow Belgian guidance and the product label. Dose must follow weight-based or label instructions.</Text>
                      </View>
                    )}
                  </View>
                </Animated2.View>
              </HomeSectionCard>
            );
          }

          if (sectionKey === 'sickChild') {
            if (!sickChild.enabled) return null;
            return (
              <HomeSectionCard key={sectionKey} sectionKey={sectionKey} isMobile={Platform.OS !== 'web'} canMoveUp={canMoveUp} canMoveDown={canMoveDown} onMoveUp={() => void moveHomeSection(sectionKey, 'up')} onMoveDown={() => void moveHomeSection(sectionKey, 'down')} onHide={() => void hideHomeSection(sectionKey)}>
                <Animated2.View entering={FadeIn.duration(300).delay(delay)}>
                  <View style={{ paddingHorizontal: sectionPadH, paddingVertical: sectionPadV, borderRadius: 12, backgroundColor: '#211818', borderWidth: 1, borderColor: BORDER, gap: 10 }}>
                    <Text style={sectionEyebrowStyle()}>Sick child mode</Text>
                    <Text style={sectionTitleStyle()}>Compact care checklist</Text>
                    <Text style={{ color: MUTED, fontSize: 11 }}>
                      {sickChild.reasons.join(' · ')}
                    </Text>
                    <View style={{ gap: 8 }}>
                      {sickChild.checklist.map((item) => (
                        <PressScale key={item.key} onPress={() => router.push(item.href as any)} pressedScale={0.97}>
                          <View style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: item.done ? `${GREEN}22` : `${GOLD}22`, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ color: item.done ? GREEN : GOLD, fontSize: 11, fontWeight: '900' }}>{item.done ? 'OK' : '!'}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: TEXT, fontSize: 13, fontWeight: '700' }}>{item.label}</Text>
                              <Text style={{ color: MUTED, fontSize: 11 }}>{item.detail}</Text>
                            </View>
                          </View>
                        </PressScale>
                      ))}
                    </View>
                    <Text style={{ color: MUTED, fontSize: 11, lineHeight: 16 }}>
                      Tracking and safety support only. This app does not prescribe treatment.
                    </Text>
                  </View>
                </Animated2.View>
              </HomeSectionCard>
            );
          }

          if (sectionKey === 'timeline') {
            return (
              <HomeSectionCard key={sectionKey} sectionKey={sectionKey} isMobile={Platform.OS !== 'web'} canMoveUp={canMoveUp} canMoveDown={canMoveDown} onMoveUp={() => void moveHomeSection(sectionKey, 'up')} onMoveDown={() => void moveHomeSection(sectionKey, 'down')} onHide={() => void hideHomeSection(sectionKey)}>
                <Animated2.View entering={FadeIn.duration(300).delay(delay)}>
                  <View style={{ paddingHorizontal: sectionPadH, paddingVertical: sectionPadV, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 2 }}>
                    <Text style={sectionEyebrowStyle()}>{t('home.timeline', 'Timeline')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2, marginBottom: 2 }}>
                      {timelineChips.map((chip) => (
                        <PressScale
                          key={chip.key}
                          onPress={() => {
                            const entry = [...entries].find((candidate) => candidate.type === chip.type);
                            if (!entry) return;
                            router.push({ pathname: '/entry/[type]', params: { type: entry.type, id: entry.id } });
                          }}
                          pressedScale={0.96}
                        >
                          <View style={{ height: 32, minWidth: 44, paddingHorizontal: 10, borderRadius: 18, backgroundColor: BORDER, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: TEXT, fontSize: 10, fontWeight: '600' }}>
                              {chip.label}
                              {chip.count > 1 ? ` ${chip.count}` : ''}
                            </Text>
                          </View>
                        </PressScale>
                      ))}
                    </View>
                  </View>
                </Animated2.View>
              </HomeSectionCard>
            );
          }

          if (sectionKey === 'quickActions') {
            return (
              <HomeSectionCard key={sectionKey} sectionKey={sectionKey} isMobile={Platform.OS !== 'web'} canMoveUp={canMoveUp} canMoveDown={canMoveDown} onMoveUp={() => void moveHomeSection(sectionKey, 'up')} onMoveDown={() => void moveHomeSection(sectionKey, 'down')} onHide={() => void hideHomeSection(sectionKey)}>
                <Animated2.View entering={FadeIn.duration(300).delay(delay)}>
                  <View style={{ paddingHorizontal: sectionPadH, paddingVertical: sectionPadV, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 4 }}>
                    <Text style={sectionEyebrowStyle()}>{t('home.rapid_actions', 'Quick actions')}</Text>
                    <Text style={sectionTitleStyle()}>{t('home.direct_actions', 'Direct actions')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                      {contextualSuggestions.map((item) => (
                        <PressScale key={`${item.label}-${item.href}`} onPress={() => router.push(item.href as any)} pressedScale={0.96} style={{ flexBasis: twoColBasis, minWidth: isCompactPhone ? 115 : 125, flexGrow: 1 }}>
                          <View style={{
                            minHeight: 36,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 16,
                            backgroundColor: 'rgba(255, 255, 255, 0.04)',
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.12)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            flexDirection: 'row'
                          }}>
                            <Text style={{ color: GOLD, fontSize: 11, fontWeight: '700', textAlign: 'center' }}>{item.label}</Text>
                          </View>
                        </PressScale>
                      ))}
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {visibleActions.map(([label, href]) => (
                        <PressScale
                          key={label}
                          onPress={() => {
                            if (href === 'quick-breast') {
                              openNextFeedPicker();
                              return;
                            }
                            if (href === 'quick-bottle') {
                              startQuickTimer('bottle');
                              return;
                            }
                            router.push(href as any);
                          }}
                          pressedScale={0.92}
                          style={{ flexBasis: quickActionBasis, minWidth: isCompactPhone ? 120 : 96, flexGrow: 1 }}
                        >
                          <View style={{ height: 38, paddingHorizontal: 12, borderRadius: 18, backgroundColor: BORDER, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700', textAlign: 'center' }} numberOfLines={1}>
                              {label}
                            </Text>
                          </View>
                        </PressScale>
                      ))}
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                      {[
                        { label: '+150 ml', href: '/entry/feed?presetMode=bottle&presetAmount=150' },
                        { label: '+ diaper', href: '/entry/diaper' },
                        { label: '+ sleep', href: '/entry/sleep' },
                        { label: '+ food', href: '/entry/food' },
                      ].map((item) => (
                        <PressScale key={item.label} onPress={() => router.push(item.href as any)} pressedScale={0.95} style={{ flexBasis: twoColBasis, minWidth: isCompactPhone ? 120 : 130, flexGrow: 1 }}>
                          <View style={{ height: 38, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#1F2A1F', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{item.label}</Text>
                          </View>
                        </PressScale>
                      ))}
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                      {presetActions.map((preset) => (
                        <PressScale key={preset.label} onPress={() => router.push(preset.href as any)} pressedScale={0.94} style={{ flexBasis: twoColBasis, minWidth: isCompactPhone ? 120 : 132, flexGrow: 1 }}>
                          <View style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#1F2A1F', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{preset.label}</Text>
                          </View>
                        </PressScale>
                      ))}
                    </View>
                  </View>
                </Animated2.View>
              </HomeSectionCard>
            );
          }

          if (sectionKey === 'hydration') {
            return (
              <HomeSectionCard key={sectionKey} sectionKey={sectionKey} isMobile={Platform.OS !== 'web'} canMoveUp={canMoveUp} canMoveDown={canMoveDown} onMoveUp={() => void moveHomeSection(sectionKey, 'up')} onMoveDown={() => void moveHomeSection(sectionKey, 'down')} onHide={() => void hideHomeSection(sectionKey)}>
                <Animated2.View entering={FadeIn.duration(300).delay(delay)}>
                  <View style={{ paddingHorizontal: sectionPadH, paddingVertical: sectionPadV, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 8 }}>
                    <Text style={sectionEyebrowStyle()}>{t('home.hydration', 'Hydration')}</Text>
                    <Text style={sectionTitleStyle()}>{t('home.hydration', 'Hydration')}</Text>
                    <Text style={{ color: MUTED, fontSize: 11 }}>{hydration} ml / {appSettings.hydrationGoalMl} ml</Text>
                    <View style={{ height: 6, borderRadius: 999, backgroundColor: BORDER, overflow: 'hidden' }}>
                      <View style={{ width: `${Math.max(0, Math.min(100, (hydration / appSettings.hydrationGoalMl) * 100))}%`, height: '100%', backgroundColor: BLUE }} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[
                        { label: '+250ml', amount: 250 },
                        { label: '+500ml', amount: 500 },
                      ].map((item) => (
                        <PressScale
                          key={item.label}
                          onPress={async () => {
                            if (!babyId) return;
                            const next = hydration + item.amount;
                            setHydration(next);
                            await setMomHydration(babyId, next);
                          }}
                          pressedScale={0.94}
                        >
                          <View style={{ height: 36, paddingHorizontal: 14, borderRadius: 20, backgroundColor: BORDER, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: TEXT, fontSize: 13, fontWeight: '700' }}>{item.label}</Text>
                          </View>
                        </PressScale>
                      ))}
                    </View>
                  </View>
                </Animated2.View>
              </HomeSectionCard>
            );
          }

          if (sectionKey === 'recentActivity') {
            return (
              <HomeSectionCard key={sectionKey} sectionKey={sectionKey} isMobile={Platform.OS !== 'web'} canMoveUp={canMoveUp} canMoveDown={canMoveDown} onMoveUp={() => void moveHomeSection(sectionKey, 'up')} onMoveDown={() => void moveHomeSection(sectionKey, 'down')} onHide={() => void hideHomeSection(sectionKey)}>
                <Animated2.View entering={FadeIn.duration(300).delay(delay)}>
                  <View style={{ paddingHorizontal: sectionPadH, paddingVertical: sectionPadV, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER }}>
                    <Text style={sectionEyebrowStyle()}>{t('home.recent', 'Recent')}</Text>
                    <Text style={sectionTitleStyle()}>{t('home.recent_activity', 'Recent activity')}</Text>
                    <View style={{ marginTop: 8 }}>
                      {recentEntries.length ? (
                        recentEntries.map((entry) => (
                          <ActivityRow
                            key={entry.id}
                            color={
                              entry.type === 'feed'
                                ? GOLD
                                : entry.type === 'sleep'
                                  ? BLUE
                                  : entry.type === 'diaper'
                                    ? RED
                                    : entry.type === 'medication'
                                      ? GREEN
                                      : '#A371F7'
                            }
                            title={entry.title}
                            detail={
                              entry.type === 'feed'
                                ? entry.payload?.mode === 'breast'
                                  ? entry.payload?.side === 'both'
                                    ? 'Both breasts'
                                    : entry.payload?.side === 'right'
                                      ? 'Right breast'
                                      : 'Left breast'
                                  : `${entry.payload?.amountMl || 0}ml`
                                : entry.type === 'sleep'
                                  ? `${entry.payload?.durationMin || 0}m`
                                  : entry.type === 'diaper'
                                    ? entry.payload?.poop
                                      ? 'Poop'
                                      : entry.payload?.pee
                                        ? 'Wet'
                                        : entry.payload?.vomit
                                          ? 'Vomit'
                                          : 'Diaper'
                                    : ''
                            }
                            time={formatClock(entry.occurredAt, locale)}
                            onPress={() => router.push({ pathname: '/entry/[type]', params: { type: entry.type, id: entry.id } })}
                          />
                        ))
                      ) : (
                        <View style={{ paddingVertical: 10 }}>
                          <Text style={{ color: MUTED, fontSize: 11 }}>{language === 'fr' ? 'Aucune activite recente.' : 'No recent activity.'}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Animated2.View>
              </HomeSectionCard>
            );
          }

          return null;
        })}
      </View>

      <Modal visible={showSmartSignalsMenu} transparent animationType="fade" onRequestClose={() => setShowSmartSignalsMenu(false)}>
        <View style={styles.menuOverlay}>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>{t('home.smart_signals_settings', 'Smart Signals Settings')}</Text>
            <View style={{ gap: 12 }}>
              {[
                { key: 'smartSignals', label: 'Priority alerts', description: 'Show critical baby needs and reminders' },
              ].map((item) => (
                <PressScale key={item.key} onPress={() => updateDashboardMetric(item.key as keyof typeof appSettings.dashboardMetrics, !appSettings.dashboardMetrics[item.key as keyof typeof appSettings.dashboardMetrics])} pressedScale={0.98}>
                  <View style={styles.menuItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.menuItemText}>{item.label}</Text>
                      <Text style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{item.description}</Text>
                    </View>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: appSettings.dashboardMetrics[item.key as keyof typeof appSettings.dashboardMetrics] ? COLORS.success : BORDER, alignItems: 'center', justifyContent: 'center' }}>
                      {appSettings.dashboardMetrics[item.key as keyof typeof appSettings.dashboardMetrics] && <Ionicons name="checkmark" size={12} color={COLORS.success} />}
                    </View>
                  </View>
                </PressScale>
              ))}
            </View>
            <PressScale onPress={restoreHomeCustomization} pressedScale={0.98}>
              <View style={[styles.menuItem, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                <Text style={[styles.menuItemText, { color: COLORS.alert }]}>{t('home.restore_defaults', 'Restore defaults')}</Text>
              </View>
            </PressScale>
          </View>
        </View>
      </Modal>

      <Modal visible={showHomeCustomizer} transparent animationType="fade" onRequestClose={() => setShowHomeCustomizer(false)}>
        <View style={styles.menuOverlay}>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>{t('home.customize_home', 'Customize Home')}</Text>
            <View style={{ gap: 12 }}>
              {[
                { key: 'nextFeed', label: 'Next feeding', description: 'Show when next feed is due' },
                { key: 'smartSignals', label: 'Smart signals', description: 'Priority alerts and reminders' },
                { key: 'dailyStatus', label: 'Daily status', description: 'Milk intake and feeding stats' },
                { key: 'guidance', label: 'Guidance', description: 'Belgian care recommendations' },
                { key: 'lastFeeds', label: 'Last feeds', description: 'Recent breast and bottle feeds' },
                { key: 'medication', label: 'Medication', description: 'Medicine tracking and schedule' },
                { key: 'sickChild', label: 'Sick child', description: 'Compact care checklist' },
                { key: 'timeline', label: 'Timeline', description: '24h activity overview' },
                { key: 'quickActions', label: 'Quick actions', description: 'Fast access to common tasks' },
                { key: 'hydration', label: 'Hydration', description: 'Mother hydration tracking' },
                { key: 'recentActivity', label: 'Recent activity', description: 'Latest entries and events' },
              ].map((item) => (
                <PressScale key={item.key} onPress={() => updateDashboardMetric(item.key as keyof typeof appSettings.dashboardMetrics, !appSettings.dashboardMetrics[item.key as keyof typeof appSettings.dashboardMetrics])} pressedScale={0.98}>
                  <View style={styles.menuItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.menuItemText}>{item.label}</Text>
                      <Text style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{item.description}</Text>
                    </View>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: appSettings.dashboardMetrics[item.key as keyof typeof appSettings.dashboardMetrics] ? COLORS.success : BORDER, alignItems: 'center', justifyContent: 'center' }}>
                      {appSettings.dashboardMetrics[item.key as keyof typeof appSettings.dashboardMetrics] && <Ionicons name="checkmark" size={12} color={COLORS.success} />}
                    </View>
                  </View>
                </PressScale>
              ))}
            </View>
            <PressScale onPress={restoreHomeCustomization} pressedScale={0.98}>
              <View style={[styles.menuItem, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                <Text style={[styles.menuItemText, { color: COLORS.alert }]}>{t('home.restore_defaults', 'Restore defaults')}</Text>
              </View>
            </PressScale>
          </View>
        </View>
      </Modal>

      <Modal visible={showBabySwitcher} transparent animationType="fade" onRequestClose={() => setShowBabySwitcher(false)}>
        <View style={styles.menuOverlay}>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>{t('home.switch_baby', 'Switch Baby')}</Text>
            <View style={{ gap: 12 }}>
              {babies.map((baby) => (
                <PressScale key={baby.id} onPress={() => switchBaby(baby)} pressedScale={0.98}>
                  <View style={[styles.menuItem, { backgroundColor: baby.id === babyId ? `${COLORS.primary}15` : 'rgba(255, 255, 255, 0.05)', borderColor: baby.id === babyId ? COLORS.primary : BORDER }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.menuItemText}>{baby.name}</Text>
                      <Text style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{new Date(baby.birthDate).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}</Text>
                    </View>
                    {baby.id === babyId && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                  </View>
                </PressScale>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showNextFeedPicker} transparent animationType="fade" onRequestClose={closeNextFeedPicker}>
        <View style={styles.menuOverlay}>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>{t('home.start_feed', 'Start Feed')}</Text>
            <View style={{ gap: 12 }}>
              <PressScale onPress={() => { startQuickTimer('breast', 'left'); closeNextFeedPicker(); }} pressedScale={0.98}>
                <View style={styles.menuItem}>
                  <Text style={styles.menuItemText}>{t('home.left_breast', 'Left breast')}</Text>
                </View>
              </PressScale>
              <PressScale onPress={() => { startQuickTimer('breast', 'right'); closeNextFeedPicker(); }} pressedScale={0.98}>
                <View style={styles.menuItem}>
                  <Text style={styles.menuItemText}>{t('home.right_breast', 'Right breast')}</Text>
                </View>
              </PressScale>
              <PressScale onPress={() => { startQuickTimer('breast', 'both'); closeNextFeedPicker(); }} pressedScale={0.98}>
                <View style={styles.menuItem}>
                  <Text style={styles.menuItemText}>{t('home.both', 'Both')}</Text>
                </View>
              </PressScale>
              <PressScale onPress={() => { startQuickTimer('bottle'); closeNextFeedPicker(); }} pressedScale={0.98}>
                <View style={styles.menuItem}>
                  <Text style={styles.menuItemText}>{t('home.bottle', 'Bottle')}</Text>
                </View>
              </PressScale>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSaveSheet} transparent animationType="slide" onRequestClose={() => setShowSaveSheet(false)}>
        <View style={styles.menuOverlay}>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>{t('home.save_feed', 'Save Feed')}</Text>
            <View style={{ gap: 12 }}>
              <View style={{ padding: 16, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700' }}>{activeFeedTitle}</Text>
                <Text style={{ color: MUTED, fontSize: 14, marginTop: 4 }}>
                  {activeFeedSubtitlePrefix} • {Math.max(1, Math.round(timerElapsedSeconds / 60))}m
                </Text>
              </View>
              {quickTimerMode === 'bottle' && (
                <QuantityPicker
                  value={quickAmount}
                  onChange={setQuickAmount}
                  label={t('home.amount', 'Amount')}
                  presets={[30, 60, 90, 120, 150, 180, 210, 240, 270, 300]}
                />
              )}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <PressScale onPress={() => setShowSaveSheet(false)} pressedScale={0.98} style={{ flex: 1 }}>
                  <View style={[styles.menuItem, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                    <Text style={[styles.menuItemText, { color: COLORS.alert, textAlign: 'center' }]}>{t('home.cancel', 'Cancel')}</Text>
                  </View>
                </PressScale>
                <PressScale onPress={saveQuickTimerEntry} pressedScale={0.98} style={{ flex: 1 }}>
                  <View style={[styles.menuItem, { backgroundColor: `${COLORS.success}15`, borderColor: COLORS.success }]}>
                    <Text style={[styles.menuItemText, { color: COLORS.success, textAlign: 'center' }]}>{t('home.save', 'Save')}</Text>
                  </View>
                </PressScale>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <FullscreenTimerModal
        visible={!!quickTimerMode}
        emoji={quickTimerMode === 'bottle' ? '🍼' : '🤱'}
        title={activeFeedTitle}
        subtitlePrefix={activeFeedSubtitlePrefix}
        startedAt={timerStartedAt || 0}
        elapsedSeconds={timerElapsedSeconds}
        animatePulse={true}
        onStop={() => {
          setQuickTimerMode(null);
          setTimerStartedAt(null);
          setTimerElapsedSeconds(0);
          setQuickAmount(150);
          setQuickFeedSide('left');
        }}
      />
    </Page>
  );
}

function HeaderAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: pressed ? '#1B2430' : CARD,
      })}
    >
      <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}
