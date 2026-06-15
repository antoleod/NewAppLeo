import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, Share, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import ReanimatedSwipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { Button, Card, Chip, EmptyState, Heading, Page , useToast } from '@/components/shared';
import { GetEntryIcon, FoodHistoryCard } from '@/components/history';
import { haptics } from '@/utils/haptics';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { EntryRecord, EntryType } from '@/types';
import { generateWeeklyPdf } from '@/services/pdf';
import { dateKey, formatLongDate, formatTime, isSameDay, startOfDay, subtractDays, toDate } from '@/utils/date';
import { getOmsRow, interpolatePercentileBand, omsBySex, type OmsSex } from '@/lib/omsData';
import { useWideWeb } from '@/hooks/useWideWeb';

import { useTranslation } from '@/hooks/useTranslation';

type TFn = (key: string, defaultValue?: string) => string;

const FILTER_DEFS: { tKey: string; value: EntryType | 'all' }[] = [
  { tKey: 'history.filterAll', value: 'all' },
  { tKey: 'history.filterFeed', value: 'feed' },
  { tKey: 'history.filterFood', value: 'food' },
  { tKey: 'history.filterSleep', value: 'sleep' },
  { tKey: 'history.filterDiaper', value: 'diaper' },
  { tKey: 'history.filterPump', value: 'pump' },
  { tKey: 'history.filterMedicine', value: 'medication' },
  { tKey: 'history.filterMeasurement', value: 'measurement' },
  { tKey: 'history.filterMilestone', value: 'milestone' },
  { tKey: 'history.filterSymptom', value: 'symptom' },
];

const LOCALE_MAP: Record<string, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  es: 'es-ES',
  nl: 'nl-NL',
};

function getDetail(entry: EntryRecord, t: TFn) {
  switch (entry.type) {
    case 'feed':
      return entry.payload.mode === 'bottle'
        ? `${entry.payload.amountMl ?? 0} ml`
        : `${entry.payload.durationMin ?? 0} min · ${entry.payload.side ?? 'left'}`;
    case 'food':
      return [entry.payload.foodName, entry.payload.quantity].filter(Boolean).join(' · ') || t('history.entryFood');
    case 'sleep':
      return `${entry.payload.durationMin ?? 0} min`;
    case 'diaper': {
      const parts = [
        `P ${entry.payload.pee ?? 0}`,
        `C ${entry.payload.poop ?? 0}`,
        `V ${entry.payload.vomit ?? 0}`,
      ];
      const colorEmoji: Record<string, string> = {
        yellow: '🟡', brown: '🟤', green: '🟢', dark: '⚫', red: '🔴',
      };
      const consistencyEmoji: Record<string, string> = {
        liquid: '🌊', soft: '💧', normal: '🟫', hard: '🥜',
      };
      const extras: string[] = [];
      if (entry.payload.poopColor && colorEmoji[entry.payload.poopColor]) {
        extras.push(colorEmoji[entry.payload.poopColor]);
      }
      if (entry.payload.poopConsistency && consistencyEmoji[entry.payload.poopConsistency]) {
        extras.push(consistencyEmoji[entry.payload.poopConsistency]);
      }
      if (entry.payload.diaperLeaked) extras.push('⚠️');
      return extras.length ? `${parts.join(' · ')}  ${extras.join(' ')}` : parts.join(' · ');
    }
    case 'pump':
      return `${entry.payload.amountMl ?? 0} ml · ${entry.payload.durationMin ?? 0} min`;
    case 'measurement':
      return [
        entry.payload?.weightKg ? `${entry.payload.weightKg} kg` : null,
        entry.payload?.heightCm ? `${entry.payload.heightCm} cm` : null,
        (entry.payload as any)?.headCircCm ? `${(entry.payload as any).headCircCm} cm ${t('history.headCircAbbr')}` : null,
      ]
        .filter(Boolean)
        .join(' · ');
    case 'medication':
      return [entry.payload.name, entry.payload.dosage].filter(Boolean).join(' · ');
    case 'milestone':
      return entry.payload.title ?? entry.title;
    case 'symptom':
      return entry.payload.tags?.join(', ') ?? entry.notes ?? t('history.entrySymptom');
    default:
      return entry.title;
  }
}

