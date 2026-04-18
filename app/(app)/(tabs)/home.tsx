import { useEffect, useMemo, useState } from 'react';
import { AppState, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Page } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { BreastSide } from '@/types';
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

const BG = 'rgba(13, 17, 23, 0.28)';
const CARD = 'rgba(22, 27, 34, 0.78)';
const BORDER = 'rgba(255, 255, 255, 0.08)';
const GOLD = '#C9A227';
const GREEN = '#3FB950';
const BLUE = '#58A6FF';
const RED = '#E74C3C';
const MUTED = '#8B949E';
const TEXT = '#F0F6FC';

type QuickTimerMode = 'breast' | 'bottle' | null;

const touchTargetProps = {
  hitSlop: 8,
  pressRetentionOffset: 8,
} as const;

function sectionEyebrowStyle(compact = false) {
  return { color: GOLD, fontSize: compact ? 9 : 10, letterSpacing: compact ? 1.2 : 1.5, fontWeight: '600' as const, textTransform: 'uppercase' as const };
}

function sectionTitleStyle(compact = false) {
  return { color: TEXT, fontSize: compact ? 16 : 18, fontWeight: '700' as const, marginTop: compact ? 1 : 2 };
}

function alertToneColor(tone: 'primary' | 'secondary' | 'success' | 'warning' | 'danger') {
  if (tone === 'danger') return RED;
  if (tone === 'warning') return '#F2C86F';
  if (tone === 'success') return GREEN;
  if (tone === 'secondary') return BLUE;
  return GOLD;
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

function formatCountdown(ms: number | null | undefined, language: string) {
  if (!ms || ms <= 0) return language === 'fr' ? 'Possible maintenant' : 'Possible now';
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

function PressScale({
  children,
  onPress,
  pressedScale = 0.94,
  flashColor,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  pressedScale?: number;
  flashColor?: string;
  style?: any;
}) {
  const scale = useSharedValue(1);
  const flash = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 10, stiffness: 200 }) }],
    opacity: withTiming(flash.value ? 0.92 : 1, { duration: 120 }),
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        {...touchTargetProps}
        onPress={onPress}
        onPressIn={() => {
          scale.value = pressedScale;
          if (flashColor) {
            flash.value = 1;
          }
        }}
        onPressOut={() => {
          scale.value = 1;
          flash.value = 0;
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

function HeaderAction({ label, onPress, compact = false }: { label: string; onPress: () => void; compact?: boolean }) {
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(scale.value, { damping: 12, stiffness: 220 }) },
      { rotate: `${withSpring(rotate.value, { damping: 12, stiffness: 180 })}deg` },
    ],
  }));

  return (
    <Pressable
      {...touchTargetProps}
      onPress={onPress}
      onPressIn={() => {
        scale.value = 0.95;
        rotate.value = 90;
      }}
      onPressOut={() => {
        scale.value = 1;
        rotate.value = 0;
      }}
      style={{ minHeight: compact ? 32 : 36 }}
    >
      <Animated.View
        style={[
          animatedStyle,
          {
            height: compact ? 32 : 36,
            paddingHorizontal: compact ? 12 : 14,
            borderRadius: compact ? 18 : 20,
            backgroundColor: GOLD,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: compact ? 6 : 8,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 3,
          },
        ]}
      >
        <Text style={{ color: BG, fontSize: compact ? 13 : 14, fontWeight: '700' }}>+</Text>
        <Text style={{ color: BG, fontSize: compact ? 12 : 13, fontWeight: '700' }}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function StatCell({
  label,
  value,
  index,
  compact = false,
}: {
  label: string;
  value: string;
  index: number;
  compact?: boolean;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(260).delay(index * 60)}
      style={{
        flexBasis: '48%',
        minWidth: 140,
        paddingHorizontal: compact ? 10 : 12,
        paddingVertical: compact ? 8 : 10,
        borderRadius: compact ? 10 : 12,
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: BORDER,
        gap: compact ? 4 : 6,
      }}
    >
      <Text style={{ color: MUTED, fontSize: compact ? 9 : 10, fontWeight: '600', letterSpacing: compact ? 1 : 1.2 }}>{label}</Text>
      <Text style={{ color: TEXT, fontSize: compact ? 18 : 22, fontWeight: '700' }}>{value}</Text>
    </Animated.View>
  );
}

