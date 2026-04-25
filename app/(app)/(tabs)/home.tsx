import { useEffect, useMemo, useState, useCallback } from 'react';
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
import { useTheme } from '@/context/ThemeContext';
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
import { NextFeedingCard } from '@/components/NextFeedingCard';
import { BabyFlowIcon } from '@/components/BabyFlowIcon';

// Colors are now derived from ThemeContext inside components

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

const formatSleepTotal = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  if (!hours) return `${mins}m`;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
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

const getStateBorderColor = (state: ModuleState, t?: { red: string; green: string; accent: string; textMuted: string; border: string }) => {
  const c = t ?? { red: '#EF4444', green: '#10B981', accent: '#F59E0B', textMuted: '#6B7280', border: 'rgba(255,255,255,0.08)' };
  switch (state) {
    case 'alert': return c.red;
    case 'active': return c.accent;
    case 'completed': return c.green;
    case 'empty': return c.textMuted;
    default: return c.border;
  }
};

// Static (non-color) styles — color styles are applied dynamically via modalStyles inside the component
const staticStyles = StyleSheet.create({
  pageContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.34)',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 92,
  },
  menuContent: {
    borderRadius: 26,
    padding: 14,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 8,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
    letterSpacing: 0.2,
  },
  feedSheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  feedSheetCard: {
    minHeight: 86,
    borderRadius: 18,
    padding: 12,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  feedSheetIcon: {
    fontSize: 23,
    marginBottom: 7,
  },
  feedSheetLabel: {
    color: '#F7FAFF',
    fontSize: 15,
    fontWeight: '900',
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
  const { theme } = useTheme();
  const palette = [theme.blue, theme.accent, theme.green, theme.accent, theme.accent];
  const color = palette[index % palette.length];

  return (
    <PressScale
      onPress={() => {
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
        backgroundColor: highlight ? `${color}20` : `${theme.border}44`,
        borderWidth: 1,
        borderColor: highlight ? `${color}40` : theme.border,
        alignItems: 'center'
      }}>
                  {Platform.OS === 'web' && (
                    <style dangerouslySetInnerHTML={{ __html: `
                      .shadow-web-style-${index} { box-shadow: 0px 0px 8px rgba(0, 0, 0, 0.02); }
                    `}} />
                  )}

        <Text style={{ color: color, fontSize: 15, fontWeight: '700' }}>{value}</Text>
        <Text style={{ color: theme.textMuted, fontSize: 9, marginTop: 1, fontWeight: '500' }}>{label}</Text>
      </View>
    </PressScale>
  );
}

function HomeSectionCard({ children, sectionKey, isMobile, canMoveUp, canMoveDown, onMoveUp, onMoveDown, onHide }: any) {
  const { theme } = useTheme();
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
                borderColor: theme.border,
                backgroundColor: pressed ? theme.bgCardAlt : theme.bg,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: canMoveUp ? 1 : 0.35,
              })}
            >
              <Ionicons name="chevron-up" size={14} color={theme.textPrimary} />
            </Pressable>
            <Pressable
              onPress={onMoveDown}
              disabled={!canMoveDown}
              style={({ pressed }) => ({
                width: 28,
                height: 28,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: pressed ? theme.bgCardAlt : theme.bg,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: canMoveDown ? 1 : 0.35,
              })}
            >
              <Ionicons name="chevron-down" size={14} color={theme.textPrimary} />
            </Pressable>
            <Pressable
              onPress={onHide}
              style={({ pressed }) => ({
                width: 28,
                height: 28,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: pressed ? `${theme.red}22` : theme.bg,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Ionicons name="eye-off-outline" size={14} color={theme.textMuted} />
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
  const { theme } = useTheme();

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
            backgroundColor: pressed ? `${theme.border}88` : 'transparent',
          },
        ]}
      >
        <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: color, marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '600' }}>{title}</Text>
          <Text style={{ color: theme.textMuted, fontSize: 11 }}>{detail}</Text>
        </View>
        <Text style={{ color: theme.textMuted, fontSize: 11 }}>{time}</Text>
      </Pressable>
    </Animated2.View>
  );
}

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const { language, t } = useLocale();
  const locale = localeTag(language);
  const { profile } = useAuth();
  const { entries } = useAppData();
  const { theme, colors } = useTheme();

  // Reactive color constants — all come from the selected theme
  const BG = theme.bg;
  const CARD = theme.bgCard;
  const BORDER = theme.border;
  const TEXT = theme.textPrimary;
  const MUTED = theme.textMuted;
  const GREEN = theme.green;
  const GOLD = theme.accent;
  const RED = theme.red;
  const BLUE = theme.blue;
  const COLORS = {
    alert: theme.red,
    warning: theme.accent,
    success: theme.green,
    primary: theme.accent,
    info: theme.blue,
    empty: theme.textMuted,
    gold: theme.accent,
    green: theme.green,
    red: theme.red,
    blue: theme.blue,
    border: theme.border,
  };

  // Dynamic modal/menu styles using current theme
  const styles = {
    pageContent: staticStyles.pageContent,
    menuOverlay: staticStyles.menuOverlay,
    menuContent: [staticStyles.menuContent, { backgroundColor: 'rgba(7, 11, 18, 0.94)' }],
    menuTitle: [staticStyles.menuTitle, { color: TEXT }],
    menuItem: [staticStyles.menuItem, { backgroundColor: `${BORDER}66`, borderColor: BORDER }],
    menuItemText: [staticStyles.menuItemText, { color: TEXT }],
    feedSheetGrid: staticStyles.feedSheetGrid,
    feedSheetCard: staticStyles.feedSheetCard,
    feedSheetIcon: staticStyles.feedSheetIcon,
    feedSheetLabel: staticStyles.feedSheetLabel,
  };

  const [hydration, setHydration] = useState(0);
  const [babyId, setBabyId] = useState<string | null>(null);
  const [babies, setBabies] = useState<Array<{ id: string; name: string; birthDate: string }>>([]);
  const [visibility, setVisibility] = useState(defaultModuleVisibility);
  const [appSettings, setAppSettingsState] = useState(defaultAppSettings);
  const [showBabySwitcher, setShowBabySwitcher] = useState(false);
  const [showSmartSignalsMenu, setShowSmartSignalsMenu] = useState(false);
  const [showHomeCustomizer, setShowHomeCustomizer] = useState(false);
  const [showNextFeedPicker, setShowNextFeedPicker] = useState(false);
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

  function openFeedComposer(href: string) {
    closeNextFeedPicker();
    router.push(href as any);
  }

  const orderedSections = appSettings.homeSectionOrder.filter((key): key is HomeSectionKey =>
    (defaultHomeSectionOrder as readonly string[]).includes(key),
  );
  const useMobileHome = width < 768;
  const mobilePrimaryActions = [
    { label: 'Bottle', detail: '150 ml', icon: 'water-outline' as const, href: '/entry/feed?presetMode=bottle&presetAmount=150', color: BLUE },
    { label: 'Breast', detail: 'Left side', icon: 'body-outline' as const, href: '/entry/feed?presetMode=breast&presetSide=left', color: GREEN },
    { label: 'Diaper', detail: 'Quick log', icon: 'cube-outline' as const, href: '/entry/diaper', color: GOLD },
    { label: 'Sleep', detail: 'Timer', icon: 'moon-outline' as const, href: '/entry/sleep', color: theme.accent },
  ];
  const mobileUtilityActions = [
    { label: 'Medicine', icon: 'medical-outline' as const, href: '/entry/medication', color: RED },
    { label: 'Food', icon: 'restaurant-outline' as const, href: '/entry/food', color: GREEN },
    { label: 'Measure', icon: 'analytics-outline' as const, href: '/entry/measurement', color: BLUE },
  ];
  const mobileStats = [
    { label: 'Feeds', value: String(effectiveSummary.feedCount), color: BLUE },
    { label: 'Milk', value: `${effectiveSummary.bottleMl}ml`, color: GREEN },
    { label: 'Sleep', value: `${Math.floor(effectiveSummary.sleepMinutes / 60)}h`, color: theme.accent },
    { label: 'Diapers', value: String(effectiveSummary.diaperCount), color: GOLD },
  ];

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

  const nightPrimaryActions = [
    { label: 'Bottle', detail: '150 ml', icon: 'water-outline' as const, href: '/entry/feed?presetMode=bottle&presetAmount=150', color: BLUE },
    { label: 'Breast', detail: 'Quick', icon: 'body-outline' as const, href: 'quick-breast', color: GREEN },
    { label: 'Diaper', detail: 'Pipi / caca', icon: 'cube-outline' as const, href: '/entry/diaper', color: GOLD },
    { label: 'Medicine', detail: 'Dose', icon: 'medical-outline' as const, href: '/entry/medication', color: RED },
    { label: 'Food', detail: 'Meal', icon: 'restaurant-outline' as const, href: '/entry/food', color: GREEN },
    { label: 'Sleep', detail: 'Timer', icon: 'moon-outline' as const, href: '/entry/sleep', color: '#879DFF' },
    { label: 'Pump', detail: 'Milk', icon: 'timer-outline' as const, href: '/entry/pump', color: '#6BA3FF' },
    { label: 'Measure', detail: 'Temp', icon: 'analytics-outline' as const, href: '/entry/measurement', color: '#A78BFA' },
  ];
  const nextFeedText = lastFeed
    ? nextFeedDueIn && nextFeedDueIn > 0
      ? `In ${formatCountdown(nextFeedDueIn, language)}`
      : 'Possible now'
    : 'Start first feed';
  const nextFeedDetail = lastFeed ? `Last ${formatClock(lastFeed.occurredAt, locale)} · ${formatRelative(lastFeed.occurredAt, locale)}` : 'No feed yet';
  const nightStats = [
    { label: 'Feeds', value: String(effectiveSummary.feedCount), color: BLUE },
    { label: 'Milk', value: `${effectiveSummary.bottleMl}ml`, color: GREEN },
    { label: 'Sleep', value: formatSleepTotal(effectiveSummary.sleepMinutes), color: '#879DFF' },
    { label: 'Diapers', value: String(effectiveSummary.diaperCount), color: GOLD },
  ];

  return (
    <Page contentStyle={nightHomeStyles.page}>
      <View style={nightHomeStyles.shell}>
        <View style={nightHomeStyles.header}>
          <View style={nightHomeStyles.headerLeft}>
            <View style={nightHomeStyles.avatar}>
              <Text style={nightHomeStyles.avatarText}>👶</Text>
            </View>
            <View style={nightHomeStyles.headerCopy}>
              <Text style={nightHomeStyles.kicker}>BabyFlow</Text>
              <Pressable onPress={() => setShowBabySwitcher(true)} hitSlop={8} style={({ pressed }) => [nightHomeStyles.babyButton, pressed && nightHomeStyles.pressed]}>
                <Text style={nightHomeStyles.title} numberOfLines={1}>{activeBabyName}</Text>
                <Ionicons name="chevron-down" size={16} color="#93A4C8" />
              </Pressable>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/settings-theme')}
            hitSlop={8}
            style={({ pressed }) => [nightHomeStyles.iconButton, pressed && nightHomeStyles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="options-outline" size={20} color="#DCE6FF" />
          </Pressable>
        </View>

        <View style={nightHomeStyles.focusCard}>
          <View style={nightHomeStyles.focusTop}>
            <View>
              <Text style={nightHomeStyles.focusLabel}>Next feed</Text>
              <Text style={nightHomeStyles.focusValue}>{nextFeedText}</Text>
            </View>
            <View style={nightHomeStyles.focusIcon}>
              <Ionicons name="time-outline" size={22} color="#071026" />
            </View>
          </View>
          <Text style={nightHomeStyles.focusDetail}>{nextFeedDetail}</Text>
          <Pressable
            onPress={openNextFeedPicker}
            style={({ pressed }) => [nightHomeStyles.focusCta, pressed && nightHomeStyles.primaryPressed]}
          >
            <Text style={nightHomeStyles.focusCtaText}>Start Feed</Text>
          </Pressable>
        </View>

        {smartAlerts.length ? (
          <Pressable
            onPress={() => setShowSmartSignalsMenu(true)}
            style={({ pressed }) => [nightHomeStyles.alertCard, pressed && nightHomeStyles.pressed]}
          >
            <Ionicons name="alert-circle-outline" size={20} color="#F08A9A" />
            <View style={nightHomeStyles.alertCopy}>
              <Text style={nightHomeStyles.alertTitle}>{smartAlerts[0].title}</Text>
              <Text style={nightHomeStyles.alertText}>{smartAlerts.length > 1 ? `${smartAlerts.length} signals` : 'Needs attention'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#8290B8" />
          </Pressable>
        ) : null}

        <View style={nightHomeStyles.actionsGrid}>
          {nightPrimaryActions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => {
                if (action.href === 'quick-breast') {
                  openNextFeedPicker();
                  return;
                }
                router.push(action.href as any);
              }}
              style={({ pressed }) => [nightHomeStyles.quickButton, { borderColor: `${action.color}55`, backgroundColor: `${action.color}16` }, pressed && nightHomeStyles.pressed]}
            >
              <View style={[nightHomeStyles.quickIcon, { backgroundColor: action.color }]}>
                <Ionicons name={action.icon} size={22} color="#071026" />
              </View>
              <Text style={nightHomeStyles.quickLabel}>{action.label}</Text>
              <Text style={nightHomeStyles.quickDetail}>{action.detail}</Text>
            </Pressable>
          ))}
        </View>

        <View style={nightHomeStyles.statsRow}>
          {nightStats.map((item) => (
            <View key={item.label} style={nightHomeStyles.statPill}>
              <Text style={[nightHomeStyles.statValue, { color: item.color }]} numberOfLines={1}>{item.value}</Text>
              <Text style={nightHomeStyles.statLabel} numberOfLines={1}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={nightHomeStyles.recentCard}>
          <View style={nightHomeStyles.sectionHead}>
            <Text style={nightHomeStyles.sectionTitle}>Recent</Text>
            <Pressable onPress={() => router.push('/history')} hitSlop={8}>
              <Text style={nightHomeStyles.sectionLink}>All</Text>
            </Pressable>
          </View>
          {recentEntries.length ? (
            recentEntries.slice(0, 4).map((entry) => (
              <Pressable
                key={entry.id}
                onPress={() => router.push({ pathname: '/entry/[type]', params: { type: entry.type, id: entry.id } })}
                style={({ pressed }) => [nightHomeStyles.recentRow, pressed && nightHomeStyles.pressed]}
              >
                <View style={[nightHomeStyles.recentDot, { backgroundColor: entry.type === 'sleep' ? '#879DFF' : entry.type === 'feed' ? BLUE : entry.type === 'diaper' ? GOLD : RED }]} />
                <View style={nightHomeStyles.recentCopy}>
                  <Text style={nightHomeStyles.recentTitle} numberOfLines={1}>{entry.title}</Text>
                  <Text style={nightHomeStyles.recentMeta} numberOfLines={1}>
                    {entry.type === 'sleep' ? `${entry.payload?.durationMin || 0}m` : entry.type} · {formatClock(entry.occurredAt, locale)}
                  </Text>
                </View>
              </Pressable>
            ))
          ) : (
            <Text style={nightHomeStyles.emptyText}>No activity yet.</Text>
          )}
        </View>
      </View>

      <Modal visible={showBabySwitcher} transparent animationType="fade" onRequestClose={() => setShowBabySwitcher(false)}>
        <View style={styles.menuOverlay}>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Switch baby</Text>
            {babies.length ? babies.map((baby) => (
              <PressScale key={baby.id} onPress={() => void switchBaby(baby)} pressedScale={0.98}>
                <View style={styles.menuItem}>
                  <Text style={styles.menuItemText}>{baby.name}</Text>
                </View>
              </PressScale>
            )) : (
              <Text style={{ color: MUTED }}>No saved babies yet.</Text>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showSmartSignalsMenu} transparent animationType="fade" onRequestClose={() => setShowSmartSignalsMenu(false)}>
        <View style={styles.menuOverlay}>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Smart signals</Text>
            <View style={{ gap: 10 }}>
              {smartAlerts.slice(0, 5).map((alert) => (
                <View key={alert.id} style={styles.menuItem}>
                  <Text style={styles.menuItemText}>{alert.title}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showNextFeedPicker} transparent animationType="fade" onRequestClose={closeNextFeedPicker}>
        <Pressable style={styles.menuOverlay} onPress={closeNextFeedPicker}>
          <Pressable style={styles.menuContent}>
            <Text style={styles.menuTitle}>{t('home.start_feed', 'Start Feed')}</Text>
            <View style={styles.feedSheetGrid}>
              {[
                { label: 'Bottle', icon: '🍼', href: '/entry/feed?presetMode=bottle&presetAmount=150' },
                { label: 'Breastfeeding', icon: '🤱', href: '/entry/feed?presetMode=breast&presetSide=left' },
                { label: 'Diaper', icon: '🧷', href: '/entry/diaper' },
                { label: 'Sleep', icon: '😴', href: '/entry/sleep' },
              ].map((item) => (
                <PressScale key={item.label} onPress={() => openFeedComposer(item.href)} pressedScale={0.98} style={{ flexBasis: '47%', flexGrow: 1, minWidth: 0 }}>
                  <View style={styles.feedSheetCard}>
                    <Text style={styles.feedSheetIcon}>{item.icon}</Text>
                    <Text style={styles.feedSheetLabel}>{item.label}</Text>
                  </View>
                </PressScale>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Page>
  );

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
        <Animated2.View entering={FadeIn.duration(300)} style={{ marginBottom: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              paddingHorizontal: 4,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{
                color: MUTED,
                fontSize: 11,
                fontWeight: '700',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                marginBottom: 4
              }}>
                👋 Bienvenido
              </Text>
              <Pressable
                onPress={() => setShowBabySwitcher(true)}
                style={({ pressed }) => ({
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor: pressed ? `${theme.accent}20` : `${theme.border}88`,
                  borderWidth: 1,
                  borderColor: pressed ? `${theme.accent}44` : BORDER,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <Text style={{
                  color: TEXT,
                  fontSize: 18,
                  fontWeight: '800'
                }}>
                  {activeBabyName}
                </Text>
                <Text style={{
                  color: theme.accent,
                  fontSize: 12,
                  fontWeight: '700'
                }}>
                  ▼
                </Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable
                onPress={() => router.push('/entry/feed')}
                style={({ pressed }) => ({
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 20,
                  backgroundColor: pressed ? `${theme.accent}44` : `${theme.accent}22`,
                  borderWidth: 1.5,
                  borderColor: pressed ? `${theme.accent}70` : `${theme.accent}44`,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <Text style={{
                  color: theme.accent,
                  fontSize: 14,
                  fontWeight: '700'
                }}>
                  + Nuevo
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowHomeCustomizer(true)}
                style={({ pressed }) => ({
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: pressed ? `${BORDER}CC` : `${BORDER}66`,
                  borderWidth: 1,
                  borderColor: BORDER,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                })}
              >
                <Text style={{
                  color: TEXT,
                  fontSize: 16,
                  fontWeight: '700',
                  lineHeight: 16
                }}>
                  ⚙️
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated2.View>

        {useMobileHome ? (
          <View style={{ gap: 12 }}>
            <Animated2.View entering={FadeIn.duration(260)}>
              <View style={{ borderRadius: 22, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, padding: 12, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <View style={{ flex: 1,
                    ...Platform.select({
                      ios: {
                        shadowColor: '#000',
                        shadowOpacity: 0.02,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 2 },
                      },
                      android: { elevation: 1 },
                      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.02)' },
                    }),
                  }}>
                    <Text style={sectionEyebrowStyle()}>Quick log</Text>
                    <Text style={[sectionTitleStyle(), { fontSize: 20 }]}>What happened?</Text>
                  </View>
                  <Pressable
                    onPress={() => router.push('/entry/feed?presetMode=bottle&presetAmount=150')}
                    style={({ pressed }) => ({
                      minHeight: 38,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      backgroundColor: pressed ? `${BLUE}33` : `${BLUE}18`,
                      borderWidth: 1,
                      borderColor: `${BLUE}44`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    })}
                  >
                    <Text style={{ color: BLUE, fontSize: 12, fontWeight: '900' }}>Start feed</Text>
                  </Pressable>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {mobilePrimaryActions.map((item, actionIndex) => (
                    <PressScale
                      key={item.label}
                      onPress={() => router.push(item.href as any)}
                      pressedScale={0.96}
                      style={{ flexBasis: actionIndex < 2 ? '48%' : '31%', flexGrow: 1, minWidth: actionIndex < 2 ? 130 : 92 }}
                    >
                      <View style={{
                        minHeight: actionIndex < 2 ? 82 : 62,
                        borderRadius: 16,
                        backgroundColor: `${item.color}16`,
                        borderWidth: 1,
                        borderColor: `${item.color}38`,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        justifyContent: 'space-between',
                        gap: 8,
                      }}>
                        <Ionicons name={item.icon} size={actionIndex < 2 ? 24 : 20} color={item.color} />
                        <View>
                          <Text style={{ color: TEXT, fontSize: actionIndex < 2 ? 16 : 13, fontWeight: '900' }}>{item.label}</Text>
                          <Text style={{ color: MUTED, fontSize: 11, fontWeight: '700', marginTop: 2 }}>{item.detail}</Text>
                        </View>
                      </View>
                    </PressScale>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {mobileUtilityActions.map((item) => (
                    <PressScale key={item.label} onPress={() => router.push(item.href as any)} pressedScale={0.96} style={{ flex: 1 }}>
                      <View style={{ height: 42, borderRadius: 14, backgroundColor: `${BORDER}66`, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                        {Platform.OS === 'web' && (
                          <style dangerouslySetInnerHTML={{ __html: `
                            .shadow-web-utility-${item.label.replace(/\s/g, '')} { box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.02); }
                          `}} />
                        )}

                        <Ionicons name={item.icon} size={15} color={item.color} />
                        <Text style={{ color: TEXT, fontSize: 11, fontWeight: '800' }} numberOfLines={1}>{item.label}</Text>
                      </View>
                    </PressScale>
                  ))}
                </View>
              </View>
            </Animated2.View>

            <Animated2.View entering={FadeIn.duration(260).delay(40)}>
              <Pressable
                onPress={() => router.push('/entry/feed?presetMode=bottle&presetAmount=150')}
                style={({ pressed }) => ({
                  borderRadius: 18,
                  backgroundColor: pressed ? `${GREEN}18` : CARD,
                  borderWidth: 1,
                  borderColor: nextFeedDueIn && nextFeedDueIn > 0 ? BORDER : `${GREEN}55`,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  ...Platform.select({
                    ios: {
                      shadowColor: '#000',
                      shadowOpacity: 0.02,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 2 },
                    },
                    android: { elevation: 1 },
                    web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.02)' },
                  }),
                })}
              >
                <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: `${GREEN}18`, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="time-outline" size={21} color={GREEN} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={sectionEyebrowStyle()}>Next feed</Text>
                  <Text style={{ color: TEXT, fontSize: 18, fontWeight: '900', marginTop: 2 }}>
                    {lastFeed ? ((nextFeedDueIn ?? 0) > 0 ? `In ${formatCountdown(nextFeedDueIn ?? 0, language)}` : 'Possible now') : 'Start first feed'}
                  </Text>
                  <Text style={{ color: MUTED, fontSize: 12, fontWeight: '600', marginTop: 3 }}>
                    {lastFeed ? `Last at ${formatClock(lastFeed.occurredAt, locale)} - ${formatRelative(lastFeed.occurredAt, locale)} ago` : 'No feed logged yet'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={MUTED} />
              </Pressable>
            </Animated2.View>

            <Animated2.View entering={FadeIn.duration(260).delay(80)}>
              <View style={{ borderRadius: 18, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, padding: 12, gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  ...Platform.select({
                    ios: {
                      shadowColor: '#000',
                      shadowOpacity: 0.02,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 2 },
                    },
                    android: { elevation: 1 },
                    web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.02)' },
                  }),
                }}>
                  <View>
                    <Text style={sectionEyebrowStyle()}>Today</Text>
                    <Text style={sectionTitleStyle()}>Daily status</Text>
                  </View>
                  <Text style={{ color: milkStatus === 'In target' ? GREEN : GOLD, fontSize: 12, fontWeight: '900' }}>{milkStatus}</Text>
                </View>
                <View style={{ height: 7, borderRadius: 999, backgroundColor: BORDER, overflow: 'hidden' }}>
                  <View style={{ width: `${milkTargetPercent}%`, height: '100%', borderRadius: 999, backgroundColor: GREEN }} />
                </View>
                <View style={{ flexDirection: 'row', gap: 7 }}>
                  {mobileStats.map((item) => (
                    <View key={item.label} style={{ flex: 1, minHeight: 52, borderRadius: 13, backgroundColor: `${item.color}12`, borderWidth: 1, borderColor: `${item.color}28`, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                      <Text style={{ color: item.color, fontSize: 15, fontWeight: '900' }} numberOfLines={1}>{item.value}</Text>
                      <Text style={{ color: MUTED, fontSize: 9, fontWeight: '800', marginTop: 2 }} numberOfLines={1}>{item.label}</Text>
                      {Platform.OS === 'web' && (
                        <style dangerouslySetInnerHTML={{ __html: `
                          .shadow-web-stat-${item.label.replace(/\s/g, '')} { box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.02); }
                        `}} />
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </Animated2.View>

            {smartAlerts.length > 0 ? (
              <Animated2.View entering={FadeIn.duration(260).delay(120)}>
                <View style={{ borderRadius: 18, backgroundColor: `${RED}10`, borderWidth: 1, borderColor: `${RED}30`, padding: 12, gap: 8 }}>
                  <Text style={sectionEyebrowStyle()}>Needs attention</Text>
                  {smartAlerts.slice(0, 2).map((alert) => (
                    <Text key={alert.id} style={{ color: TEXT, fontSize: 13, fontWeight: '800' }}>{alert.title}</Text>
                  ))}
                </View>
              </Animated2.View>
            ) : null}

            <Animated2.View entering={FadeIn.duration(260).delay(160)}>
              <View style={{ borderRadius: 18, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, padding: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <View>
                    <Text style={sectionEyebrowStyle()}>Recent</Text>
                    <Text style={sectionTitleStyle()}>Activity</Text>
                  </View>
                  <Pressable onPress={() => router.push('/history')}>
                    <Text style={{ color: BLUE, fontSize: 12, fontWeight: '900' }}>View all</Text>
                  </Pressable>
                </View>
                {recentEntries.length ? (
                  recentEntries.slice(0, 4).map((entry) => (
                    <ActivityRow
                      key={entry.id}
                      color={entry.type === 'feed' ? BLUE : entry.type === 'sleep' ? theme.accent : entry.type === 'diaper' ? GOLD : entry.type === 'medication' ? RED : GREEN}
                      title={entry.title}
                      detail={entry.type === 'feed' ? (entry.payload?.mode === 'bottle' ? `${entry.payload?.amountMl || 0}ml bottle` : `${entry.payload?.side ?? 'breast'}`) : entry.type}
                      time={formatClock(entry.occurredAt, locale)}
                      onPress={() => router.push({ pathname: '/entry/[type]', params: { type: entry.type, id: entry.id } })}
                    />
                  ))
                ) : (
                  <Text style={{ color: MUTED, fontSize: 12, paddingVertical: 8 }}>No activity yet.</Text>
                )}
              </View>
            </Animated2.View>
          </View>
        ) : orderedSections.map((sectionKey, index) => {
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
                  <NextFeedingCard onPress={() => router.push('/entry/feed?presetMode=bottle&presetAmount=150')} />
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
                  <View style={{ paddingHorizontal: sectionPadH, paddingVertical: sectionPadV, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 10, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 }}>
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
                  <View style={{
                    paddingHorizontal: sectionPadH,
                    paddingVertical: sectionPadV,
                    borderRadius: 20,
                    backgroundColor: `${theme.green}12`,
                    borderWidth: 1.5,
                    borderColor: `${theme.green}30`,
                    gap: 16,
                    shadowColor: theme.green,
                    shadowOpacity: 0.1,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 2
                  }}>
                    {/* Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: `${theme.green}25`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 20 }}>📊</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          color: MUTED,
                          fontSize: 10,
                          fontWeight: '700',
                          letterSpacing: 1.2,
                          textTransform: 'uppercase'
                        }}>
                          Resumen del Día
                        </Text>
                        <Text style={{
                          color: TEXT,
                          fontSize: 18,
                          fontWeight: '800',
                          marginTop: 2
                        }}>
                          Todo va bien ✨
                        </Text>
                      </View>
                    </View>

                    {/* Main Stats */}
                    <View style={{ flexDirection: 'row', gap: 12, flexWrap: isCompactPhone ? 'wrap' : 'nowrap' }}>
                      <View style={{
                        flex: 1,
                        backgroundColor: `${BORDER}66`,
                        borderRadius: 16,
                        padding: 16,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: BORDER
                      }}>
                        <Text style={{ color: MUTED, fontSize: 11, fontWeight: '600', marginBottom: 4 }}>🍼 Leche Hoy</Text>
                        <Text style={{ color: TEXT, fontSize: 28, fontWeight: '900' }}>{totalMilkToday}</Text>
                        <Text style={{ color: MUTED, fontSize: 12 }}>ml</Text>
                        <Text style={{
                          color: totalMilkToday >= milkGoalMin && totalMilkToday <= milkGoalMax ? GREEN : GOLD,
                          fontSize: 10,
                          fontWeight: '700',
                          marginTop: 4,
                          backgroundColor: totalMilkToday >= milkGoalMin && totalMilkToday <= milkGoalMax ? `${GREEN}22` : `${GOLD}22`,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 8
                        }}>
                          {milkStatus}
                        </Text>
                      </View>
                      <View style={{
                        flex: 1,
                        backgroundColor: `${BORDER}66`,
                        borderRadius: 16,
                        padding: 16,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: BORDER
                      }}>
                        <Text style={{ color: MUTED, fontSize: 11, fontWeight: '600', marginBottom: 4 }}>⏰ Próxima Toma</Text>
                        <Text style={{ color: TEXT, fontSize: 24, fontWeight: '900' }}>
                          {formatCountdown(nextFeedDueIn, language)}
                        </Text>
                        <Animated2.View style={[nextBadgeStyle, {
                          marginTop: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 12,
                          backgroundColor: nextFeedDueIn && nextFeedDueIn > 0 ? `${GREEN}22` : `${GOLD}22`
                        }]}>
                          <Text style={{
                            color: nextFeedDueIn && nextFeedDueIn > 0 ? GREEN : GOLD,
                            fontSize: 10,
                            fontWeight: '700'
                          }}>
                            {lastFeed ? formatRelative(lastFeed.occurredAt, locale) : '--'}
                          </Text>
                        </Animated2.View>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: MUTED, fontSize: 11, fontWeight: '600' }}>Progreso Diario</Text>
                        <Text style={{ color: MUTED, fontSize: 11, fontWeight: '600' }}>{Math.round(milkTargetPercent)}%</Text>
                      </View>
                      <View style={{
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: BORDER,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: `${BORDER}CC`
                      }}>
                        <Animated2.View style={[{
                          height: '100%',
                          backgroundColor: GREEN,
                          borderRadius: 999,
                          shadowColor: GREEN,
                          shadowOpacity: 0.4,
                          shadowRadius: 8
                        }, milkBarStyle]} />
                      </View>
                    </View>

                    {/* Quick Stats */}
                    <View style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 8,
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: BORDER
                    }}>
                      {[
                        { label: 'Tomas', value: String(effectiveSummary.feedCount), icon: '🤱', color: theme.blue },
                        { label: 'Sueño', value: `${Math.floor(effectiveSummary.sleepMinutes / 60)}h`, icon: '😴', color: theme.accent },
                        { label: 'Pañales', value: String(effectiveSummary.diaperCount), icon: '🍼', color: GOLD },
                        { label: 'Comida', value: String(effectiveSummary.foodCount), icon: '🥣', color: theme.green },
                      ].map((item, statIndex) => (
                        <PressScale key={item.label} pressedScale={0.96} style={{ flexBasis: '48%', flexGrow: 1, minWidth: 100 }}>
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 12,
                            backgroundColor: `${item.color}15`,
                            borderWidth: 1,
                            borderColor: `${item.color}30`
                          }}>
                            <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: item.color, fontSize: 14, fontWeight: '700' }}>{item.value}</Text>
                              <Text style={{ color: MUTED, fontSize: 9, fontWeight: '600' }}>{item.label}</Text>
                            </View>
                          </View>
                        </PressScale>
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
                  <View style={{ paddingHorizontal: sectionPadH, paddingVertical: sectionPadV, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 4, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 }}>
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
                      <View key={item.label} style={{ flexBasis: twoColBasis, flexGrow: 1, minWidth: isCompactPhone ? 120 : 150, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 4, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 }}>
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
                  <View style={{ paddingHorizontal: sectionPadH, paddingVertical: sectionPadV, borderRadius: 20, backgroundColor: medicationTimeline.lastMedicine ? `${GREEN}15` : CARD, borderWidth: 1, borderColor: getStateBorderColor(medicationTimeline.lastMedicine ? 'completed' : 'empty', theme), gap: 6, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: GOLD, fontSize: 9, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase' }}>Medication</Text>
                        <Text style={{ color: TEXT, fontSize: 15, fontWeight: '800', marginTop: 1 }}>
                          {medicationTimeline.lastMedicine?.payload?.name ?? 'No medicine logged'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: medicationTimeline.lastMedicine ? GREEN : MUTED }} />
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
                        <View style={{ flexBasis: twoColBasis, flexGrow: 1, minWidth: isCompactPhone ? 120 : 150, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, backgroundColor: `${COLORS.success}15`, borderWidth: 1, borderColor: COLORS.success, gap: 4, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 }}>
                          <Text style={{ color: COLORS.success, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>Next same medicine</Text>
                          <Text style={{ color: COLORS.success, fontSize: 18, fontWeight: '800' }}>{formatAvailability(medicationTimeline.nextAllowedAt, locale, language)}</Text>
                          <Text style={{ color: MUTED, fontSize: 11 }}>{medicationTimeline.nextAllowedLabel ?? 'Check Belgian guidance, label, or pharmacist instructions'}</Text>
                        </View>
                        {appSettings.medicationAlternatingPlan.enabled ? (
                          <View style={{ flexBasis: twoColBasis, flexGrow: 1, minWidth: isCompactPhone ? 120 : 150, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, backgroundColor: `${COLORS.info}15`, borderWidth: 1, borderColor: COLORS.info, gap: 4, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 }}>
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
                  <View style={{
                    paddingHorizontal: sectionPadH,
                    paddingVertical: sectionPadV,
                    borderRadius: 20,
                    backgroundColor: `${theme.accent}10`,
                    borderWidth: 1.5,
                    borderColor: `${theme.accent}28`,
                    gap: 16,
                    shadowColor: theme.accent,
                    shadowOpacity: 0.1,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 2
                  }}>
                    {/* Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: `${theme.accent}25`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 20 }}>⚡</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          color: MUTED,
                          fontSize: 10,
                          fontWeight: '700',
                          letterSpacing: 1.2,
                          textTransform: 'uppercase'
                        }}>
                          Acciones Rápidas
                        </Text>
                        <Text style={{
                          color: TEXT,
                          fontSize: 18,
                          fontWeight: '800',
                          marginTop: 2
                        }}>
                          Registra al instante 🚀
                        </Text>
                      </View>
                    </View>

                    {/* Main Actions */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                      {[
                        { label: 'Pecho', icon: '🤱', href: 'quick-breast', color: theme.green },
                        { label: 'Biberón', icon: '🍼', href: 'quick-bottle', color: theme.blue },
                        { label: 'Pañal', icon: '📦', href: '/entry/diaper', color: GOLD },
                        { label: 'Sueño', icon: '😴', href: '/entry/sleep', color: theme.accent },
                      ].map((item) => (
                        <PressScale
                          key={item.label}
                          onPress={() => {
                            if (item.href === 'quick-breast') {
                              openNextFeedPicker();
                              return;
                            }
                            if (item.href === 'quick-bottle') {
                              router.push('/entry/feed?presetMode=bottle&presetAmount=150');
                              return;
                            }
                            router.push(item.href as any);
                          }}
                          pressedScale={0.94}
                          style={{ flexBasis: '48%', flexGrow: 1, minWidth: 140 }}
                        >
                          <View style={{
                            height: 56,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                            paddingHorizontal: 16,
                            borderRadius: 16,
                            backgroundColor: `${item.color}15`,
                            borderWidth: 1.5,
                            borderColor: `${item.color}30`,
                            shadowColor: item.color,
                            shadowOpacity: 0.2,
                            shadowRadius: 8,
                            shadowOffset: { width: 0, height: 2 },
                            elevation: 2
                          }}>
                            <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                            <Text style={{
                              color: item.color,
                              fontSize: 16,
                              fontWeight: '800',
                              flex: 1
                            }}>
                              {item.label}
                            </Text>
                          </View>
                        </PressScale>
                      ))}
                    </View>

                    {/* Quick Presets */}
                    <View style={{ gap: 8 }}>
                      <Text style={{
                        color: MUTED,
                        fontSize: 11,
                        fontWeight: '600',
                        letterSpacing: 1.2,
                        textTransform: 'uppercase'
                      }}>
                        Atajos Inteligentes
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {[
                          { label: '+150ml', icon: '🍼', href: '/entry/feed?presetMode=bottle&presetAmount=150', color: '#3B82F6' },
                          { label: '+180ml', icon: '🍼', href: '/entry/feed?presetMode=bottle&presetAmount=180', color: '#3B82F6' },
                          { label: '+Pecho Izq', icon: '🤱', href: '/entry/feed?presetMode=breast&presetSide=left', color: '#EC4899' },
                          { label: '+20min Bomba', icon: '💧', href: '/entry/pump', color: '#06B6D4' },
                        ].map((item) => (
                          <PressScale key={item.label} onPress={() => router.push(item.href as any)} pressedScale={0.94} style={{ flexBasis: '48%', flexGrow: 1, minWidth: 130 }}>
                            <View style={{
                              height: 44,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 8,
                              paddingHorizontal: 12,
                              borderRadius: 12,
                              backgroundColor: `${BORDER}88`,
                              borderWidth: 1,
                              borderColor: BORDER
                            }}>
                              <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                              <Text style={{
                                color: TEXT,
                                fontSize: 13,
                                fontWeight: '700',
                                flex: 1
                              }}>
                                {item.label}
                              </Text>
                            </View>
                          </PressScale>
                        ))}
                      </View>
                    </View>

                    {/* Contextual Suggestions */}
                    {contextualSuggestions.length > 0 && (
                      <View style={{ gap: 8 }}>
                        <Text style={{
                          color: MUTED,
                          fontSize: 11,
                          fontWeight: '600',
                          letterSpacing: 1.2,
                          textTransform: 'uppercase'
                        }}>
                          Sugerencias Contextuales
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {contextualSuggestions.slice(0, 4).map((item) => (
                            <PressScale key={`${item.label}-${item.href}`} onPress={() => router.push(item.href as any)} pressedScale={0.96} style={{ flexBasis: '48%', flexGrow: 1, minWidth: 130 }}>
                              <View style={{
                                height: 40,
                                paddingHorizontal: 12,
                                borderRadius: 12,
                                backgroundColor: `${GOLD}18`,
                                borderWidth: 1,
                                borderColor: `${GOLD}35`,
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <Text style={{
                                  color: GOLD,
                                  fontSize: 12,
                                  fontWeight: '700',
                                  textAlign: 'center'
                                }}>
                                  {item.label}
                                </Text>
                              </View>
                            </PressScale>
                          ))}
                        </View>
                      </View>
                    )}
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
                  <View style={[styles.menuItem, { backgroundColor: baby.id === babyId ? `${COLORS.primary}18` : `${BORDER}55`, borderColor: baby.id === babyId ? COLORS.primary : BORDER }]}>
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
              <PressScale onPress={() => openFeedComposer('/entry/feed?presetMode=breast&presetSide=left')} pressedScale={0.98}>
                <View style={styles.menuItem}>
                  <Text style={styles.menuItemText}>{t('home.left_breast', 'Left breast')}</Text>
                </View>
              </PressScale>
              <PressScale onPress={() => openFeedComposer('/entry/feed?presetMode=breast&presetSide=right')} pressedScale={0.98}>
                <View style={styles.menuItem}>
                  <Text style={styles.menuItemText}>{t('home.right_breast', 'Right breast')}</Text>
                </View>
              </PressScale>
              <PressScale onPress={() => openFeedComposer('/entry/feed?presetMode=breast&presetSide=both')} pressedScale={0.98}>
                <View style={styles.menuItem}>
                  <Text style={styles.menuItemText}>{t('home.both', 'Both')}</Text>
                </View>
              </PressScale>
              <PressScale onPress={() => openFeedComposer('/entry/feed?presetMode=bottle&presetAmount=150')} pressedScale={0.98}>
                <View style={styles.menuItem}>
                  <Text style={styles.menuItemText}>{t('home.bottle', 'Bottle')}</Text>
                </View>
              </PressScale>
            </View>
          </View>
        </View>
      </Modal>

    </Page>
  );
}

const nightHomeStyles = StyleSheet.create({
  page: {
    flex: 1,
    gap: 0,
    maxWidth: 680,
  },
  shell: {
    flex: 1,
    gap: 12,
    padding: 12,
    paddingBottom: 20,
    borderRadius: 22,
    backgroundColor: '#070B18',
    borderWidth: 1,
    borderColor: 'rgba(132, 160, 255, 0.18)',
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(116, 150, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(137, 171, 255, 0.44)',
  },
  avatarText: {
    fontSize: 22,
  },
  headerCopy: {
    flex: 1,
    gap: 1,
  },
  kicker: {
    color: '#93A4C8',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  babyButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  title: {
    color: '#F7FAFF',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  focusCard: {
    borderRadius: 24,
    padding: 16,
    gap: 10,
    backgroundColor: 'rgba(124, 101, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(174, 158, 255, 0.56)',
  },
  focusTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  focusLabel: {
    color: '#AAB8DF',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  focusValue: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
  },
  focusIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#879DFF',
  },
  focusDetail: {
    color: '#C1CBEA',
    fontSize: 13,
    fontWeight: '800',
  },
  focusCta: {
    minHeight: 56,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#879DFF',
  },
  focusCtaText: {
    color: '#071026',
    fontSize: 18,
    fontWeight: '900',
  },
  alertCard: {
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(240, 138, 154, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(240, 138, 154, 0.28)',
  },
  alertCopy: {
    flex: 1,
    gap: 1,
  },
  alertTitle: {
    color: '#F7FAFF',
    fontSize: 13,
    fontWeight: '900',
  },
  alertText: {
    color: '#AAB8DF',
    fontSize: 11,
    fontWeight: '800',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickButton: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 112,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'center',
    gap: 5,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quickLabel: {
    color: '#F7FAFF',
    fontSize: 17,
    fontWeight: '900',
  },
  quickDetail: {
    color: '#AAB8DF',
    fontSize: 12,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 7,
  },
  statPill: {
    flex: 1,
    minHeight: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  statLabel: {
    color: '#93A4C8',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
  },
  recentCard: {
    flex: 1,
    minHeight: 120,
    borderRadius: 20,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionTitle: {
    color: '#F7FAFF',
    fontSize: 16,
    fontWeight: '900',
  },
  sectionLink: {
    color: '#879DFF',
    fontSize: 13,
    fontWeight: '900',
  },
  recentRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 13,
    paddingHorizontal: 6,
  },
  recentDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  recentCopy: {
    flex: 1,
  },
  recentTitle: {
    color: '#F7FAFF',
    fontSize: 13,
    fontWeight: '900',
  },
  recentMeta: {
    color: '#93A4C8',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1,
  },
  emptyText: {
    color: '#93A4C8',
    fontSize: 13,
    fontWeight: '800',
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  primaryPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});

function HeaderAction({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: pressed ? `${theme.border}CC` : `${theme.border}66`,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      })}
    >
      <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '700', letterSpacing: 0.2 }}>{label}</Text>
    </Pressable>
  );
}
