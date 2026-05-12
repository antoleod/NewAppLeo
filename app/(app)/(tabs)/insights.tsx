import { useMemo, useState } from 'react';
import { Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Button, EmptyState, Heading, Page } from '@/components/shared';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { buildSmartAlerts, getMeanFeedingInterval } from '@/lib/patterns';
import {
  getSuggestedValues,
  getWeightCategory,
  getHeightCategory,
  getAgeInMonths
} from '@/lib/who-recommendations';
import { getWeeklyTrend } from '@/utils/entries';
import { dateKey, formatDuration, startOfDay, subtractDays } from '@/utils/date';
import type { EntryRecord, UnitSystem } from '@/types';

type RangeKey = '7d' | '3d' | 'today';

const MS_PER_HOUR = 3_600_000;
const MS_PER_MIN = 60_000;
const MS_PER_WEEK = 7 * 24 * MS_PER_HOUR;
const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;
// Sparkline geometry — kept small so the chart sits inside the growth card.
const SPARK_W = 220;
const SPARK_H = 56;
const SPARK_PAD_X = 6;
const SPARK_PAD_Y = 6;

function formatWeight(kg: number, units: UnitSystem, digits = 1): string {
  const value = units === 'imperial' ? kg / KG_PER_LB : kg;
  return value.toFixed(digits);
}

function formatHeight(cm: number, units: UnitSystem, digits = 1): string {
  const value = units === 'imperial' ? cm / CM_PER_IN : cm;
  return value.toFixed(digits);
}

function weightUnit(units: UnitSystem): string {
  return units === 'imperial' ? 'lb' : 'kg';
}

function heightUnit(units: UnitSystem): string {
  return units === 'imperial' ? 'in' : 'cm';
}

function getReferenceBirthIso(birthDate: string | undefined, prematureWeeks: number | undefined): string | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  if (!prematureWeeks || prematureWeeks <= 0) return birth.toISOString();
  return new Date(birth.getTime() + prematureWeeks * MS_PER_WEEK).toISOString();
}

// Compact "1h 20m" / "20m" / "5h" formatter from a ms delta.
function formatShortDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / MS_PER_MIN));
  return formatDuration(totalMin);
}

// Pick a trichromatic color for WHO categories: low → red (real concern),
// healthy → green, high → accent (noteworthy but not alarming).
function categoryColor(category: 'low' | 'healthy' | 'high', GREEN: string, ACCENT: string, RED: string): string {
  if (category === 'healthy') return GREEN;
  if (category === 'high') return ACCENT;
  return RED;
}

function formatDelta(curr: number, prev: number): { text: string; symbol: '↑' | '↓' | '→' } {
  const delta = curr - prev;
  if (Math.abs(delta) < 0.001) return { text: '', symbol: '→' };
  const symbol = delta > 0 ? '↑' : '↓';
  return { text: String(Math.abs(Math.round(delta))), symbol };
}

const ENTRY_LABEL_KEY: Partial<Record<EntryRecord['type'], string>> = {
  feed: 'entry.titleFeedBottle',
  food: 'entry.food',
  sleep: 'entry.sleep',
  diaper: 'entry.diaper',
  measurement: 'entry.measurement',
  medication: 'entry.medicine',
  temperature: 'entry.temperatureLabel',
  symptom: 'entry.symptoms',
  vaccine: 'entry.vaccine',
  pump: 'entry.titlePump',
  milestone: 'entry.titleMilestone',
};

