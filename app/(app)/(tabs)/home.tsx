import { useEffect, useMemo, useState } from 'react';
import { AppState, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
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
import { getMeanFeedingInterval } from '@/lib/patterns';
import {
  defaultAppSettings,
  defaultModuleVisibility,
  getActiveBaby,
  getAppSettings,
  getModuleVisibility,
  getMomHydration,
  setMomHydration,
} from '@/lib/storage';
import { QuantityPicker } from '@/components/QuantityPicker';
import { FullscreenTimerModal } from '@/components/FullscreenTimerModal';
import { NextFeedingCard } from '@/components/NextFeedingCard';

const BG = '#0D1117';
const CARD = '#161B22';
const BORDER = '#21262D';
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

function sectionEyebrowStyle() {
  return { color: GOLD, fontSize: 10, letterSpacing: 1.5, fontWeight: '600' as const, textTransform: 'uppercase' as const };
}

function sectionTitleStyle() {
  return { color: TEXT, fontSize: 18, fontWeight: '700' as const, marginTop: 2 };
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

function HeaderAction({ label, onPress }: { label: string; onPress: () => void }) {
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
      style={{ minHeight: 36 }}
    >
      <Animated.View
        style={[
          animatedStyle,
          {
            height: 36,
            paddingHorizontal: 14,
            borderRadius: 20,
            backgroundColor: GOLD,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          },
        ]}
      >
        <Text style={{ color: BG, fontSize: 14, fontWeight: '700' }}>+</Text>
        <Text style={{ color: BG, fontSize: 13, fontWeight: '700' }}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function StatCell({
  label,
  value,
  index,
}: {
  label: string;
  value: string;
  index: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(260).delay(index * 60)}
      style={{
        flexBasis: '48%',
        minWidth: 140,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: BORDER,
        gap: 6,
      }}
    >
      <Text style={{ color: MUTED, fontSize: 10, fontWeight: '600', letterSpacing: 1.2 }}>{label}</Text>
      <Text style={{ color: TEXT, fontSize: 22, fontWeight: '700' }}>{value}</Text>
    </Animated.View>
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
          minHeight: 52,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: BORDER,
          backgroundColor: CARD,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginBottom: 6,
        }}
      >
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: color }} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: TEXT, fontSize: 13, fontWeight: '700' }}>{title}</Text>
          <Text style={{ color: MUTED, fontSize: 11 }}>{detail}</Text>
        </View>
        <Text style={{ color: MUTED, fontSize: 11 }}>{time}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { language } = useLocale();
  const locale = localeTag(language);
  const { profile } = useAuth();
  const { entries, summary, addEntry } = useAppData();
  const [hydration, setHydration] = useState(0);
  const [babyId, setBabyId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState(defaultModuleVisibility);
  const [appSettings, setAppSettingsState] = useState(defaultAppSettings);
  const [quickTimerMode, setQuickTimerMode] = useState<QuickTimerMode>(null);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [timerElapsedSeconds, setTimerElapsedSeconds] = useState(0);
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [quickAmount, setQuickAmount] = useState(150);
  const [now, setNow] = useState(Date.now());

  const feedEntries = useMemo(() => entries.filter((entry) => entry.type === 'feed'), [entries]);
  const lastFeed = useMemo(() => feedEntries[0], [feedEntries]);
  const lastBreastFeed = useMemo(() => feedEntries.find((entry) => entry.payload?.mode === 'breast'), [feedEntries]);
  const lastBottleFeed = useMemo(() => feedEntries.find((entry) => entry.payload?.mode === 'bottle'), [feedEntries]);
  const lastDiaper = useMemo(() => entries.find((entry) => entry.type === 'diaper'), [entries]);
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

  function startQuickTimer(mode: 'breast' | 'bottle') {
    const startedAt = Date.now();
    setQuickTimerMode(mode);
    setTimerStartedAt(startedAt);
    setTimerElapsedSeconds(0);
    setQuickAmount(mode === 'bottle' ? 150 : 90);
  }

  async function saveQuickTimerEntry() {
    if (!timerStartedAt) return;
    await addEntry({
      type: 'feed',
      title: quickTimerMode === 'breast' ? 'Breast feed' : 'Bottle feed',
      occurredAt: new Date(timerStartedAt).toISOString(),
      payload:
        quickTimerMode === 'breast'
          ? {
              mode: 'breast',
              side: 'left',
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
  }

  const recentEntries = entries.slice(0, 6);

  return (
    <Page contentStyle={{ maxWidth: 980, width: '100%' }}>
      <View style={{ backgroundColor: BG, borderRadius: 16, paddingTop: 12, paddingHorizontal: 12, paddingBottom: 80 }}>
        <Animated.View entering={FadeIn.duration(300)} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={sectionEyebrowStyle()}>{language === 'fr' ? 'ACCUEIL' : 'HOME'}</Text>
              <Text style={sectionTitleStyle()}>{profile?.babyName ?? 'Leo'}</Text>
            </View>
            <HeaderAction label="Nouveau" onPress={() => router.push('/entry/feed')} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(300).delay(80)} style={{ marginBottom: 10 }}>
          <View style={{ minHeight: 80, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: `${GOLD}22`, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: GOLD, fontWeight: '700' }}>{(profile?.babyName ?? 'L').slice(0, 1)}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700' }}>{profile?.babyName ?? 'Leo'}</Text>
              <Text style={{ color: MUTED, fontSize: 11 }}>{profile?.caregiverName ?? 'Parent'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: TEXT, fontSize: 15, fontWeight: '700' }}>
                {lastMeasurement?.payload?.weightKg ? `${lastMeasurement.payload.weightKg} kg` : '--'}
              </Text>
              <Text style={{ color: MUTED, fontSize: 11 }}>
                {lastMeasurement?.payload?.heightCm ? `${lastMeasurement.payload.heightCm} cm` : '--'}
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(300).delay(160)} style={{ marginBottom: 10 }}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={sectionEyebrowStyle()}>{language === 'fr' ? 'LAIT' : 'MILK'}</Text>
                <Text style={{ color: TEXT, fontSize: 20, fontWeight: '700' }}>{totalMilkToday} ml</Text>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={sectionEyebrowStyle()}>{language === 'fr' ? 'PROCHAINE PRISE' : 'NEXT FEED'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: BLUE, fontSize: 14, fontWeight: '700' }}>◔</Text>
                  <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700' }}>{formatCountdown(nextFeedDueIn, language)}</Text>
                  <Animated.View style={[nextBadgeStyle, { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: nextFeedDueIn && nextFeedDueIn > 0 ? `${BLUE}22` : `${GOLD}22` }]}>
                    <Text style={{ color: nextFeedDueIn && nextFeedDueIn > 0 ? BLUE : GOLD, fontSize: 11, fontWeight: '700' }}>
                      {lastFeed ? formatRelative(lastFeed.occurredAt, locale) : '--'}
                    </Text>
                  </Animated.View>
                </View>
              </View>
            </View>
            <View style={{ height: 6, borderRadius: 999, backgroundColor: BORDER, overflow: 'hidden' }}>
              <Animated.View style={[{ height: '100%', backgroundColor: GOLD, borderRadius: 999 }, milkBarStyle]} />
            </View>
            <Text style={{ color: MUTED, fontSize: 11 }}>{milkStatus}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(300).delay(200)} style={{ marginBottom: 10 }}>
          <NextFeedingCard />
        </Animated.View>

        <Animated.View entering={FadeIn.duration(300).delay(240)} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: 'Dernier sein', value: formatClock(lastBreastFeed?.occurredAt, locale), detail: formatRelative(lastBreastFeed?.occurredAt, locale) },
              { label: 'Dernier biberon', value: formatClock(lastBottleFeed?.occurredAt, locale), detail: formatRelative(lastBottleFeed?.occurredAt, locale) },
            ].map((item) => (
              <View key={item.label} style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 4 }}>
                <Text style={{ color: MUTED, fontSize: 10, fontWeight: '600', letterSpacing: 1.2 }}>{item.label.toUpperCase()}</Text>
                <Text style={{ color: TEXT, fontSize: 20, fontWeight: '700' }}>{item.value}</Text>
                <Text style={{ color: MUTED, fontSize: 11 }}>{item.detail}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {[
            { label: 'FEEDS', value: String(summary.today.feedCount) },
            { label: 'BOTTLE', value: `${summary.today.bottleMl} ml` },
            { label: 'SLEEP', value: `${summary.today.sleepMinutes}m` },
            { label: 'DIAPERS', value: String(summary.today.diaperCount) },
          ].map((item, index) => (
            <StatCell key={item.label} label={item.label} value={item.value} index={index} />
          ))}
        </View>

        <Animated.View entering={FadeIn.duration(300).delay(320)} style={{ marginBottom: 10 }}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 8 }}>
            <Text style={sectionEyebrowStyle()}>TIMELINE</Text>
            <Text style={sectionTitleStyle()}>24h strip</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8, marginBottom: 8 }}>
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
                  <View style={{ height: 36, minWidth: 48, paddingHorizontal: 12, borderRadius: 20, backgroundColor: BORDER, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: TEXT, fontSize: 11, fontWeight: '600' }}>
                      {chip.label}
                      {chip.count > 1 ? ` ${chip.count}` : ''}
                    </Text>
                  </View>
                </PressScale>
              ))}
            </ScrollView>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(300).delay(400)} style={{ marginBottom: 10 }}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 6 }}>
            <Text style={sectionEyebrowStyle()}>ACTIONS RAPIDES</Text>
            <Text style={sectionTitleStyle()}>QuickActionBar</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {visibleActions.map(([label, href]) => (
                <PressScale
                  key={label}
                  onPress={() => {
                    if (href === 'quick-breast') {
                      startQuickTimer('breast');
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
                >
                  <View style={{ height: 36, paddingHorizontal: 14, borderRadius: 20, backgroundColor: BORDER, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: TEXT, fontSize: 13, fontWeight: '700' }}>{label}</Text>
                  </View>
                </PressScale>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 6 }}>
              {presetActions.map((preset) => (
                <PressScale key={preset.label} onPress={() => router.push(preset.href as any)} pressedScale={0.94}>
                  <View style={{ height: 36, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#1F2A1F', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: TEXT, fontSize: 13, fontWeight: '700' }}>{preset.label}</Text>
                  </View>
                </PressScale>
              ))}
            </ScrollView>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(300).delay(480)} style={{ marginBottom: 10 }}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 8 }}>
            <Text style={sectionEyebrowStyle()}>HYDRATION</Text>
            <Text style={sectionTitleStyle()}>Hydration</Text>
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
        </Animated.View>

        <Animated.View entering={FadeIn.duration(300).delay(560)} style={{ marginBottom: 10 }}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER }}>
            <Text style={sectionEyebrowStyle()}>{language === 'fr' ? 'HISTORIQUE' : 'RECENT'}</Text>
            <Text style={sectionTitleStyle()}>{language === 'fr' ? 'Dernieres activites' : 'Recent activity'}</Text>
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
                        ? `${entry.payload?.amountMl ?? entry.payload?.durationMin ?? 0} ${entry.payload?.mode === 'bottle' ? 'ml' : 'min'}`
                        : entry.notes ?? entry.type
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
        </Animated.View>
      </View>

      <FullscreenTimerModal
        visible={Boolean(quickTimerMode && timerStartedAt && !showSaveSheet)}
        emoji={quickTimerMode === 'bottle' ? '\u{1F37C}' : '\u{1F931}'}
        title={quickTimerMode === 'bottle' ? 'Biberon' : 'Sein'}
        subtitlePrefix={quickTimerMode === 'bottle' ? 'Biberon' : 'Gauche'}
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
                {quickTimerMode === 'bottle' ? 'Biberon termine' : 'Sein termine'}
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
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 22,
    paddingVertical: 22,
    gap: 18,
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
});