function groupByDay(entries: EntryRecord[]) {
  const map = new Map<string, EntryRecord[]>();
  for (const entry of entries) {
    const key = dateKey(entry.occurredAt);
    const current = map.get(key) ?? [];
    current.push(entry);
    map.set(key, current);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function monthsAndDaysSince(birthDate?: string) {
  const birth = toDate(birthDate);
  if (!birth) return { monthsFloat: 0, months: 0, days: 0 };
  const now = new Date();
  const totalDays = Math.max(0, Math.floor((now.getTime() - birth.getTime()) / 86400000));
  return {
    monthsFloat: totalDays / 30.4375,
    months: Math.floor(totalDays / 30.4375),
    days: totalDays % 30,
  };
}

function buildCsv(entries: EntryRecord[], t: TFn) {
  return [
    'id,type,title,timestamp,detail,notes',
    ...entries.map((entry) =>
      [entry.id, entry.type, entry.title, entry.occurredAt, getDetail(entry, t), entry.notes ?? '']
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    ),
  ].join('\n');
}

const TYPE_LABEL_KEY: Record<string, string> = {
  feed: 'history.filterFeed',
  food: 'history.filterFood',
  sleep: 'history.filterSleep',
  diaper: 'history.filterDiaper',
  pump: 'history.filterPump',
  medication: 'history.filterMedicine',
  measurement: 'history.filterMeasurement',
  vaccine: 'history.filterVaccine',
  symptom: 'history.filterSymptom',
  temperature: 'history.filterTemperature',
  milestone: 'history.filterMilestone',
};

function getTypeLabel(type: EntryType, t: TFn) {
  const key = TYPE_LABEL_KEY[type];
  return key ? t(key) : type;
}

type RowTokens = {
  text: string; muted: string; soft: string; border: string; bg: string; tint: string; red: string; blue: string;
};

type HistoryEntryRowProps = {
  entry: EntryRecord;
  expanded: boolean;
  detail: string;
  typeLabel: string;
  timeLabel: string;
  tint: string;
  tokens: RowTokens;
  hasNotes: boolean;
  noNoteLabel: string;
  editLabel: string;
  deleteLabel: string;
  onToggle: (id: string) => void;
  onEdit: (entry: EntryRecord) => void;
  onDelete: (entry: EntryRecord) => void;
  scrollViewRef?: React.RefObject<any>;
};

const HistoryEntryRow = React.memo(function HistoryEntryRow({
  entry, expanded, detail, typeLabel, timeLabel, tint, tokens,
  hasNotes, noNoteLabel, editLabel, deleteLabel,
  onToggle, onEdit, onDelete, scrollViewRef,
}: HistoryEntryRowProps) {
  const swipeRef = useRef<SwipeableMethods | null>(null);

  // Swipe-RIGHT (finger right) → Delete on the left edge. Deletes immediately
  // and surfaces the undo bar (6s) instead of a confirm dialog — reliable on
  // web where window.confirm/Alert inside the swipe action is flaky.
  const renderLeftAction = () => (
    <Pressable
      onPress={() => {
        haptics.medium();
        swipeRef.current?.close();
        onDelete(entry);
      }}
      style={{
        width: 88, flexDirection: 'row',
        justifyContent: 'center', alignItems: 'center', gap: 6,
        backgroundColor: tokens.red, borderRadius: 12, marginRight: 6,
      }}
    >
      <Ionicons name="trash-outline" size={18} color="#fff" />
      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{deleteLabel}</Text>
    </Pressable>
  );

  // Swipe-LEFT (finger left) → Edit on the right edge (matches home).
  const renderRightAction = () => (
    <Pressable
      onPress={() => { haptics.light(); swipeRef.current?.close(); onEdit(entry); }}
      style={{
        width: 88, flexDirection: 'row',
        justifyContent: 'center', alignItems: 'center', gap: 6,
        backgroundColor: tokens.blue, borderRadius: 12, marginLeft: 6,
      }}
    >
      <Ionicons name="pencil-outline" size={18} color="#fff" />
      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{editLabel}</Text>
    </Pressable>
  );

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      renderLeftActions={renderLeftAction}
      renderRightActions={renderRightAction}
      leftThreshold={40}
      rightThreshold={40}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
      simultaneousHandlers={scrollViewRef}
    >
      <Pressable
        onPress={() => onToggle(entry.id)}
        accessibilityRole="button"
        accessibilityLabel={`${typeLabel} · ${timeLabel}`}
        accessibilityState={{ expanded }}
        style={({ pressed }) => ({
          paddingVertical: 12,
          paddingHorizontal: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: expanded ? tint : tokens.border,
          backgroundColor: pressed ? tokens.border : tokens.bg,
          gap: expanded ? 10 : 0,
        })}
      >
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{
            width: 36, height: 36, borderRadius: 10,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: tint + '1F',
            borderWidth: 1, borderColor: tint + '38',
          }}>
            {GetEntryIcon(entry.type, 18, tint)}
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={{ color: tokens.text, fontSize: 13, fontWeight: '700', letterSpacing: 0.2 }} numberOfLines={1}>
                {typeLabel}
              </Text>
              {hasNotes ? (
                <Ionicons name="document-text-outline" size={11} color={tokens.muted} />
              ) : null}
            </View>
            <Text style={{ color: tokens.muted, fontSize: 12, fontWeight: '500' }} numberOfLines={1}>
              {detail}
            </Text>
          </View>
          <Text style={{ color: tokens.text, fontSize: 13, fontWeight: '700' }}>{timeLabel}</Text>
        </View>
        {expanded && hasNotes ? (
          <View style={{ borderTopWidth: 1, borderTopColor: tokens.border, paddingTop: 10 }}>
            <Text style={{ color: tokens.muted, fontSize: 13, lineHeight: 18 }}>{entry.notes || noNoteLabel}</Text>
          </View>
        ) : null}
      </Pressable>
    </ReanimatedSwipeable>
  );
});