export default function InsightsScreen() {
  const { language } = useLocale();
  const { t, format } = useTranslation();
  const { entries, summary } = useAppData();
  const { profile } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<RangeKey>('7d');

  const BG = theme.bg;
  const CARD = theme.bgCard;
  const BORDER = theme.border;
  const GOLD = theme.accent;
  const GREEN = theme.green;
  const BLUE = theme.blue;
  const MUTED = theme.textMuted;
  const TEXT = theme.textPrimary;
  const RED = theme.red;

  const units: UnitSystem = profile?.unitSystem ?? 'metric';
  const wUnit = weightUnit(units);
  const hUnit = heightUnit(units);

  const eyebrowStyle = useMemo(
    () => ({
      color: GOLD,
      fontSize: 10,
      letterSpacing: 1.5,
      fontWeight: '600' as const,
      textTransform: 'uppercase' as const,
    }),
    [GOLD],
  );

  const titleStyle = useMemo(
    () => ({
      color: TEXT,
      fontSize: 18,
      fontWeight: '700' as const,
      marginTop: 2,
    }),
    [TEXT],
  );

  const rangeDays = range === 'today' ? 1 : range === '3d' ? 3 : 7;

  const allTrend = useMemo(() => getWeeklyTrend(entries, language), [entries, language]);
  const trend = useMemo(() => allTrend.slice(7 - rangeDays), [allTrend, rangeDays]);
  const meanInterval = useMemo(() => getMeanFeedingInterval(entries), [entries]);

  const smartAlerts = useMemo(() => buildSmartAlerts(entries, profile), [entries, profile]);

  // Last entry across all types — drives the "Last activity" pill.
  const lastEntry = useMemo(() => {
    if (!entries.length) return null;
    return [...entries].sort((a, b) => (b.occurredAt ?? '').localeCompare(a.occurredAt ?? ''))[0] ?? null;
  }, [entries]);

  const lastFeed = useMemo(
    () =>
      [...entries]
        .filter((e) => e.type === 'feed')
        .sort((a, b) => (b.occurredAt ?? '').localeCompare(a.occurredAt ?? ''))
        .at(0),
    [entries],
  );

  const latestMeasurement = useMemo(
    () =>
      [...entries]
        .filter((e) => e.type === 'measurement')
        .sort((a, b) => (b.occurredAt ?? '').localeCompare(a.occurredAt ?? ''))
        .at(0),
    [entries],
  );
  const latestWeightKg = Number(latestMeasurement?.payload?.weightKg ?? 0) || null;
  const latestHeightCm = Number(latestMeasurement?.payload?.heightCm ?? 0) || null;
  const latestHeadCircCm = Number(latestMeasurement?.payload?.headCircCm ?? 0) || null;
  const sleepMinutes = summary.today.sleepMinutes;

  const referenceBirthIso = useMemo(
    () => getReferenceBirthIso(profile?.babyBirthDate, profile?.prematureWeeks),
    [profile?.babyBirthDate, profile?.prematureWeeks],
  );

  const whoSuggested = referenceBirthIso ? getSuggestedValues(referenceBirthIso, t) : null;
  const ageMonths = referenceBirthIso ? getAgeInMonths(referenceBirthIso) : null;
  const weightCategory = latestWeightKg && referenceBirthIso ? getWeightCategory(latestWeightKg, referenceBirthIso, t) : null;
  const heightCategory = latestHeightCm && referenceBirthIso ? getHeightCategory(latestHeightCm, referenceBirthIso, t) : null;

  const weightHistory = useMemo(() => {
    return [...entries]
      .filter((e) => e.type === 'measurement' && e.payload?.weightKg)
      .sort((a, b) => (b.occurredAt ?? '').localeCompare(a.occurredAt ?? ''))
      .slice(0, 7)
      .reverse()
      .map((e) => ({
        weight: Number(e.payload.weightKg) || 0,
        date: new Date(e.occurredAt),
        occurredAt: e.occurredAt,
      }));
  }, [entries]);

  // Next-feed prediction — last feed + mean interval. Hidden when we lack data.
  const nextFeedInfo = useMemo(() => {
    if (!lastFeed || !meanInterval) return null;
    const lastTime = new Date(lastFeed.occurredAt).getTime();
    if (!Number.isFinite(lastTime)) return null;
    const estimated = lastTime + meanInterval;
    const deltaMs = estimated - Date.now();
    if (deltaMs <= -30 * MS_PER_MIN) {
      return { state: 'overdue' as const, ms: -deltaMs, time: new Date(estimated) };
    }
    if (Math.abs(deltaMs) <= 30 * MS_PER_MIN) {
      return { state: 'now' as const, ms: 0, time: new Date(estimated) };
    }
    return { state: 'soon' as const, ms: deltaMs, time: new Date(estimated) };
  }, [lastFeed, meanInterval]);

  const sleepByDay = useMemo(() => {
    return Array.from({ length: rangeDays }, (_, index) => {
      const day = subtractDays(startOfDay(new Date()), rangeDays - 1 - index);
      const key = dateKey(day);
      const minutes = entries
        .filter((entry) => entry.type === 'sleep' && dateKey(entry.occurredAt) === key)
        .reduce((sum, entry) => sum + (entry.payload?.durationMin ?? 0), 0);
      return {
        key,
        label: new Intl.DateTimeFormat(language, { weekday: 'short' }).format(day),
        minutes,
      };
    });
  }, [entries, language, rangeDays]);

  const longestSleep = useMemo(
    () => Math.max(0, ...entries.filter((entry) => entry.type === 'sleep').map((entry) => entry.payload?.durationMin ?? 0)),
    [entries],
  );

  const maxBottleInTrend = useMemo(
    () => Math.max(1, ...trend.map((d) => d.bottleMl ?? 0)),
    [trend],
  );

  // Diaper / food counts for today + yesterday — used for delta indicators
  // since these aren't returned by getWeeklyTrend.
  const dayCounts = useMemo(() => {
    const today = startOfDay(new Date());
    const yesterday = subtractDays(today, 1);
    const todayKey = dateKey(today);
    const yesterdayKey = dateKey(yesterday);
    const acc = {
      todayDiaper: 0,
      yestDiaper: 0,
      todayFood: 0,
      yestFood: 0,
    };
    for (const entry of entries) {
      const k = dateKey(entry.occurredAt);
      if (entry.type === 'diaper') {
        if (k === todayKey) acc.todayDiaper++;
        else if (k === yesterdayKey) acc.yestDiaper++;
      } else if (entry.type === 'food') {
        if (k === todayKey) acc.todayFood++;
        else if (k === yesterdayKey) acc.yestFood++;
      }
    }
    return acc;
  }, [entries]);

  const todayTrend = allTrend[6];
  const yestTrend = allTrend[5];

  const summaryCards = useMemo(
    () => [
      {
        label: t('insights.feeds'),
        value: String(summary.today.feedCount),
        color: GOLD,
        delta: formatDelta(todayTrend?.feedCount ?? 0, yestTrend?.feedCount ?? 0),
      },
      {
        label: t('insights.bottle'),
        value: `${summary.today.bottleMl} ml`,
        color: BLUE,
        delta: formatDelta(todayTrend?.bottleMl ?? 0, yestTrend?.bottleMl ?? 0),
      },
      {
        label: t('insights.sleep'),
        value: formatDuration(summary.today.sleepMinutes),
        color: GREEN,
        delta: formatDelta(todayTrend?.sleepMinutes ?? 0, yestTrend?.sleepMinutes ?? 0),
      },
      {
        label: t('insights.diapers'),
        value: String(summary.today.diaperCount),
        color: GOLD,
        delta: formatDelta(dayCounts.todayDiaper, dayCounts.yestDiaper),
      },
      {
        label: t('insights.food'),
        value: String(summary.today.foodCount),
        color: GOLD,
        delta: formatDelta(dayCounts.todayFood, dayCounts.yestFood),
      },
    ],
    [t, summary.today, GOLD, BLUE, GREEN, todayTrend, yestTrend, dayCounts],
  );

  const rangeButtons: Array<{ labelKey: string; value: RangeKey }> = [
    { labelKey: 'insights.range7d', value: '7d' },
    { labelKey: 'insights.range3d', value: '3d' },
    { labelKey: 'insights.range1d', value: 'today' },
  ];

  if (!entries.length) {
    return (
      <Page contentStyle={{ width: '100%' }}>
        <Heading eyebrow={t('insights.eyebrow')} title={t('insights.title')} subtitle={t('insights.subtitle.none')} align="left" />
        <EmptyState
          icon="bar-chart-outline"
          title={t('insights.noDataTitle')}
          body={t('insights.noDataBody')}
          action={<Button label={t('insights.createFeed')} onPress={() => router.push('/entry/feed')} />}
        />
      </Page>
    );
  }

  const maxSleepMinutes = Math.max(1, ...sleepByDay.map((d) => d.minutes));

  // Compute sparkline polyline points — honest scale anchored at min..max with
  // a small headroom so peaks/troughs sit inside the viewbox.
  const sparkPoints = (() => {
    if (weightHistory.length < 2) return null;
    const weights = weightHistory.map((w) => w.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const span = max - min || 1;
    const headroom = span * 0.15;
    const yMin = min - headroom;
    const yMax = max + headroom;
    const ySpan = yMax - yMin;
    const innerW = SPARK_W - SPARK_PAD_X * 2;
    const innerH = SPARK_H - SPARK_PAD_Y * 2;
    return weightHistory.map((m, i) => {
      const x = SPARK_PAD_X + (i * innerW) / (weightHistory.length - 1);
      const y = SPARK_PAD_Y + innerH - ((m.weight - yMin) / ySpan) * innerH;
      return { x, y, weight: m.weight, occurredAt: m.occurredAt };
    });
  })();

  const lastActivityLabel = lastEntry ? t(ENTRY_LABEL_KEY[lastEntry.type] ?? 'entry.composer') : null;
  const lastActivityAgo = lastEntry ? Date.now() - new Date(lastEntry.occurredAt).getTime() : 0;

  return (
    <Page contentStyle={{ width: '100%' }}>
      <View style={{ backgroundColor: BG, borderRadius: 16, paddingTop: 12, paddingHorizontal: 12, paddingBottom: insets.bottom + 60 }}>
        <Animated.View entering={FadeIn.duration(280)} style={{ marginBottom: 10 }}>
          <Heading
            eyebrow={t('insights.eyebrow')}
            title={t('insights.title')}
            subtitle={
              meanInterval
                ? format('insights.avgInterval', { hours: String(Math.round(meanInterval / MS_PER_HOUR)) })
                : t('insights.subtitle.none')
            }
            align="left"
          />
        </Animated.View>

        {/* Top status strip — last activity + next-feed prediction. The two
            highest-value glances when a sleep-deprived parent opens the app. */}
        {(lastEntry || nextFeedInfo) && (
          <Animated.View entering={FadeIn.duration(280).delay(40)} style={{ flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {lastEntry && (
              <View
                style={{
                  flex: 1,
                  minWidth: 160,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: CARD,
                  borderWidth: 1,
                  borderColor: BORDER,
                  gap: 4,
                }}
              >
                <Text style={{ color: MUTED, fontSize: 10, fontWeight: '600', letterSpacing: 1 }}>
                  {t('insights.lastActivity').toUpperCase()}
                </Text>
                <Text style={{ color: TEXT, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                  {lastActivityLabel}
                </Text>
                <Text style={{ color: MUTED, fontSize: 11 }}>
                  {format('insights.agoFormat', { time: formatShortDuration(lastActivityAgo) })}
                </Text>
              </View>
            )}
            {nextFeedInfo && (
              <View
                style={{
                  flex: 1,
                  minWidth: 160,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: CARD,
                  borderWidth: 1,
                  borderColor:
                    nextFeedInfo.state === 'overdue'
                      ? RED
                      : nextFeedInfo.state === 'now'
                      ? GOLD
                      : BORDER,
                  gap: 4,
                }}
              >
                <Text style={{ color: MUTED, fontSize: 10, fontWeight: '600', letterSpacing: 1 }}>
                  {t('insights.nextFeed').toUpperCase()}
                </Text>
                <Text
                  style={{
                    color:
                      nextFeedInfo.state === 'overdue'
                        ? RED
                        : nextFeedInfo.state === 'now'
                        ? GOLD
                        : TEXT,
                    fontSize: 16,
                    fontWeight: '800',
                  }}
                >
                  {nextFeedInfo.state === 'now'
                    ? t('insights.nextFeedNow')
                    : nextFeedInfo.state === 'overdue'
                    ? format('insights.nextFeedOverdue', { time: formatShortDuration(nextFeedInfo.ms) })
                    : format('insights.nextFeedIn', { time: formatShortDuration(nextFeedInfo.ms) })}
                </Text>
                <Text style={{ color: MUTED, fontSize: 11 }}>
                  ~ {nextFeedInfo.time.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Smart alerts — pulled from patterns.ts so the parent sees one calm
            heads-up if something needs attention (overdue feed, fever, etc.) */}
        {smartAlerts.length > 0 && (
          <Animated.View entering={FadeIn.duration(280).delay(80)} style={{ marginBottom: 10 }}>
            <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 8 }}>
              <Text style={eyebrowStyle}>{t('insights.smartAlerts')}</Text>
              {smartAlerts.map((alert) => {
                const tone =
                  alert.tone === 'danger' ? RED : alert.tone === 'warning' ? GOLD : alert.tone === 'success' ? GREEN : BLUE;
                return (
                  <View
                    key={alert.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: `${tone}15`,
                      borderWidth: 1,
                      borderColor: `${tone}40`,
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{alert.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: tone, fontSize: 12, fontWeight: '700' }}>{alert.title}</Text>
                      <Text style={{ color: TEXT, fontSize: 11, lineHeight: 15 }}>{alert.body}</Text>
                    </View>
                    <Text style={{ color: tone, fontSize: 11, fontWeight: '700' }}>{alert.value}</Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeIn.duration(280).delay(120)} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {rangeButtons.map((item) => {
              const active = range === item.value;
              return (
                <View key={item.value} style={{ flex: 1 }}>
                  <Button
                    label={t(item.labelKey)}
                    onPress={() => setRange(item.value)}
                    variant={active ? 'secondary' : 'ghost'}
                  />
                </View>
              );
            })}
          </View>
        </Animated.View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {summaryCards.map((card, index) => (
            <Animated.View
              key={card.label}
              entering={FadeInDown.duration(240).delay(index * 60)}
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
              <Text style={{ color: MUTED, fontSize: 10, fontWeight: '600', letterSpacing: 1.2 }}>{card.label.toUpperCase()}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                <Text style={{ color: card.color, fontSize: 22, fontWeight: '700' }}>{card.value}</Text>
                {card.delta.text ? (
                  <Text
                    style={{
                      color: card.delta.symbol === '↑' ? GREEN : card.delta.symbol === '↓' ? RED : MUTED,
                      fontSize: 11,
                      fontWeight: '700',
                    }}
                  >
                    {card.delta.symbol}
                    {card.delta.text}
                  </Text>
                ) : null}
              </View>
              <Text style={{ color: MUTED, fontSize: 9 }}>{t('insights.vsYesterday')}</Text>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeIn.duration(280).delay(160)} style={{ marginBottom: 10 }}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 10 }}>
            <Text style={eyebrowStyle}>{t('insights.weeklyOverview')}</Text>
            <Text style={titleStyle}>{t('insights.weeklyTrend')}</Text>
            <View style={{ gap: 10 }}>
              {trend.map((day) => {
                const widthPct = (day.bottleMl / maxBottleInTrend) * 100;
                return (
                  <View key={day.key} style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                      <Text style={{ color: TEXT, fontSize: 13, fontWeight: '700' }}>{day.label}</Text>
                      <Text style={{ color: MUTED, fontSize: 11 }}>
                        {day.feedCount} · {day.bottleMl} ml · {day.sleepMinutes} min
                      </Text>
                    </View>
                    <View style={{ height: 8, borderRadius: 999, backgroundColor: BORDER, overflow: 'hidden' }}>
                      <View style={{ width: `${Math.min(100, widthPct)}%`, height: '100%', backgroundColor: BLUE, borderRadius: 999 }} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </Animated.View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Animated.View entering={FadeIn.duration(280).delay(240)} style={{ flex: 1, minWidth: 260, marginBottom: 10 }}>
            <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 10 }}>
              <Text style={eyebrowStyle}>{t('insights.growth')}</Text>
              <Text style={titleStyle}>{t('insights.growth')}</Text>

              {whoSuggested && ageMonths !== null && (
                <View style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: `${GREEN}15`, borderWidth: 1, borderColor: `${GREEN}40`, gap: 6, marginBottom: 4 }}>
                  <Text style={{ color: GREEN, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {t('insights.whoReference')}
                  </Text>
                  <Text style={{ color: TEXT, fontSize: 12, lineHeight: 18 }}>{whoSuggested.message}</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: MUTED, fontSize: 9, fontWeight: '600' }}>
                        {t('insights.weight')}
                      </Text>
                      <Text style={{ color: GREEN, fontSize: 14, fontWeight: '700' }}>
                        {formatWeight(whoSuggested.weight.value, units)} {wUnit}
                      </Text>
                      <Text style={{ color: MUTED, fontSize: 9, marginTop: 2 }}>
                        {formatWeight(whoSuggested.weight.min, units)} - {formatWeight(whoSuggested.weight.max, units)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: MUTED, fontSize: 9, fontWeight: '600' }}>
                        {t('insights.height')}
                      </Text>
                      <Text style={{ color: GREEN, fontSize: 14, fontWeight: '700' }}>
                        {formatHeight(whoSuggested.height.value, units)} {hUnit}
                      </Text>
                      <Text style={{ color: MUTED, fontSize: 9, marginTop: 2 }}>
                        {formatHeight(whoSuggested.height.min, units)} - {formatHeight(whoSuggested.height.max, units)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {latestWeightKg || latestHeightCm ? (
                <View style={{ gap: 8 }}>
                  <View>
                    <Text style={{ color: MUTED, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                      {t('insights.currentMeasurements')}
                    </Text>
                    <Text style={{ color: TEXT, fontSize: 20, fontWeight: '700' }}>
                      {latestWeightKg ? `${formatWeight(latestWeightKg, units)} ${wUnit}` : '--'}
                    </Text>
                    <Text style={{ color: MUTED, fontSize: 11 }}>
                      {latestHeightCm ? `${formatHeight(latestHeightCm, units)} ${hUnit}` : '--'}
                      {latestHeadCircCm ? ` · ${formatHeight(latestHeadCircCm, units)} ${hUnit} ${t('insights.headCirc')}` : ''}
                    </Text>
                  </View>

                  {weightCategory && (() => {
                    const c = categoryColor(weightCategory.category, GREEN, GOLD, RED);
                    return (
                      <View style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: `${c}15`, borderWidth: 1, borderColor: `${c}40` }}>
                        <Text style={{ color: c, fontSize: 11, fontWeight: '600', lineHeight: 16 }}>
                          {weightCategory.emoji} {weightCategory.message}
                        </Text>
                      </View>
                    );
                  })()}

                  {heightCategory && (() => {
                    const c = categoryColor(heightCategory.category, GREEN, GOLD, RED);
                    return (
                      <View style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: `${c}15`, borderWidth: 1, borderColor: `${c}40` }}>
                        <Text style={{ color: c, fontSize: 11, fontWeight: '600', lineHeight: 16 }}>
                          {heightCategory.emoji} {heightCategory.message}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
              ) : (
                <View style={{ paddingVertical: 12, alignItems: 'center', gap: 6 }}>
                  <Ionicons name="scale-outline" size={28} color={MUTED} />
                  <Text style={{ color: MUTED, fontSize: 12, textAlign: 'center' }}>
                    {t('insights.noMeasurementsCalm')}
                  </Text>
                </View>
              )}

              {sparkPoints && (
                <View style={{ gap: 6, marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: MUTED, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {t('insights.weightTrend')}
                    </Text>
                    <Text style={{ color: MUTED, fontSize: 10 }}>
                      {formatWeight(sparkPoints[0].weight, units)} → {formatWeight(sparkPoints[sparkPoints.length - 1].weight, units)} {wUnit}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Svg width={SPARK_W} height={SPARK_H}>
                      <Polyline
                        points={sparkPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                        stroke={GREEN}
                        strokeWidth={2}
                        fill="none"
                      />
                      {sparkPoints.map((p, i) => (
                        <Circle
                          key={p.occurredAt ?? String(i)}
                          cx={p.x}
                          cy={p.y}
                          r={3}
                          fill={GREEN}
                        />
                      ))}
                    </Svg>
                  </View>
                </View>
              )}

              <Pressable
                onPress={() => router.push('/entry/measurement')}
                accessibilityRole="button"
                accessibilityLabel={t('insights.addMeasurement')}
                style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: `${GREEN}20`, borderWidth: 1, borderColor: `${GREEN}40`, marginTop: 4 }}
              >
                <Text style={{ color: GREEN, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                  {t('insights.addMeasurement')}
                </Text>
              </Pressable>
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.duration(280).delay(320)} style={{ flex: 1, minWidth: 260, marginBottom: 10 }}>
            <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 10 }}>
              <Text style={eyebrowStyle}>{t('insights.sleepAnalysis')}</Text>
              <Text style={titleStyle}>{t('insights.sleep')}</Text>
              <Text style={{ color: MUTED, fontSize: 11 }}>
                {t('insights.todaySleep')}: {sleepMinutes ? `${sleepMinutes} min` : '0 min'}
              </Text>
              <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700' }}>
                {t('insights.longestStretch')}: {formatDuration(longestSleep)}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-end', height: 96 }}>
                {sleepByDay.map((day) => (
                  <View key={day.key} style={{ flex: 1, gap: 6, alignItems: 'center' }}>
                    <View style={{ height: 80, width: '100%', justifyContent: 'flex-end' }}>
                      <View
                        accessibilityRole="image"
                        accessibilityLabel={`${day.label}: ${day.minutes} min`}
                        style={{
                          height: `${Math.min(100, (day.minutes / maxSleepMinutes) * 100)}%`,
                          minHeight: day.minutes ? 8 : 4,
                          borderRadius: 999,
                          backgroundColor: BLUE,
                        }}
                      />
                    </View>
                    <Text style={{ color: MUTED, fontSize: 11 }}>{day.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        </View>
      </View>
    </Page>
  );
}