function ActivityRow({
  color,
  title,
  detail,
  time,
  onPress,
  compact = false,
}: {
  color: string;
  title: string;
  detail: string;
  time: string;
  onPress: () => void;
  compact?: boolean;
}) {
  const scale = useSharedValue(1);
  const highlight = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 10, stiffness: 200 }) }],
    borderLeftWidth: withTiming(highlight.value ? 3 : 0, { duration: 140 }),
    borderLeftColor: GOLD,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        {...touchTargetProps}
        onPress={onPress}
        onPressIn={() => {
          scale.value = 0.97;
          highlight.value = 1;
        }}
        onPressOut={() => {
          scale.value = 1;
          highlight.value = 0;
        }}
        style={{
          minHeight: compact ? 46 : 52,
          paddingHorizontal: compact ? 10 : 12,
          paddingVertical: compact ? 8 : 10,
          borderRadius: compact ? 10 : 8,
          borderWidth: 1,
          borderColor: BORDER,
          backgroundColor: CARD,
          flexDirection: 'row',
          alignItems: 'center',
          gap: compact ? 8 : 10,
          marginBottom: compact ? 4 : 6,
        }}
      >
        <View style={{ width: compact ? 28 : 32, height: compact ? 28 : 32, borderRadius: compact ? 9 : 10, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: compact ? 8 : 10, height: compact ? 8 : 10, borderRadius: 999, backgroundColor: color }} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: TEXT, fontSize: compact ? 12 : 13, fontWeight: '700' }}>{title}</Text>
          <Text style={{ color: MUTED, fontSize: compact ? 10 : 11 }}>{detail}</Text>
        </View>
        <Text style={{ color: MUTED, fontSize: compact ? 10 : 11 }}>{time}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const { language } = useLocale();
  const isCompact = width >= 768;
  const locale = localeTag(language);
  const { profile } = useAuth();
  const { entries, summary, addEntry } = useAppData();
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
  const [showSmartSignalsMenu, setShowSmartSignalsMenu] = useState(false);
  const [showHomeCustomizer, setShowHomeCustomizer] = useState(false);
  const [showNextFeedPicker, setShowNextFeedPicker] = useState(false);
  const [quickAmount, setQuickAmount] = useState(150);
  const [quickFeedSide, setQuickFeedSide] = useState<BreastSide>('left');
  const [now, setNow] = useState(Date.now());

  const feedEntries = useMemo(() => entries.filter((entry) => entry.type === 'feed'), [entries]);
  const lastFeed = useMemo(() => feedEntries[0], [feedEntries]);
  const lastBreastFeed = useMemo(() => feedEntries.find((entry) => entry.payload?.mode === 'breast'), [feedEntries]);
  const lastBottleFeed = useMemo(() => feedEntries.find((entry) => entry.payload?.mode === 'bottle'), [feedEntries]);
  const lastDiaper = useMemo(() => entries.find((entry) => entry.type === 'diaper'), [entries]);
  const lastMeasurement = useMemo(() => entries.find((entry) => entry.type === 'measurement'), [entries]);
  const meanInterval = getMeanFeedingInterval(entries);
  const smartAlerts = useMemo(() => buildSmartAlerts(entries, profile), [entries, profile]);
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

  const quickActions: Array<[string, string, string]> = [
    ['Sein', 'quick-breast', 'feed'],
    ['Biberon', 'quick-bottle', 'feed'],
    ['Couche', '/entry/diaper', 'diaper'],
    ['Sommeil', '/entry/sleep', 'sleep'],
    ['Tire-lait', '/entry/pump', 'pump'],
    ['Medicament', '/entry/medication', 'medication'],
    ['Repas', '/entry/food', 'food'],
    ['Mesure', '/entry/measurement', 'measurement'],
    ['Etape', '/entry/milestone', 'milestone'],
  ];
  const presetActions = [
    { label: 'Biberon 150ml', href: '/entry/feed?presetMode=bottle&presetAmount=150' },
    { label: 'Biberon 180ml', href: '/entry/feed?presetMode=bottle&presetAmount=180' },
    { label: 'Sein gauche', href: '/entry/feed?presetMode=breast&presetSide=left' },
    { label: 'Tire-lait 20m', href: '/entry/pump' },
  ];
  const hydrationButtons = ['+250ml', '+500ml'];
  const visibleActions = quickActions.filter(([, , key]) => visibility[key]);
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
    () => ['Nouveau', ...visibleActions.map(([label]) => label), ...presetActions.map((item) => item.label), ...hydrationButtons],
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
    setShowSmartSignalsMenu(false);
  }

  const recentEntries = entries.slice(0, 6);
  const activeBabyName = babies.find((baby) => baby.id === babyId)?.name ?? profile?.babyName ?? 'Leo';
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

  async function switchBaby(nextBaby: { id: string }) {
    await setActiveBabyId(nextBaby.id);
    setBabyId(nextBaby.id);
    setHydration(await getMomHydration(nextBaby.id));
    setShowBabySwitcher(false);
  }

  function openNextFeedPicker() {
    setShowNextFeedPicker(true);
  }

  function beginNextFeed(mode: 'bottle' | 'breast', side: BreastSide = 'left') {
    setShowNextFeedPicker(false);
    startQuickTimer(mode, side);
  }

  return (
    <Page contentStyle={styles.pageContent}>
      <View style={{ backgroundColor: 'transparent', borderRadius: 16, paddingTop: isCompact ? 2 : 6, paddingHorizontal: 4, paddingBottom: isCompact ? 64 : 80 }}>
        <Animated.View entering={FadeIn.duration(300)} style={{ marginBottom: isCompact ? 8 : 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: isCompact ? 10 : 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={sectionEyebrowStyle(isCompact)}>{language === 'fr' ? 'ACCUEIL' : 'HOME'}</Text>
              <Pressable
                onPress={() => setShowBabySwitcher(true)}
                style={({ pressed }) => ({
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: isCompact ? 6 : 8,
                  paddingHorizontal: isCompact ? 10 : 12,
                  paddingVertical: isCompact ? 6 : 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: BORDER,
                  backgroundColor: pressed ? '#1B2430' : CARD,
                })}
              >
                <Text style={sectionTitleStyle(isCompact)}>{activeBabyName}</Text>
                <Text style={{ color: MUTED, fontSize: isCompact ? 11 : 12, fontWeight: '700' }}>v</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: isCompact ? 6 : 8 }}>
              <HeaderAction label="Nouveau" onPress={() => router.push('/entry/feed')} compact={isCompact} />
              <Pressable
                onPress={() => setShowHomeCustomizer(true)}
                style={({ pressed }) => ({
                  width: isCompact ? 32 : 36,
                  height: isCompact ? 32 : 36,
                  borderRadius: isCompact ? 16 : 18,
                  borderWidth: 1,
                  borderColor: BORDER,
                  backgroundColor: pressed ? '#1B2430' : CARD,
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <Text style={{ color: TEXT, fontSize: isCompact ? 16 : 18, fontWeight: '900', lineHeight: isCompact ? 16 : 18 }}>...</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(300).delay(60)} style={{ marginBottom: isCompact ? 8 : 10 }}>
          <NextFeedingCard onPress={openNextFeedPicker} />
        </Animated.View>

        {showSmartSignals && smartAlerts.length ? (
          <Animated.View entering={FadeIn.duration(300).delay(120)} style={{ marginBottom: isCompact ? 8 : 10 }}>
            <View style={{ paddingHorizontal: isCompact ? 10 : 12, paddingVertical: isCompact ? 8 : 10, borderRadius: isCompact ? 12 : 14, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: isCompact ? 6 : 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: isCompact ? 8 : 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={sectionEyebrowStyle(isCompact)}>{language === 'fr' ? 'RAPPELS' : 'REMINDERS'}</Text>
                  <Text style={sectionTitleStyle(isCompact)}>{language === 'fr' ? 'Signaux intelligents' : 'Smart signals'}</Text>
                </View>
                <Pressable
                  onPress={() => setShowSmartSignalsMenu(true)}
                  style={{
                    width: isCompact ? 30 : 34,
                    height: isCompact ? 30 : 34,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: BORDER,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: BG,
                  }}
                >
                  <Text style={{ color: TEXT, fontSize: isCompact ? 16 : 18, fontWeight: '800', lineHeight: isCompact ? 16 : 18 }}>...</Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: isCompact ? 6 : 8 }}>
                {smartAlerts.map((alert) => (
                  <Pressable
                    key={alert.id}
                    onPress={() => {
                      if (alert.targetType) {
                        router.push({ pathname: '/entry/[type]', params: { type: alert.targetType } });
                      }
                    }}
                    style={({ pressed }) => ({
                      flexBasis: '48%',
                      minWidth: 150,
                      paddingHorizontal: isCompact ? 9 : 10,
                      paddingVertical: isCompact ? 6 : 8,
                      borderRadius: isCompact ? 12 : 14,
                      borderWidth: 1,
                      borderColor: BORDER,
                      backgroundColor: pressed ? '#1B2430' : BG,
                      gap: isCompact ? 3 : 4,
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <Text style={{ fontSize: isCompact ? 13 : 15 }}>{alert.icon}</Text>
                        <Text style={{ color: TEXT, fontSize: isCompact ? 12 : 13, fontWeight: '800' }}>{alert.value}</Text>
                      </View>
                      <View style={{ paddingHorizontal: isCompact ? 6 : 7, paddingVertical: 3, borderRadius: 999, backgroundColor: `${alertToneColor(alert.tone)}22` }}>
                        <Text style={{ color: alertToneColor(alert.tone), fontSize: isCompact ? 8 : 9, fontWeight: '800', textTransform: 'uppercase' }}>{alert.statusLabel}</Text>
                      </View>
                    </View>
                    <Text style={{ color: MUTED, fontSize: isCompact ? 10 : 11 }} numberOfLines={1}>
                      {alert.body}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeIn.duration(300).delay(180)} style={{ marginBottom: isCompact ? 8 : 10 }}>
          <View style={{ paddingHorizontal: isCompact ? 12 : 14, paddingVertical: isCompact ? 10 : 12, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: isCompact ? 8 : 10 }}>
            <View style={{ flexDirection: 'row', gap: isCompact ? 6 : 8 }}>
              <View style={{ flex: 1, gap: isCompact ? 4 : 6 }}>
                <Text style={sectionEyebrowStyle(isCompact)}>{language === 'fr' ? 'LAIT' : 'MILK'}</Text>
                <Text style={{ color: TEXT, fontSize: isCompact ? 18 : 20, fontWeight: '700' }}>{totalMilkToday} ml</Text>
              </View>
              <View style={{ flex: 1, gap: isCompact ? 4 : 6 }}>
                <Text style={sectionEyebrowStyle(isCompact)}>{language === 'fr' ? 'PROCHAINE PRISE' : 'NEXT FEED'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: isCompact ? 5 : 6 }}>
                  <Ionicons name="time-outline" size={isCompact ? 12 : 14} color={BLUE} />
                  <Text style={{ color: TEXT, fontSize: isCompact ? 14 : 16, fontWeight: '700' }}>{formatCountdown(nextFeedDueIn, language)}</Text>
                  <Animated.View style={[nextBadgeStyle, { paddingHorizontal: isCompact ? 7 : 8, paddingVertical: isCompact ? 3 : 4, borderRadius: 999, backgroundColor: nextFeedDueIn && nextFeedDueIn > 0 ? `${BLUE}22` : `${GOLD}22` }]}>
                    <Text style={{ color: nextFeedDueIn && nextFeedDueIn > 0 ? BLUE : GOLD, fontSize: isCompact ? 10 : 11, fontWeight: '700' }}>
                      {lastFeed ? formatRelative(lastFeed.occurredAt, locale) : '--'}
                    </Text>
                  </Animated.View>
                </View>
              </View>
            </View>
            <View style={{ height: 6, borderRadius: 999, backgroundColor: BORDER, overflow: 'hidden' }}>
              <Animated.View style={[{ height: '100%', backgroundColor: GOLD, borderRadius: 999 }, milkBarStyle]} />
            </View>
            <Text style={{ color: MUTED, fontSize: isCompact ? 10 : 11 }}>{milkStatus}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(300).delay(220)} style={{ marginBottom: isCompact ? 8 : 10 }}>
          <View style={{ flexDirection: 'row', gap: isCompact ? 6 : 8 }}>
            {[
              { label: 'Dernier sein', value: formatClock(lastBreastFeed?.occurredAt, locale), detail: formatRelative(lastBreastFeed?.occurredAt, locale) },
              { label: 'Dernier biberon', value: formatClock(lastBottleFeed?.occurredAt, locale), detail: formatRelative(lastBottleFeed?.occurredAt, locale) },
            ].map((item) => (
              <View key={item.label} style={{ flex: 1, paddingHorizontal: isCompact ? 10 : 12, paddingVertical: isCompact ? 8 : 10, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 4 }}>
                <Text style={{ color: MUTED, fontSize: isCompact ? 9 : 10, fontWeight: '600', letterSpacing: isCompact ? 1 : 1.2 }}>{item.label.toUpperCase()}</Text>
                <Text style={{ color: TEXT, fontSize: isCompact ? 18 : 20, fontWeight: '700' }}>{item.value}</Text>
                <Text style={{ color: MUTED, fontSize: isCompact ? 10 : 11 }}>{item.detail}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: isCompact ? 6 : 8, marginBottom: isCompact ? 8 : 10 }}>
          {[
            { label: 'FEEDS', value: String(summary.today.feedCount) },
            { label: 'BOTTLE', value: `${summary.today.bottleMl} ml` },
            { label: 'SLEEP', value: `${summary.today.sleepMinutes}m` },
            { label: 'DIAPERS', value: String(summary.today.diaperCount) },
            { label: 'FOOD', value: String(summary.today.foodCount) },
          ].map((item, index) => (
            <StatCell key={item.label} label={item.label} value={item.value} index={index} compact={isCompact} />
          ))}
        </View>

        <Animated.View entering={FadeIn.duration(300).delay(320)} style={{ marginBottom: 10 }}>
          <View style={{ paddingHorizontal: isCompact ? 12 : 14, paddingVertical: isCompact ? 10 : 12, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: isCompact ? 6 : 8 }}>
            <Text style={sectionEyebrowStyle(isCompact)}>TIMELINE</Text>
            <Text style={sectionTitleStyle(isCompact)}>24h strip</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: isCompact ? 6 : 8, marginTop: isCompact ? 6 : 8, marginBottom: isCompact ? 6 : 8 }}>
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
                  <View style={{ height: isCompact ? 32 : 36, minWidth: isCompact ? 44 : 48, paddingHorizontal: isCompact ? 10 : 12, borderRadius: 20, backgroundColor: BORDER, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: TEXT, fontSize: isCompact ? 10 : 11, fontWeight: '600' }}>
                      {chip.label}
                      {chip.count > 1 ? ` ${chip.count}` : ''}
                    </Text>
                  </View>
                </PressScale>
              ))}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(300).delay(400)} style={{ marginBottom: 10 }}>
          <View style={{ paddingHorizontal: isCompact ? 12 : 14, paddingVertical: isCompact ? 10 : 12, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: isCompact ? 5 : 6 }}>
            <Text style={sectionEyebrowStyle(isCompact)}>ACTIONS RAPIDES</Text>
            <Text style={sectionTitleStyle(isCompact)}>{language === 'fr' ? 'Actions directes' : 'Quick actions'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: isCompact ? 6 : 8, marginTop: isCompact ? 6 : 8 }}>
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
                  flashColor={GOLD}
                  style={{ flexBasis: '31%', minWidth: isCompact ? 88 : 96, flexGrow: 1 }}
                >
                  <View style={{ height: isCompact ? 34 : 38, paddingHorizontal: isCompact ? 10 : 12, borderRadius: 18, backgroundColor: BORDER, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: TEXT, fontSize: isCompact ? 11 : 12, fontWeight: '700', textAlign: 'center' }} numberOfLines={1}>
                      {label}
                    </Text>
                  </View>
                </PressScale>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: isCompact ? 6 : 8, marginTop: isCompact ? 8 : 10 }}>
              {[
                { label: '+150 ml', href: '/entry/feed?presetMode=bottle&presetAmount=150' },
                { label: '+ diaper', href: '/entry/diaper' },
                { label: '+ sleep', href: '/entry/sleep' },
                { label: '+ food', href: '/entry/food' },
              ].map((item) => (
                <PressScale key={item.label} onPress={() => router.push(item.href as any)} pressedScale={0.95} style={{ flexBasis: '48%', minWidth: isCompact ? 120 : 130, flexGrow: 1 }}>
                  <View style={{ height: isCompact ? 34 : 38, paddingHorizontal: isCompact ? 12 : 14, borderRadius: 18, backgroundColor: '#1F2A1F', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: TEXT, fontSize: isCompact ? 11 : 12, fontWeight: '700', textAlign: 'center' }}>{item.label}</Text>
                  </View>
                </PressScale>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: isCompact ? 6 : 8, marginTop: 6 }}>
              {presetActions.map((preset) => (
                <PressScale key={preset.label} onPress={() => router.push(preset.href as any)} pressedScale={0.94} style={{ flexBasis: '48%', minWidth: isCompact ? 122 : 132, flexGrow: 1 }}>
                  <View style={{ height: isCompact ? 32 : 36, paddingHorizontal: isCompact ? 12 : 14, borderRadius: 18, backgroundColor: '#1F2A1F', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: TEXT, fontSize: isCompact ? 11 : 12, fontWeight: '700', textAlign: 'center' }}>{preset.label}</Text>
                  </View>
                </PressScale>
              ))}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(300).delay(480)} style={{ marginBottom: isCompact ? 8 : 10 }}>
          <View style={{ paddingHorizontal: isCompact ? 12 : 14, paddingVertical: isCompact ? 10 : 12, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: isCompact ? 6 : 8 }}>
            <Text style={sectionEyebrowStyle(isCompact)}>HYDRATION</Text>
            <Text style={sectionTitleStyle(isCompact)}>Hydration</Text>
            <Text style={{ color: MUTED, fontSize: isCompact ? 10 : 11 }}>{hydration} ml / {appSettings.hydrationGoalMl} ml</Text>
            <View style={{ height: 6, borderRadius: 999, backgroundColor: BORDER, overflow: 'hidden' }}>
              <View style={{ width: `${Math.max(0, Math.min(100, (hydration / appSettings.hydrationGoalMl) * 100))}%`, height: '100%', backgroundColor: BLUE }} />
            </View>
            <View style={{ flexDirection: 'row', gap: isCompact ? 6 : 8 }}>
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
                  <View style={{ height: isCompact ? 32 : 36, paddingHorizontal: isCompact ? 12 : 14, borderRadius: 20, backgroundColor: BORDER, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: TEXT, fontSize: isCompact ? 12 : 13, fontWeight: '700' }}>{item.label}</Text>
                  </View>
                </PressScale>
              ))}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(300).delay(560)} style={{ marginBottom: isCompact ? 8 : 10 }}>
          <View style={{ paddingHorizontal: isCompact ? 12 : 14, paddingVertical: isCompact ? 10 : 12, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER }}>
            <Text style={sectionEyebrowStyle(isCompact)}>{language === 'fr' ? 'HISTORIQUE' : 'RECENT'}</Text>
            <Text style={sectionTitleStyle(isCompact)}>{language === 'fr' ? 'Dernieres activites' : 'Recent activity'}</Text>
            <View style={{ marginTop: isCompact ? 6 : 8 }}>
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
                        ? `${entry.payload?.amountMl ?? entry.payload?.durationMin ?? 0} ${entry.payload?.mode === 'bottle' ? 'ml' : 'min'}`
                        : entry.notes ?? entry.type
                    }
                    time={formatClock(entry.occurredAt, locale)}
                    onPress={() => router.push({ pathname: '/entry/[type]', params: { type: entry.type, id: entry.id } })}
                    compact={isCompact}
                  />
                ))
              ) : (
                <View style={{ paddingVertical: isCompact ? 8 : 10 }}>
                  <Text style={{ color: MUTED, fontSize: isCompact ? 10 : 11 }}>{language === 'fr' ? 'Aucune activite recente.' : 'No recent activity.'}</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </View>

      <Modal visible={showSmartSignalsMenu} transparent animationType="fade" onRequestClose={() => setShowSmartSignalsMenu(false)}>
        <View style={styles.menuOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowSmartSignalsMenu(false)} />
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>{language === 'fr' ? 'Signaux intelligents' : 'Smart signals'}</Text>
            <Text style={styles.menuSubtitle}>
              {showSmartSignals
                ? language === 'fr'
                  ? 'Tu peux cacher cette section si elle ne t aide pas.'
                  : 'Hide this section if it does not help.'
                : language === 'fr'
                  ? 'Tu peux la remettre quand tu veux.'
                  : 'You can bring it back anytime.'}
            </Text>
            <View style={{ gap: 8 }}>
              <Button
                label={showSmartSignals ? (language === 'fr' ? 'Masquer la section' : 'Hide section') : (language === 'fr' ? 'Afficher la section' : 'Show section')}
                onPress={async () => {
                  await updateDashboardMetric('smartSignals', !showSmartSignals);
                  setShowSmartSignalsMenu(false);
                }}
                variant="secondary"
              />
              <Button
                label={language === 'fr' ? 'Personnaliser l\'accueil' : 'Customize home'}
                onPress={() => {
                  setShowSmartSignalsMenu(false);
                  setShowHomeCustomizer(true);
                }}
                variant="ghost"
                size="sm"
              />
              <Button label={language === 'fr' ? 'Fermer' : 'Close'} onPress={() => setShowSmartSignalsMenu(false)} variant="ghost" />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showNextFeedPicker} transparent animationType="fade" onRequestClose={() => setShowNextFeedPicker(false)}>
        <View style={styles.menuOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowNextFeedPicker(false)} />
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>{language === 'fr' ? 'Next feeding' : 'Next feeding'}</Text>
            <Text style={styles.menuSubtitle}>
              {language === 'fr'
                ? 'Choisis biberon ou sein. Pour le sein, choisis le cote avant de lancer le timer.'
                : 'Choose bottle or breast. For breast, pick the side before starting the timer.'}
            </Text>
            <View style={styles.choiceGrid}>
              <PressScale
                onPress={() => beginNextFeed('bottle')}
                pressedScale={0.96}
                style={{ flexBasis: '48%', minWidth: 130, flexGrow: 1 }}
              >
                <View style={[styles.choiceChip, { borderColor: BLUE, backgroundColor: `${BLUE}18` }]}>
                  <View style={styles.choiceTitleRow}>
                    <Ionicons name="water-outline" size={16} color={BLUE} />
                    <Text style={[styles.choiceTitle, { color: BLUE }]}>Biberon</Text>
                  </View>
                  <Text style={styles.choiceSubtitle}>{language === 'fr' ? 'Lance le minuteur' : 'Start timer'}</Text>
                </View>
              </PressScale>
              <PressScale
                onPress={() => beginNextFeed('breast', 'left')}
                pressedScale={0.96}
                style={{ flexBasis: '48%', minWidth: 130, flexGrow: 1 }}
              >
                <View style={[styles.choiceChip, { borderColor: GOLD, backgroundColor: `${GOLD}18` }]}>
                  <View style={styles.choiceTitleRow}>
                    <Ionicons name="body-outline" size={16} color={GOLD} />
                    <Text style={[styles.choiceTitle, { color: GOLD }]}>Sein gauche</Text>
                  </View>
                  <Text style={styles.choiceSubtitle}>{language === 'fr' ? 'Timer immediat' : 'Immediate timer'}</Text>
                </View>
              </PressScale>
              <PressScale
                onPress={() => beginNextFeed('breast', 'right')}
                pressedScale={0.96}
                style={{ flexBasis: '48%', minWidth: 130, flexGrow: 1 }}
              >
                <View style={[styles.choiceChip, { borderColor: GREEN, backgroundColor: `${GREEN}18` }]}>
                  <View style={styles.choiceTitleRow}>
                    <Ionicons name="body-outline" size={16} color={GREEN} />
                    <Text style={[styles.choiceTitle, { color: GREEN }]}>Sein droit</Text>
                  </View>
                  <Text style={styles.choiceSubtitle}>{language === 'fr' ? 'Timer immediat' : 'Immediate timer'}</Text>
                </View>
              </PressScale>
              <PressScale
                onPress={() => beginNextFeed('breast', 'both')}
                pressedScale={0.96}
                style={{ flexBasis: '48%', minWidth: 130, flexGrow: 1 }}
              >
                <View style={[styles.choiceChip, { borderColor: TEXT, backgroundColor: `${TEXT}12` }]}>
                  <View style={styles.choiceTitleRow}>
                    <Ionicons name="body-outline" size={16} color={TEXT} />
                    <Text style={[styles.choiceTitle, { color: TEXT }]}>Les deux</Text>
                  </View>
                  <Text style={styles.choiceSubtitle}>{language === 'fr' ? 'Alterner les deux' : 'Both sides'}</Text>
                </View>
              </PressScale>
            </View>
            <Button label={language === 'fr' ? 'Fermer' : 'Close'} onPress={() => setShowNextFeedPicker(false)} variant="ghost" />
          </View>
        </View>
      </Modal>

      <Modal visible={showHomeCustomizer} transparent animationType="fade" onRequestClose={() => setShowHomeCustomizer(false)}>
        <View style={styles.menuOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowHomeCustomizer(false)} />
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>{language === 'fr' ? 'Personnaliser l\'accueil' : 'Customize home'}</Text>
            <Text style={styles.menuSubtitle}>
              {language === 'fr'
                ? 'Masque ou restaure les blocs visibles sans changer la logique.'
                : 'Hide or restore visible blocks without changing logic.'}
            </Text>
            <View style={styles.customizerGrid}>
              {[
                { key: 'nextFeed', label: language === 'fr' ? 'Next feeding' : 'Next feeding' },
                { key: 'smartSignals', label: language === 'fr' ? 'Signaux intelligents' : 'Smart signals' },
                { key: 'lastFeeds', label: language === 'fr' ? 'Derniers biberons' : 'Last feeds' },
                { key: 'timeline', label: 'Timeline' },
                { key: 'recentActivity', label: language === 'fr' ? 'Historique court' : 'Recent activity' },
                { key: 'hydration', label: 'Hydration' },
                { key: 'dailyStatus', label: language === 'fr' ? 'Etat du jour' : 'Daily status' },
                { key: 'weeklyDigest', label: language === 'fr' ? 'Digest hebdo' : 'Weekly digest' },
                { key: 'widget', label: 'Widget' },
              ].map((item) => {
                const enabled = appSettings.dashboardMetrics[item.key as keyof typeof appSettings.dashboardMetrics];
                return (
                  <View key={item.key} style={styles.customizerItem}>
                    <Button
                      label={`${enabled ? (language === 'fr' ? 'Masquer' : 'Hide') : (language === 'fr' ? 'Afficher' : 'Show')} ${item.label}`}
                      onPress={() => void updateDashboardMetric(item.key as keyof typeof appSettings.dashboardMetrics, !enabled)}
                      variant={enabled ? 'secondary' : 'ghost'}
                      size="sm"
                    />
                  </View>
                );
              })}
            </View>
            <View style={{ gap: 8 }}>
              <Button label={language === 'fr' ? 'Tout restaurer' : 'Restore all'} onPress={() => void restoreHomeCustomization()} variant="secondary" />
              <Button label={language === 'fr' ? 'Fermer' : 'Close'} onPress={() => setShowHomeCustomizer(false)} variant="ghost" />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showBabySwitcher} transparent animationType="fade" onRequestClose={() => setShowBabySwitcher(false)}>
        <View style={styles.switcherOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowBabySwitcher(false)} />
          <View style={styles.switcherSheet}>
            <View style={styles.switcherHeader}>
              <View>
                <Text style={styles.switcherTitle}>{language === 'fr' ? "Changer d'enfant" : 'Switch child profile'}</Text>
                <Text style={styles.switcherSubtitle}>{language === 'fr' ? 'Choisis le profil actif pour ce tableau de bord.' : 'Choose the active profile for this dashboard.'}</Text>
              </View>
              <View style={styles.switcherBadge}>
                <Text style={{ color: GOLD, fontSize: 11, fontWeight: '800' }}>{babies.length}</Text>
              </View>
            </View>
            <ScrollView
              style={styles.switcherList}
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
              showsVerticalScrollIndicator={false}
            >
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
                        { borderColor: active ? GOLD : BORDER, backgroundColor: active ? `${GOLD}18` : CARD, opacity: pressed ? 0.88 : 1 },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <Text style={{ color: active ? GOLD : TEXT, fontSize: 15, fontWeight: '700' }}>{baby.name}</Text>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: active ? `${GOLD}66` : BORDER, backgroundColor: active ? `${GOLD}22` : BG }}>
                          <Text style={{ color: active ? GOLD : MUTED, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>
                            {active ? (language === 'fr' ? 'Actif' : 'Active') : language === 'fr' ? 'Utiliser' : 'Use'}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: MUTED, fontSize: 12 }}>{language === 'fr' ? 'Naissance:' : 'Birth:'} {baby.birthDate}</Text>
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
                    {language === 'fr'
                      ? "Va dans Profil pour creer un enfant, puis reviens ici pour l'activer."
                      : 'Go to Profile to create one, then return here to set it active.'}
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
              <Button label={language === 'fr' ? 'Fermer' : 'Close'} onPress={() => setShowBabySwitcher(false)} variant="ghost" />
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
                {quickTimerMode === 'bottle' ? 'Biberon termine' : `${activeFeedTitle} termine`}
              </Text>
              <Text style={styles.sheetSubtitle}>
                Duree {Math.max(1, Math.round(timerElapsedSeconds / 60))} min - commence a {formatClock(timerStartedAt ? new Date(timerStartedAt).toISOString() : undefined, locale)}
              </Text>
              <QuantityPicker value={quickAmount} onChange={setQuickAmount} largeTouchMode={appSettings.largeTouchMode} />
              <View style={styles.sheetActions}>
                <Button label="Save" onPress={saveQuickTimerEntry} />
                <Button
                  label="Cancel"
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
    maxWidth: 1040,
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
  choiceChip: {
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    gap: 4,
  },
  choiceTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  choiceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  choiceSubtitle: {
    color: MUTED,
    fontSize: 11,
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