function progressPercent(value: number | null | undefined, min: number, max: number) {
  if (!value || max <= min) return 0;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

export default function HistoryScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { isWideWeb } = useWideWeb();
  const insets = useSafeAreaInsets();
  const { t, format, language } = useTranslation();
  const intlLocale = LOCALE_MAP[language] ?? 'fr-FR';
  const FILTERS = useMemo(
    () => FILTER_DEFS.map((f) => ({ label: t(f.tKey), value: f.value })),
    [t],
  );
  const { entries, deleteEntry, addEntry, forceReconnect } = useAppData();
  const { profile } = useAuth();
  const { theme } = useTheme();
  const toast = useToast();
  const historyScrollRef = useRef<any>(null);

  const BG = theme.bg;
  const CARD = theme.bgCard;
  const BORDER = theme.border;
  const GOLD = theme.accent;
  const GREEN = theme.green;
  const BLUE = theme.blue;
  const RED = theme.red;
  const PURPLE = theme.blue;
  const TEXT = theme.textPrimary;
  const MUTED = theme.textMuted;
  const SOFT = theme.textMuted;

  const rowTokens = useMemo<RowTokens>(() => ({
    text: theme.textPrimary,
    muted: theme.textMuted,
    soft: SOFT,
    border: theme.border,
    bg: theme.bg,
    tint: theme.accent,
    red: theme.red,
    blue: theme.blue,
  }), [SOFT, theme]);

  const iconColor = (type: EntryType) => {
    if (type === 'feed') return GOLD;
    if (type === 'food') return '#F0B85A';
    if (type === 'sleep') return BLUE;
    if (type === 'diaper') return RED;
    if (type === 'medication') return GREEN;
    if (type === 'measurement') return PURPLE;
    if (type === 'pump') return '#F778BA';
    if (type === 'milestone') return '#FFA657';
    return '#56D364';
  };

  const percentileStatus = (value: number | null | undefined, band: { p3: number; p10: number; p90: number; p97: number }) => {
    if (!value) return { label: t('history.statusNoData'), color: MUTED };
    if (value < band.p3 || value > band.p97) return { label: `⚠ ${t('history.statusAlert')}`, color: RED };
    if (value < band.p10 || value > band.p90) return { label: t('history.statusAttention'), color: theme.yellow };
    return { label: `✓ ${t('history.statusNormal')}`, color: GREEN };
  };

  const OmsMetricCard = ({
    label,
    value,
    unit,
    band,
  }: {
    label: string;
    value: number | null | undefined;
    unit: string;
    band: { p3: number; p10: number; p50: number; p90: number; p97: number };
  }) => {
    const status = percentileStatus(value, band);
    return (
      <View style={{ gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: BG }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <Text style={{ color: TEXT, fontSize: 14, fontWeight: '700' }}>{label}</Text>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: `${status.color}22` }}>
            <Text style={{ color: status.color, fontSize: 12, fontWeight: '700' }}>{status.label}</Text>
          </View>
        </View>
        <Text style={{ color: TEXT, fontSize: 22, fontWeight: '700' }}>{value ? `${value.toFixed(1)} ${unit}` : '--'}</Text>
        <View style={{ height: 10, borderRadius: 999, backgroundColor: BORDER, overflow: 'hidden' }}>
          <View style={{ width: `${progressPercent(value, band.p3, band.p97)}%`, height: '100%', backgroundColor: status.color }} />
        </View>
        <Text style={{ color: MUTED, fontSize: 12 }}>
          P3 {band.p3.toFixed(1)} · P50 {band.p50.toFixed(1)} · P97 {band.p97.toFixed(1)}
        </Text>
      </View>
    );
  };

  const WeightChart = ({
    points,
    bandRows,
  }: {
    points: { label: string; value: number }[];
    bandRows: { label: string; p25: number; p75: number }[];
  }) => {
    const width = 320;
    const height = 190;
    const padding = 28;
    const allValues = [
      ...points.map((point) => point.value),
      ...bandRows.map((row) => row.p25),
      ...bandRows.map((row) => row.p75),
    ].filter((value) => Number.isFinite(value));

    if (!allValues.length) {
      return <Text style={{ color: MUTED, textAlign: 'center' }}>{t('history.chartEmpty')}</Text>;
    }

    const minValue = Math.min(...allValues) - 0.2;
    const maxValue = Math.max(...allValues) + 0.2;
    const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : width - padding * 2;
    const y = (value: number) => height - padding - ((value - minValue) / Math.max(0.1, maxValue - minValue)) * (height - padding * 2);
    const x = (index: number) => padding + stepX * index;
    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;
    const bandSegments = bandRows.slice(0, Math.max(0, bandRows.length - 1));
    const lineSegments = points.slice(0, Math.max(0, points.length - 1));

    return (
      <View style={{ height, borderRadius: 12, backgroundColor: CARD, overflow: 'hidden', paddingVertical: 8 }}>
        {[0, 1, 2, 3].map((tick) => {
          const value = minValue + ((maxValue - minValue) / 3) * tick;
          const tickY = y(value);
          return (
            <View
              key={tick}
              style={{
                position: 'absolute',
                left: padding,
                right: padding,
                top: tickY,
                borderTopWidth: 1,
                borderTopColor: 'rgba(139,148,158,0.18)',
              }}
            >
              <Text style={{ position: 'absolute', left: -24, top: -8, color: MUTED, fontSize: 10 }}>{value.toFixed(1)}</Text>
            </View>
          );
        })}

        <View style={{ position: 'absolute', top: padding, left: padding, width: plotWidth, height: plotHeight }}>
          {bandSegments.map((row, index) => {
            const next = bandRows[index + 1];
            const left = x(index) - padding;
            const right = x(index + 1) - padding;
            return (
              <View key={`${row.label}-${index}`}>
                <View
                  style={{
                    position: 'absolute',
                    left,
                    top: y(row.p75) - padding,
                    width: Math.max(4, right - left),
                    height: Math.max(6, y(row.p25) - y(row.p75)),
                    backgroundColor: 'rgba(201,162,39,0.18)',
                  }}
                />
                {next ? null : null}
              </View>
            );
          })}

          {lineSegments.map((point, index) => {
            const currentX = x(index) - padding;
            const currentY = y(point.value) - padding;
            const nextX = x(index + 1) - padding;
            const nextY = y(points[index + 1].value) - padding;
            const left = Math.min(currentX, nextX);
            const top = Math.min(currentY, nextY);
            return (
              <View
                key={`${point.label}-${index}`}
                style={{
                  position: 'absolute',
                  left,
                  top,
                  width: Math.max(3, nextX - currentX + 3),
                  height: Math.max(3, Math.abs(nextY - currentY) + 3),
                  borderTopWidth: 3,
                  borderRightWidth: 3,
                  borderColor: GOLD,
                  borderTopRightRadius: 999,
                }}
              />
            );
          })}

          {points.map((point, index) => (
            <View
              key={`${point.label}-dot-${index}`}
              style={{
                position: 'absolute',
                left: x(index) - padding - 4,
                top: y(point.value) - padding - 4,
                width: 8,
                height: 8,
                borderRadius: 999,
                backgroundColor: GOLD,
              }}
            />
          ))}
        </View>

        <View style={{ position: 'absolute', left: padding, right: padding, bottom: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
          {points.map((point, index) => (
            <Text key={point.label + index} style={{ color: MUTED, fontSize: 10, textAlign: 'center', minWidth: 28 }}>
              {point.label}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  const [filter, setFilter] = useState<EntryType | 'all'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showOmsTable, setShowOmsTable] = useState(false);
  const [omsSex, setOmsSex] = useState<OmsSex>(profile?.babySex === 'male' ? 'male' : 'female');
  const [showTodayStatus, setShowTodayStatus] = useState(true);
  const [showInsights, setShowInsights] = useState(true);
  const [showTimeGroups, setShowTimeGroups] = useState(true);
  const [undoEntry, setUndoEntry] = useState<EntryRecord | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const didAutoSelectLatest = useRef(false);

  const onPullToRefresh = React.useCallback(async () => {
    setRefreshing(true);
    forceReconnect();
    // Visual feedback for ~600ms even if reconnect is instant — gives the
    // native spinner time to play its animation cleanly.
    setTimeout(() => setRefreshing(false), 600);
  }, [forceReconnect]);

  const dayEntries = useMemo(
    () =>
      entries
        .filter((entry) => isSameDay(entry.occurredAt, selectedDate))
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [entries, selectedDate],
  );
  const latestEntryDate = useMemo(() => {
    const latest = entries[0];
    return latest ? startOfDay(new Date(latest.occurredAt)) : null;
  }, [entries]);

  useEffect(() => {
    if (didAutoSelectLatest.current || !entries.length || !latestEntryDate) return;
    if (dayEntries.length) {
      didAutoSelectLatest.current = true;
      return;
    }
    didAutoSelectLatest.current = true;
    setSelectedDate(latestEntryDate);
  }, [dayEntries.length, entries.length, latestEntryDate]);

  useEffect(() => {
    const handle = setTimeout(() => setSearchQuery(searchInput.trim().toLowerCase()), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    if (!undoEntry) return;
    const handle = setTimeout(() => setUndoEntry(null), 6000);
    return () => clearTimeout(handle);
  }, [undoEntry]);

  // Build each entry's searchable haystack once per entries/filter/translation
  // change. Typing only re-runs the cheap .includes() filter below — previously
  // getDetail() + the haystack join ran for every entry on every keystroke.
  const searchableTimeline = useMemo(() => {
    const filtered = entries
      .filter((entry) => filter === 'all' || entry.type === filter)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return filtered.map((entry) => ({
      entry,
      haystack: [
        entry.title,
        entry.notes,
        entry.type,
        getDetail(entry, t),
        entry.payload?.foodName,
        entry.payload?.name,
        ...(entry.payload?.tags ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    }));
  }, [entries, filter, t]);

  const timelineEntries = useMemo(() => {
    if (!searchQuery) return searchableTimeline.map((row) => row.entry);
    return searchableTimeline
      .filter((row) => row.haystack.includes(searchQuery))
      .map((row) => row.entry);
  }, [searchableTimeline, searchQuery]);
  const unifiedTimeline = useMemo(() => groupByDay(timelineEntries), [timelineEntries]);
  const yesterdayEntries = useMemo(
    () => entries.filter((entry) => isSameDay(entry.occurredAt, subtractDays(selectedDate, 1))),
    [entries, selectedDate],
  );

  const currentCsv = useMemo(() => buildCsv(dayEntries, t), [dayEntries, t]);
  const dayFeedEntries = dayEntries.filter((entry) => entry.type === 'feed');
  const dayFeedCount = dayFeedEntries.length;
  const yesterdayFeedCount = yesterdayEntries.filter((entry) => entry.type === 'feed').length;
  const feedDelta = dayFeedCount - yesterdayFeedCount;
  const feedDeltaStr = `${feedDelta >= 0 ? '+' : ''}${feedDelta}`;
  const dayBottleMl = dayFeedEntries.reduce((sum, entry) => sum + (entry.payload.amountMl ?? 0), 0);
  const avgMlPerFeed = dayFeedCount ? Math.round(dayBottleMl / dayFeedCount) : 0;
  const firstFeed = [...dayFeedEntries].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))[0];
  const sleepMinutes = dayEntries.filter((entry) => entry.type === 'sleep').reduce((sum, entry) => sum + (entry.payload.durationMin ?? 0), 0);
  const diaperCount = dayEntries.filter((entry) => entry.type === 'diaper').length;
  const medEntries = dayEntries.filter((entry) => entry.type === 'medication');
  const measureEntries = dayEntries.filter((entry) => entry.type === 'measurement');
  const latestMeasure = measureEntries[0];
  const frequencyBadge = dayFeedCount > 1 ? `${Math.round((24 / dayFeedCount) * 10) / 10}h` : '--';
  const longestFeedGapHours = useMemo(() => {
    if (dayFeedEntries.length < 2) return null;
    const sorted = [...dayFeedEntries].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    let maxGap = 0;
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = new Date(sorted[i - 1].occurredAt).getTime();
      const current = new Date(sorted[i].occurredAt).getTime();
      maxGap = Math.max(maxGap, current - prev);
    }
    return Math.round((maxGap / 3600000) * 10) / 10;
  }, [dayFeedEntries]);

  const sex = omsSex;
  const age = monthsAndDaysSince(profile?.babyBirthDate);
  const omsRow = getOmsRow(sex, age.monthsFloat);
  const weightBand = interpolatePercentileBand(omsRow.weight.p3, omsRow.weight.p15, omsRow.weight.p50, omsRow.weight.p85, omsRow.weight.p97);
  const heightBand = interpolatePercentileBand(omsRow.height.p3, omsRow.height.p15, omsRow.height.p50, omsRow.height.p85, omsRow.height.p97);
  const headBand = interpolatePercentileBand(omsRow.headCirc.p50 - 3.1, omsRow.headCirc.p50 - 1.7, omsRow.headCirc.p50, omsRow.headCirc.p50 + 1.7, omsRow.headCirc.p50 + 3.1);

  const weightEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.type === 'measurement' && entry.payload?.weightKg)
        .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
        .slice(-7),
    [entries],
  );

  const weightPoints = weightEntries.map((entry) => ({
    label: new Intl.DateTimeFormat(intlLocale, { day: '2-digit', month: 'short' }).format(new Date(entry.occurredAt)),
    value: Number(entry.payload.weightKg ?? 0),
  }));

  const weightBandRows = weightEntries.map((entry) => {
    const pointAge = monthsAndDaysSince(profile?.babyBirthDate);
    const row = getOmsRow(sex, pointAge.monthsFloat);
    const band = interpolatePercentileBand(row.weight.p3, row.weight.p15, row.weight.p50, row.weight.p85, row.weight.p97);
    return {
      label: new Intl.DateTimeFormat(intlLocale, { day: '2-digit', month: 'short' }).format(new Date(entry.occurredAt)),
      p25: band.p25,
      p75: band.p75,
    };
  });

  const latestWeight = latestMeasure?.payload?.weightKg ?? profile?.currentWeightKg ?? null;
  const latestHeight = latestMeasure?.payload?.heightCm ?? profile?.heightCm ?? null;
  const latestHeadCirc = (latestMeasure?.payload as any)?.headCircCm ?? (profile as any)?.headCircCm ?? null;
  const bmi = latestWeight && latestHeight ? latestWeight / Math.pow(latestHeight / 100, 2) : null;
  const bmiBand = interpolatePercentileBand(13.5, 14.2, 15.7, 17.8, 19.4);

  async function exportCsv() {
    if (globalThis.navigator?.clipboard?.writeText && Platform.OS === 'web') {
      await globalThis.navigator.clipboard.writeText(currentCsv);
      toast.success(t('history.exportedToClipboard'));
      return;
    }
    await Share.share({ message: currentCsv, title: 'AppLeo CSV' });
  }

  async function exportPdf() {
    const pdf = await generateWeeklyPdf(dayEntries);
    toast.info(pdf.summary);
  }

  async function shareDay() {
    await Share.share({
      title: 'AppLeo day report',
      message: JSON.stringify(
        {
          babyProfile: {
            name: profile?.babyName,
            birthDate: profile?.babyBirthDate,
            sex: profile?.babySex,
            currentWeight: latestWeight,
            currentHeight: latestHeight,
            headCircumference: latestHeadCirc,
          },
          entries: dayEntries.map((entry) => ({
            id: entry.id,
            type: entry.type,
            timestamp: entry.occurredAt,
            data: entry.payload,
          })),
        },
        null,
        2,
      ),
    });
  }

  async function handleDeleteEntry(entry: EntryRecord) {
    await deleteEntry(entry.id);
    setUndoEntry(entry);
    setExpandedId(null);
  }

  async function handleUndoDelete() {
    if (!undoEntry) return;
    await addEntry({
      type: undoEntry.type,
      title: undoEntry.title,
      notes: undoEntry.notes,
      occurredAt: undoEntry.occurredAt,
      payload: undoEntry.payload,
    });
    setUndoEntry(null);
  }

  const isOnToday = isSameDay(selectedDate, new Date());
  const todayDelta = Math.round((startOfDay(new Date()).getTime() - startOfDay(selectedDate).getTime()) / 86400000);
  const dayRelativeLabel = todayDelta === 0 ? t('history.today') : todayDelta === 1 ? t('history.yesterday') : null;

  const historySidebar = (
    <>
        <Heading eyebrow={t('history.eyebrow')} title={t('history.title')} align="left" />

        <Card style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={() => setSelectedDate((current) => subtractDays(current, 1))}
              accessibilityRole="button"
              accessibilityLabel={t('history.prevDay')}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 38, height: 38, borderRadius: 19,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: pressed ? BORDER : BG,
                borderWidth: 1, borderColor: BORDER,
              })}
            >
              <Ionicons name="chevron-back" size={18} color={TEXT} />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              {dayRelativeLabel ? (
                <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: `${GOLD}1F`, marginBottom: 4 }}>
                  <Text style={{ color: GOLD, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>{dayRelativeLabel}</Text>
                </View>
              ) : null}
              <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700', textAlign: 'center' }} numberOfLines={1}>
                {new Intl.DateTimeFormat(intlLocale, { weekday: 'long', day: 'numeric', month: 'long' }).format(selectedDate)}
              </Text>
              <Text style={{ color: MUTED, fontSize: 11, fontWeight: '500', marginTop: 2 }}>
                {dayEntries.length} · {new Intl.DateTimeFormat(intlLocale, { year: 'numeric' }).format(selectedDate)}
              </Text>
            </View>
            <Pressable
              onPress={() => setSelectedDate((current) => subtractDays(current, -1))}
              accessibilityRole="button"
              accessibilityLabel={t('history.nextDay')}
              disabled={isOnToday}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 38, height: 38, borderRadius: 19,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: pressed ? BORDER : BG,
                borderWidth: 1, borderColor: BORDER,
                opacity: isOnToday ? 0.35 : 1,
              })}
            >
              <Ionicons name="chevron-forward" size={18} color={TEXT} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Pressable
              onPress={() => setSelectedDate(startOfDay(new Date()))}
              accessibilityRole="button"
              accessibilityLabel={t('history.today')}
              disabled={isOnToday}
              style={({ pressed }) => ({
                flex: 1, minWidth: 90, minHeight: 38,
                paddingHorizontal: 14, borderRadius: 20,
                borderWidth: 1, borderColor: isOnToday ? `${GOLD}88` : BORDER,
                backgroundColor: isOnToday ? `${GOLD}1A` : (pressed ? BORDER : BG),
                alignItems: 'center', justifyContent: 'center',
                flexDirection: 'row', gap: 6,
                opacity: isOnToday ? 0.55 : 1,
              })}
            >
              <Ionicons name="today-outline" size={14} color={isOnToday ? GOLD : TEXT} />
              <Text style={{ color: isOnToday ? GOLD : TEXT, fontWeight: '700', fontSize: 13 }}>{t('history.today')}</Text>
            </Pressable>
            {[
              { label: 'CSV', action: exportCsv, icon: 'document-text-outline' as const },
              { label: 'PDF', action: exportPdf, icon: 'document-outline' as const },
              { label: t('history.share'), action: shareDay, icon: 'share-outline' as const },
            ].map((item) => (
              <Pressable
                key={item.label}
                onPress={item.action}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={({ pressed }) => ({
                  minHeight: 38, paddingHorizontal: 14,
                  borderRadius: 20, borderWidth: 1,
                  borderColor: BORDER,
                  backgroundColor: pressed ? BORDER : BG,
                  alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'row', gap: 6,
                })}
              >
                <Ionicons name={item.icon} size={14} color={TEXT} />
                <Text style={{ color: TEXT, fontWeight: '700', fontSize: 13 }}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: BORDER,
              backgroundColor: BG,
            }}
          >
            <Ionicons name="search" size={16} color={MUTED} />
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder={t('history.searchPlaceholder')}
              placeholderTextColor={MUTED}
              style={{ flex: 1, color: TEXT, fontSize: 14, paddingVertical: 4 }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchInput.length > 0 ? (
              <Pressable
                onPress={() => setSearchInput('')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('history.clearSearch')}
              >
                <Ionicons name="close-circle" size={18} color={MUTED} />
              </Pressable>
            ) : null}
          </View>
          {searchQuery ? (
            timelineEntries.length === 0 ? (
              <Text style={{ color: MUTED, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>
                {format('history.noResults', { query: searchInput })}
              </Text>
            ) : (
              <Text style={{ color: GOLD, fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                {format('history.resultsCount', { count: timelineEntries.length })}
              </Text>
            )
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 6 }}>
            {FILTERS.map((item) => {
              const active = filter === item.value;
              const tint = item.value === 'all' ? GOLD : iconColor(item.value as EntryType);
              return (
                <Chip
                  key={item.value}
                  label={item.label}
                  tone={tint}
                  selected={active}
                  onPress={() => setFilter(item.value)}
                  icon={item.value !== 'all' ? (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tint }} />
                  ) : undefined}
                />
              );
            })}
          </ScrollView>
        </Card>

        <Card style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <Heading eyebrow={t('history.summaryEyebrow')} title={t('history.summaryTitle')} subtitle={t('history.summarySubtitle')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[
              { label: t('history.summaryFeeds'), value: String(dayFeedCount), detail: format('history.vsYesterday', { delta: feedDeltaStr }) },
              { label: t('history.summaryMilk'), value: `${dayBottleMl} ml`, detail: format('history.summaryTarget', { value: profile?.goalFeedingsPerDay ?? 8 }) },
              { label: t('history.summarySleep'), value: `${sleepMinutes} min`, detail: t('history.summaryOms') },
              { label: t('history.summaryDiapers'), value: String(diaperCount), detail: t('history.summaryCurrentDay') },
              { label: t('history.summaryMeds'), value: String(medEntries.length), detail: medEntries.map((entry) => entry.payload.name).filter(Boolean).join(', ') || t('history.summaryNone') },
              { label: t('history.summaryMeasurements'), value: String(measureEntries.length), detail: latestMeasure ? getDetail(latestMeasure, t) : t('history.summaryNone') },
            ].map((stat) => (
              <View
                key={stat.label}
                style={{
                  flexBasis: isMobile ? '100%' : '48%',
                  minWidth: isMobile ? 0 : 220,
                  gap: 6,
                  padding: isMobile ? 12 : 14,
                  borderRadius: 12,
                  backgroundColor: BG,
                  borderWidth: 1,
                  borderColor: BORDER,
                }}
              >
                <Text style={{ color: MUTED, fontSize: 12, fontWeight: '600' }}>{stat.label}</Text>
                <Text style={{ color: TEXT, fontSize: isMobile ? 22 : 24, fontWeight: '700' }}>{stat.value}</Text>
                <Text style={{ color: MUTED, fontSize: 13 }}>{stat.detail}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
            {[
              { label: t('history.summaryFrequency'), value: frequencyBadge },
              { label: t('history.summaryAvgMl'), value: `${avgMlPerFeed} ml` },
              { label: t('history.summaryFirstFeed'), value: firstFeed ? formatTime(firstFeed.occurredAt) : '--' },
            ].map((badge) => (
              <View key={badge.label} style={{ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: BG, borderWidth: 1, borderColor: BORDER }}>
                <Text style={{ color: MUTED, fontSize: 11, fontWeight: '600' }}>{badge.label}</Text>
                <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700' }}>{badge.value}</Text>
              </View>
            ))}
          </View>
        </Card>
    </>
  );

  const historyMain = (
    <>
        <Card style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <Heading eyebrow={t('history.panelEyebrow')} title={t('history.panelTitle')} subtitle={t('history.panelBody')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[
              { key: 'status', label: t('history.toggleTodayStatus'), on: showTodayStatus, onPress: () => setShowTodayStatus((v) => !v) },
              { key: 'insights', label: t('history.toggleInsights'), on: showInsights, onPress: () => setShowInsights((v) => !v) },
              { key: 'groups', label: t('history.toggleBands'), on: showTimeGroups, onPress: () => setShowTimeGroups((v) => !v) },
            ].map((item) => (
              <Pressable
                key={item.key}
                onPress={item.onPress}
                accessibilityRole="switch"
                accessibilityState={{ checked: item.on }}
                accessibilityLabel={item.label}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 12, paddingVertical: 8,
                  borderRadius: 999, borderWidth: 1,
                  borderColor: item.on ? GOLD : BORDER,
                  backgroundColor: item.on ? `${GOLD}1A` : (pressed ? BORDER : BG),
                })}
              >
                <Ionicons
                  name={item.on ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={item.on ? GOLD : MUTED}
                />
                <Text style={{ color: item.on ? GOLD : TEXT, fontSize: 12, fontWeight: '700' }}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {showTodayStatus ? (
          <Card style={{ backgroundColor: CARD, borderColor: BORDER }}>
            <Heading eyebrow={t('history.todayStatusEyebrow')} title={t('history.todayStatusTitle')} subtitle={t('history.todayStatusSubtitle')} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {[
                { label: t('history.feeds'), value: String(dayFeedCount) },
                { label: t('history.totalSleep'), value: `${sleepMinutes} min` },
                { label: t('history.lastFeed'), value: dayFeedEntries[0] ? formatTime(dayFeedEntries[0].occurredAt) : '--' },
              ].map((kpi) => (
                <View key={kpi.label} style={{ flexBasis: isMobile ? '100%' : '31%', borderWidth: 1, borderColor: BORDER, borderRadius: 12, backgroundColor: BG, padding: 12, gap: 4 }}>
                  <Text style={{ color: MUTED, fontSize: 12 }}>{kpi.label}</Text>
                  <Text style={{ color: TEXT, fontSize: 22, fontWeight: '700' }}>{kpi.value}</Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {showInsights ? (
          <Card style={{ backgroundColor: CARD, borderColor: BORDER }}>
            <Heading eyebrow={t('history.insightsEyebrow')} title={t('history.insightsTitle')} subtitle={t('history.insightsSubtitle')} />
            <View style={{ gap: 8 }}>
              <View style={{ borderRadius: 10, borderWidth: 1, borderColor: BORDER, backgroundColor: BG, padding: 10 }}>
                <Text style={{ color: TEXT, fontSize: 13 }}>{format('history.feedsVsYesterday', { delta: feedDeltaStr })}</Text>
              </View>
              <View style={{ borderRadius: 10, borderWidth: 1, borderColor: BORDER, backgroundColor: BG, padding: 10 }}>
                <Text style={{ color: TEXT, fontSize: 13 }}>{format('history.longestFast', { hours: longestFeedGapHours ?? '--' })}</Text>
              </View>
            </View>
          </Card>
        ) : null}

        <Card style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <Heading eyebrow={t('history.weightEyebrow')} title={t('history.weightTitle')} subtitle={t('history.weightSubtitle')} />
          <WeightChart points={weightPoints} bandRows={weightBandRows.length ? weightBandRows : weightPoints.map((point) => ({ label: point.label, p25: point.value - 0.3, p75: point.value + 0.3 }))} />
        </Card>

        <Card style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <Heading
            eyebrow={t('history.omsEyebrow')}
            title={t('history.omsTitle')}
            subtitle={format('history.omsBabyAge', {
              name: profile?.babyName ?? t('history.defaultBabyName'),
              months: age.months,
              days: age.days,
            })}
          />
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {(['female', 'male'] as const).map((value) => (
              <Pressable
                key={value}
                onPress={() => setOmsSex(value)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: omsSex === value ? GOLD : BORDER,
                  backgroundColor: omsSex === value ? `${GOLD}22` : BG,
                }}
              >
                <Text style={{ color: omsSex === value ? GOLD : TEXT, fontWeight: '700' }}>{value === 'female' ? t('history.omsFemale') : t('history.omsMale')}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ gap: 12 }}>
            <OmsMetricCard label={t('history.omsWeight')} value={latestWeight} unit="kg" band={weightBand} />
            <OmsMetricCard label={t('history.omsHeight')} value={latestHeight} unit="cm" band={heightBand} />
            <OmsMetricCard label={t('history.omsHead')} value={latestHeadCirc} unit="cm" band={headBand} />
            <OmsMetricCard label={t('history.omsBmi')} value={bmi} unit="" band={bmiBand} />
          </View>
          <View style={{ marginTop: 6, gap: 8 }}>
            <Text style={{ color: MUTED, fontSize: 12 }}>{t('history.omsTableInfo')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: isMobile ? 620 : 700, gap: 4 }}>
                <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                  <Text style={{ width: 70, color: MUTED, fontWeight: '700', fontSize: 12 }}>{t('history.omsTableAge')}</Text>
                  <Text style={{ width: 180, color: MUTED, fontWeight: '700', fontSize: 12 }}>{t('history.omsTableWeight')}</Text>
                  <Text style={{ width: 180, color: MUTED, fontWeight: '700', fontSize: 12 }}>{t('history.omsTableHeight')}</Text>
                  <Text style={{ width: 170, color: MUTED, fontWeight: '700', fontSize: 12 }}>{t('history.omsTableHead')}</Text>
                </View>
                {(showOmsTable ? omsBySex[omsSex] : omsBySex[omsSex].slice(0, 5)).map((row) => {
                  const active = row.month === Math.round(age.monthsFloat);
                  return (
                    <View
                      key={row.month}
                      style={{
                        flexDirection: 'row',
                        paddingVertical: 9,
                        borderRadius: 8,
                        backgroundColor: active ? `${GOLD}22` : 'transparent',
                      }}
                    >
                      <Text style={{ width: 70, color: active ? GOLD : TEXT, fontSize: 12, fontWeight: active ? '700' : '500' }}>{row.month}m</Text>
                      <Text style={{ width: 180, color: active ? GOLD : TEXT, fontSize: 12 }}>
                        {format('history.omsTableRowValue', { median: row.weight.p50, min: row.weight.p3, max: row.weight.p97 })}
                      </Text>
                      <Text style={{ width: 180, color: active ? GOLD : TEXT, fontSize: 12 }}>
                        {format('history.omsTableRowValue', { median: row.height.p50, min: row.height.p3, max: row.height.p97 })}
                      </Text>
                      <Text style={{ width: 170, color: active ? GOLD : TEXT, fontSize: 12 }}>
                        {format('history.omsTableRowHead', { median: row.headCirc.p50 })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
            <Pressable
              onPress={() => setShowOmsTable((current) => !current)}
              style={{
                alignSelf: 'flex-start',
                borderWidth: 1,
                borderColor: BORDER,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: BG,
              }}
            >
              <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700' }}>
                {showOmsTable ? t('history.omsHideTable') : t('history.omsShowTable')}
              </Text>
            </Pressable>
          </View>
        </Card>

        <FoodHistoryCard entries={entries} showSeeAll={false} />

        {unifiedTimeline.length ? (
          unifiedTimeline.map(([day, items]) => {
            const dayDate = new Date(day);
            const todayKey = dateKey(new Date());
            const yesterdayKey = dateKey(subtractDays(new Date(), 1));
            const dayLabel = day === todayKey
              ? t('history.today')
              : day === yesterdayKey
                ? t('history.yesterday')
                : formatLongDate(day);
            const dayMeta = day === todayKey || day === yesterdayKey
              ? new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short' }).format(dayDate)
              : null;
            return (
              <Card key={day} style={{ backgroundColor: CARD, borderColor: BORDER }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                  <Text style={{ color: TEXT, fontSize: 18, fontWeight: '700' }}>{dayLabel}</Text>
                  {dayMeta ? <Text style={{ color: MUTED, fontSize: 12, fontWeight: '500' }}>· {dayMeta}</Text> : null}
                  <View style={{ flex: 1 }} />
                  <Text style={{ color: MUTED, fontSize: 11, fontWeight: '600' }}>{items.length}</Text>
                </View>
                <View style={{ gap: 8 }}>
                  {items.map((entry, idx) => {
                    const expanded = expandedId === entry.id;
                    const hour = new Date(entry.occurredAt).getHours();
                    const slot = hour < 12 ? t('history.slotMorning') : hour < 18 ? t('history.slotAfternoon') : t('history.slotEvening');
                    const prev = items[idx - 1];
                    const prevHour = prev ? new Date(prev.occurredAt).getHours() : null;
                    const prevSlot =
                      prevHour === null
                        ? null
                        : prevHour < 12
                        ? t('history.slotMorning')
                        : prevHour < 18
                        ? t('history.slotAfternoon')
                        : t('history.slotEvening');
                    const showSlot = showTimeGroups && slot !== prevSlot;
                    return (
                      <Animated.View
                        key={entry.id}
                        entering={FadeInDown.duration(220).delay(Math.min(idx * 30, 240))}
                        layout={LinearTransition.springify().damping(18)}
                      >
                        {showSlot ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: idx === 0 ? 0 : 6, marginBottom: 6 }}>
                            <Text style={{ color: GOLD, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }}>{slot}</Text>
                            <View style={{ flex: 1, height: 1, backgroundColor: BORDER }} />
                          </View>
                        ) : null}
                        <HistoryEntryRow
                          entry={entry}
                          expanded={expanded}
                          detail={getDetail(entry, t)}
                          typeLabel={getTypeLabel(entry.type, t)}
                          timeLabel={formatTime(entry.occurredAt)}
                          tint={iconColor(entry.type)}
                          tokens={rowTokens}
                          hasNotes={Boolean(entry.notes)}
                          editLabel={t('common.edit')}
                          deleteLabel={t('common.delete')}
                          noNoteLabel={t('history.noNote')}
                          onToggle={(id) => setExpandedId((current) => (current === id ? null : id))}
                          onEdit={(e) => router.push({ pathname: '/entry/[type]', params: { type: e.type, id: e.id } })}
                          onDelete={handleDeleteEntry}
                          scrollViewRef={historyScrollRef}
                        />
                      </Animated.View>
                    );
                  })}
                </View>
              </Card>
            );
          })
        ) : (
          <EmptyState
            icon="time-outline"
            title={t('history.emptyTitle')}
            body={t('history.emptyBody')}
            action={<Button label={t('history.addEntry')} onPress={() => router.push('/entry/feed')} />}
          />
        )}
    </>
  );

  const undoBar =
    undoEntry ? (
      <Animated.View
        entering={FadeInDown.duration(220)}
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 16,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: CARD,
          borderWidth: 1,
          borderColor: BORDER,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: `${RED}1A` }}>
          <Ionicons name="trash-outline" size={16} color={RED} />
        </View>
        <Text style={{ color: TEXT, flex: 1, fontSize: 13, fontWeight: '600' }}>{t('history.entryDeleted')}</Text>
        <Button label={t('history.undo')} onPress={handleUndoDelete} variant="secondary" fullWidth={false} />
      </Animated.View>
    ) : null;

  const bottomNavHeight = 60 + insets.bottom;

  return (
    <View style={{ flex: 1 }}>
      <Page
        scroll={!isWideWeb}
        contentStyle={[{ width: '100%' }, isWideWeb && { flex: 1 }]}
        refreshControl={
          !isWideWeb ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onPullToRefresh}
              tintColor={GOLD}
              colors={[GOLD]}
            />
          ) : undefined
        }
      >
        {isWideWeb ? (
          <View style={{ flex: 1, flexDirection: 'row', gap: 16, minHeight: 0, position: 'relative' }}>
            <ScrollView
              style={{ width: 400, flexShrink: 0 }}
              contentContainerStyle={{ gap: 18, paddingBottom: 24 }}
              showsVerticalScrollIndicator
            >
              {historySidebar}
            </ScrollView>
            <GestureScrollView ref={historyScrollRef} style={{ flex: 1, minWidth: 0 }} contentContainerStyle={{ gap: 18, paddingBottom: 24 }} showsVerticalScrollIndicator>
              {historyMain}
            </GestureScrollView>
            {undoBar}
          </View>
        ) : (
          <View style={{ gap: 14, position: 'relative', paddingBottom: bottomNavHeight }}>
            {historySidebar}
            {historyMain}
            {undoBar}
          </View>
        )}
      </Page>

      {/* Sticky bottom day navigation — mobile only, thumb-reachable */}
      {!isWideWeb && (
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40,
          backgroundColor: CARD,
          borderTopWidth: 1, borderTopColor: BORDER,
          paddingBottom: insets.bottom,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', height: 60, paddingHorizontal: 16, gap: 10 }}>
            <Pressable
              onPress={() => setSelectedDate((current) => subtractDays(current, 1))}
              accessibilityRole="button"
              accessibilityLabel={t('history.prevDay')}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 48, height: 48, borderRadius: 24,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: pressed ? BORDER : BG,
                borderWidth: 1, borderColor: BORDER,
              })}
            >
              <Ionicons name="chevron-back" size={22} color={TEXT} />
            </Pressable>

            <View style={{ flex: 1, alignItems: 'center' }}>
              {dayRelativeLabel ? (
                <Text style={{ color: GOLD, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  {dayRelativeLabel}
                </Text>
              ) : null}
              <Text style={{ color: TEXT, fontSize: 14, fontWeight: '700', textAlign: 'center' }} numberOfLines={1}>
                {new Intl.DateTimeFormat(intlLocale, { weekday: 'short', day: 'numeric', month: 'short' }).format(selectedDate)}
              </Text>
            </View>

            <Pressable
              onPress={() => setSelectedDate(startOfDay(new Date()))}
              accessibilityRole="button"
              accessibilityLabel={t('history.today')}
              disabled={isOnToday}
              hitSlop={8}
              style={({ pressed }) => ({
                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
                borderWidth: 1, borderColor: isOnToday ? `${GOLD}88` : BORDER,
                backgroundColor: isOnToday ? `${GOLD}1A` : (pressed ? BORDER : BG),
                opacity: isOnToday ? 0.55 : 1,
              })}
            >
              <Ionicons name="today-outline" size={16} color={isOnToday ? GOLD : TEXT} />
            </Pressable>

            <Pressable
              onPress={() => setSelectedDate((current) => subtractDays(current, -1))}
              accessibilityRole="button"
              accessibilityLabel={t('history.nextDay')}
              disabled={isOnToday}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 48, height: 48, borderRadius: 24,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: pressed ? BORDER : BG,
                borderWidth: 1, borderColor: BORDER,
                opacity: isOnToday ? 0.35 : 1,
              })}
            >
              <Ionicons name="chevron-forward" size={22} color={TEXT} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
