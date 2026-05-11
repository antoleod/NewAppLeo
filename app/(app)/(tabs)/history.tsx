import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Button, Card, EmptyState, Heading, Page } from '@/components/shared';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { EntryRecord, EntryType } from '@/types';
import { generateWeeklyPdf } from '@/lib/pdf';
import { dateKey, formatLongDate, formatTime, isSameDay, startOfDay, subtractDays, toDate } from '@/utils/date';
import { getOmsRow, interpolatePercentileBand, omsBySex, type OmsSex } from '@/lib/omsData';
import { useWideWeb } from '@/hooks/useWideWeb';
import { useToast } from '@/components/shared';
import { useLocale } from '@/context/LocaleContext';

function getFilters(language: string): Array<{ label: string; value: EntryType | 'all' }> {
  if (language === 'es') return [
    { label: 'Todo', value: 'all' }, { label: 'Leche', value: 'feed' }, { label: 'Comida', value: 'food' }, { label: 'Sueño', value: 'sleep' },
    { label: 'Pañal', value: 'diaper' }, { label: 'Bomba', value: 'pump' }, { label: 'Meds', value: 'medication' }, { label: 'Medidas', value: 'measurement' },
    { label: 'Hito', value: 'milestone' }, { label: 'Síntoma', value: 'symptom' },
  ];
  if (language === 'en') return [
    { label: 'All', value: 'all' }, { label: 'Feed', value: 'feed' }, { label: 'Food', value: 'food' }, { label: 'Sleep', value: 'sleep' },
    { label: 'Diaper', value: 'diaper' }, { label: 'Pump', value: 'pump' }, { label: 'Meds', value: 'medication' }, { label: 'Measure', value: 'measurement' },
    { label: 'Milestone', value: 'milestone' }, { label: 'Symptom', value: 'symptom' },
  ];
  if (language === 'nl') return [
    { label: 'Alles', value: 'all' }, { label: 'Voeding', value: 'feed' }, { label: 'Eten', value: 'food' }, { label: 'Slaap', value: 'sleep' },
    { label: 'Luier', value: 'diaper' }, { label: 'Kolf', value: 'pump' }, { label: 'Meds', value: 'medication' }, { label: 'Meting', value: 'measurement' },
    { label: 'Mijlpaal', value: 'milestone' }, { label: 'Symptoom', value: 'symptom' },
  ];
  return [
    { label: 'Tout', value: 'all' }, { label: 'Feed', value: 'feed' }, { label: 'Food', value: 'food' }, { label: 'Sleep', value: 'sleep' },
    { label: 'Diaper', value: 'diaper' }, { label: 'Pump', value: 'pump' }, { label: 'Meds', value: 'medication' }, { label: 'Mesure', value: 'measurement' },
    { label: 'Milestone', value: 'milestone' }, { label: 'Symptome', value: 'symptom' },
  ];
}

function getDetail(entry: EntryRecord) {
  switch (entry.type) {
    case 'feed':
      return entry.payload.mode === 'bottle'
        ? `${entry.payload.amountMl ?? 0} ml`
        : `${entry.payload.durationMin ?? 0} min · ${entry.payload.side ?? 'left'}`;
    case 'food':
      return [entry.payload.foodName, entry.payload.quantity].filter(Boolean).join(' · ') || 'Food';
    case 'sleep':
      return `${entry.payload.durationMin ?? 0} min`;
    case 'diaper':
      return `P ${entry.payload.pee ?? 0} · C ${entry.payload.poop ?? 0} · V ${entry.payload.vomit ?? 0}`;
    case 'pump':
      return `${entry.payload.amountMl ?? 0} ml · ${entry.payload.durationMin ?? 0} min`;
    case 'measurement':
      return [
        entry.payload?.weightKg ? `${entry.payload.weightKg} kg` : null,
        entry.payload?.heightCm ? `${entry.payload.heightCm} cm` : null,
        (entry.payload as any)?.headCircCm ? `${(entry.payload as any).headCircCm} cm PC` : null,
      ]
        .filter(Boolean)
        .join(' · ');
    case 'medication':
      return [entry.payload.name, entry.payload.dosage].filter(Boolean).join(' · ');
    case 'milestone':
      return entry.payload.title ?? entry.title;
    case 'symptom':
      return entry.payload.tags?.join(', ') ?? entry.notes ?? 'Symptome';
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

function buildCsv(entries: EntryRecord[]) {
  return [
    'id,type,title,timestamp,detail,notes',
    ...entries.map((entry) =>
      [entry.id, entry.type, entry.title, entry.occurredAt, getDetail(entry), entry.notes ?? '']
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    ),
  ].join('\n');
}

function progressPercent(value: number | null | undefined, min: number, max: number) {
  if (!value || max <= min) return 0;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

export default function HistoryScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { isWideWeb } = useWideWeb();
  const { language, t: tLocale } = useLocale();
  const FILTERS = useMemo(() => getFilters(language), [language]);
  const { entries, deleteEntry, addEntry } = useAppData();
  const { profile } = useAuth();
  const { theme } = useTheme();
  const toast = useToast();

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
    if (!value) return { label: 'Sans donnees', color: MUTED };
    if (value < band.p3 || value > band.p97) return { label: '⚠ Consulter pediatre', color: RED };
    if (value < band.p10 || value > band.p90) return { label: 'Attention', color: '#F2C86F' };
    return { label: '✓ Normal', color: GREEN };
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
    points: Array<{ label: string; value: number }>;
    bandRows: Array<{ label: string; p25: number; p75: number }>;
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
      return <Text style={{ color: MUTED, textAlign: 'center' }}>Aucune courbe de poids disponible.</Text>;
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
  const didAutoSelectLatest = useRef(false);

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

  const timelineEntries = useMemo(() => {
    const filtered = entries
      .filter((entry) => filter === 'all' || entry.type === filter)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    if (!searchQuery) return filtered;
    return filtered.filter((entry) => {
      const haystack = [
        entry.title,
        entry.notes,
        entry.type,
        getDetail(entry),
        entry.payload?.foodName,
        entry.payload?.name,
        ...(entry.payload?.tags ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(searchQuery);
    });
  }, [entries, filter, searchQuery]);
  const unifiedTimeline = useMemo(() => groupByDay(timelineEntries), [timelineEntries]);
  const yesterdayEntries = useMemo(
    () => entries.filter((entry) => isSameDay(entry.occurredAt, subtractDays(selectedDate, 1))),
    [entries, selectedDate],
  );

  const currentCsv = useMemo(() => buildCsv(dayEntries), [dayEntries]);
  const dayFeedEntries = dayEntries.filter((entry) => entry.type === 'feed');
  const dayFeedCount = dayFeedEntries.length;
  const yesterdayFeedCount = yesterdayEntries.filter((entry) => entry.type === 'feed').length;
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
    label: new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(entry.occurredAt)),
    value: Number(entry.payload.weightKg ?? 0),
  }));

  const weightBandRows = weightEntries.map((entry) => {
    const pointAge = monthsAndDaysSince(profile?.babyBirthDate);
    const row = getOmsRow(sex, pointAge.monthsFloat);
    const band = interpolatePercentileBand(row.weight.p3, row.weight.p15, row.weight.p50, row.weight.p85, row.weight.p97);
    return {
      label: new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(entry.occurredAt)),
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
      toast.success('Export du jour copie dans le presse-papiers.');
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

  const historySidebar = (
    <>
        <Heading eyebrow={tLocale('history.eyebrow')} title={tLocale('history.title')} align="left" />

        <Card style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Button
              label="<"
              onPress={() => setSelectedDate((current) => subtractDays(current, 1))}
              variant="ghost"
              fullWidth={false}
              size="sm"
            />
            <Text style={{ color: TEXT, fontSize: 18, fontWeight: '700', textAlign: 'center', flex: 1 }}>
              {new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : language === 'en' ? 'en-US' : language === 'nl' ? 'nl-NL' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(selectedDate)}
            </Text>
            <Button
              label=">"
              onPress={() => setSelectedDate((current) => subtractDays(current, -1))}
              variant="ghost"
              fullWidth={false}
              size="sm"
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { label: 'CSV', action: exportCsv, active: false },
              { label: 'PDF', action: exportPdf, active: false },
              { label: language === 'es' ? 'Compartir' : language === 'en' ? 'Share' : language === 'nl' ? 'Delen' : 'Partager', action: shareDay, active: false },
              { label: language === 'es' ? 'Hoy' : language === 'en' ? 'Today' : language === 'nl' ? 'Vandaag' : "Aujourd'hui", action: () => setSelectedDate(startOfDay(new Date())), active: true },
            ].map((item) => (
              <Pressable
                key={item.label}
                onPress={item.action}
                style={{
                  minHeight: 42,
                  paddingHorizontal: 18,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: item.active ? GOLD : BORDER,
                  backgroundColor: item.active ? `${GOLD}22` : BG,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: item.active ? GOLD : TEXT, fontWeight: '700', textAlign: 'center' }}>{item.label}</Text>
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
              placeholder={language === 'es' ? 'Buscar (notas, tipo, alimento...)' : language === 'en' ? 'Search (notes, type, food...)' : language === 'nl' ? 'Zoeken (notities, type, voeding...)' : 'Rechercher (notes, type, aliment...)'}
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
                accessibilityLabel={language === 'es' ? 'Borrar búsqueda' : language === 'en' ? 'Clear search' : language === 'nl' ? 'Zoeken wissen' : 'Effacer la recherche'}
              >
                <Ionicons name="close-circle" size={18} color={MUTED} />
              </Pressable>
            ) : null}
          </View>
          {searchQuery && timelineEntries.length === 0 ? (
            <Text style={{ color: MUTED, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>
              {language === 'es' ? `Sin resultados para "${searchInput}"` : language === 'en' ? `No results for "${searchInput}"` : language === 'nl' ? `Geen resultaten voor "${searchInput}"` : `Aucun resultat pour "${searchInput}"`}
            </Text>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 6 }}>
            {FILTERS.map((item) => {
              const active = filter === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setFilter(item.value)}
                  style={{
                    minHeight: 40,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: active ? GOLD : BORDER,
                    backgroundColor: active ? GOLD : BG,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: active ? BG : TEXT, fontWeight: '700', textAlign: 'center' }}>{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Card>

        <Card style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <Heading eyebrow="JOUR" title="Day Summary" subtitle="Resume du jour." />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[
              { label: 'Prises', value: String(dayFeedCount), detail: `${dayFeedCount - yesterdayFeedCount >= 0 ? '+' : ''}${dayFeedCount - yesterdayFeedCount} vs hier` },
              { label: 'Lait total', value: `${dayBottleMl} ml`, detail: `${profile?.goalFeedingsPerDay ?? 8} prises cible` },
              { label: 'Sommeil total', value: `${sleepMinutes} min`, detail: 'OMS 720-1020 min' },
              { label: 'Couches', value: String(diaperCount), detail: 'Jour courant' },
              { label: 'Medicaments', value: String(medEntries.length), detail: medEntries.map((entry) => entry.payload.name).filter(Boolean).join(', ') || 'Aucun' },
              { label: 'Mesures', value: String(measureEntries.length), detail: latestMeasure ? getDetail(latestMeasure) : 'Aucune' },
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
              { label: 'Frequence', value: frequencyBadge },
              { label: 'Moy. ml/prise', value: `${avgMlPerFeed} ml` },
              { label: 'Premiere prise', value: firstFeed ? formatTime(firstFeed.occurredAt) : '--' },
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
          <Heading eyebrow="VISTA" title="Panel" subtitle="Activa u oculta bloques." />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[
              { key: 'status', label: showTodayStatus ? 'Ocultar estado' : 'Mostrar estado', onPress: () => setShowTodayStatus((v) => !v) },
              { key: 'insights', label: showInsights ? 'Ocultar insights' : 'Mostrar insights', onPress: () => setShowInsights((v) => !v) },
              { key: 'groups', label: showTimeGroups ? 'Ocultar franjas' : 'Mostrar franjas', onPress: () => setShowTimeGroups((v) => !v) },
            ].map((item) => (
              <Pressable key={item.key} onPress={item.onPress} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: BORDER, backgroundColor: BG }}>
                <Text style={{ color: TEXT, fontSize: 12, fontWeight: '700' }}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {showTodayStatus ? (
          <Card style={{ backgroundColor: CARD, borderColor: BORDER }}>
            <Heading eyebrow="HOY" title="Estado de hoy" subtitle="Resumen rapido." />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {[
                { label: 'Comidas', value: String(dayFeedCount) },
                { label: 'Sueno total', value: `${sleepMinutes} min` },
                { label: 'Ultima toma', value: dayFeedEntries[0] ? formatTime(dayFeedEntries[0].occurredAt) : '--' },
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
            <Heading eyebrow="INSIGHTS" title="Insights automáticos" subtitle="Lectura rapida del dia." />
            <View style={{ gap: 8 }}>
              <View style={{ borderRadius: 10, borderWidth: 1, borderColor: BORDER, backgroundColor: BG, padding: 10 }}>
                <Text style={{ color: TEXT, fontSize: 13 }}>{`Tomas: ${dayFeedCount - yesterdayFeedCount >= 0 ? '+' : ''}${dayFeedCount - yesterdayFeedCount} vs ayer.`}</Text>
              </View>
              <View style={{ borderRadius: 10, borderWidth: 1, borderColor: BORDER, backgroundColor: BG, padding: 10 }}>
                <Text style={{ color: TEXT, fontSize: 13 }}>{`Ventana mas larga sin comer: ${longestFeedGapHours ?? '--'} h.`}</Text>
              </View>
            </View>
          </Card>
        ) : null}

        <Card style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <Heading eyebrow="POIDS" title="Weight Trend Chart" subtitle="Courbe bebe + repere OMS." />
          <WeightChart points={weightPoints} bandRows={weightBandRows.length ? weightBandRows : weightPoints.map((point) => ({ label: point.label, p25: point.value - 0.3, p75: point.value + 0.3 }))} />
        </Card>

        <Card style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <Heading eyebrow="OMS" title="Reference Card" subtitle={`${profile?.babyName ?? 'Bebe'} · ${age.months} mois ${age.days} jours`} />
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
                <Text style={{ color: omsSex === value ? GOLD : TEXT, fontWeight: '700' }}>{value === 'female' ? 'Fille' : 'Garcon'}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ gap: 12 }}>
            <OmsMetricCard label="Poids" value={latestWeight} unit="kg" band={weightBand} />
            <OmsMetricCard label="Taille" value={latestHeight} unit="cm" band={heightBand} />
            <OmsMetricCard label="Perimetre cranien" value={latestHeadCirc} unit="cm" band={headBand} />
            <OmsMetricCard label="IMC" value={bmi} unit="" band={bmiBand} />
          </View>
          <View style={{ marginTop: 6, gap: 8 }}>
            <Text style={{ color: MUTED, fontSize: 12 }}>
              Tabla OMS: P50 es el valor medio; el rango P3-P97 es el rango esperado.
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: isMobile ? 620 : 700, gap: 4 }}>
                <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                  <Text style={{ width: 70, color: MUTED, fontWeight: '700', fontSize: 12 }}>Edad</Text>
                  <Text style={{ width: 180, color: MUTED, fontWeight: '700', fontSize: 12 }}>Peso (kg)</Text>
                  <Text style={{ width: 180, color: MUTED, fontWeight: '700', fontSize: 12 }}>Talla (cm)</Text>
                  <Text style={{ width: 170, color: MUTED, fontWeight: '700', fontSize: 12 }}>Perim. craneal (cm)</Text>
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
                        Medio: {row.weight.p50} | Rango: {row.weight.p3}-{row.weight.p97}
                      </Text>
                      <Text style={{ width: 180, color: active ? GOLD : TEXT, fontSize: 12 }}>
                        Medio: {row.height.p50} | Rango: {row.height.p3}-{row.height.p97}
                      </Text>
                      <Text style={{ width: 170, color: active ? GOLD : TEXT, fontSize: 12 }}>Medio: {row.headCirc.p50}</Text>
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
                {showOmsTable ? 'Ocultar tabla OMS' : 'Ver tabla OMS completa'}
              </Text>
            </Pressable>
          </View>
        </Card>

        {unifiedTimeline.length ? (
          unifiedTimeline.map(([day, items]) => (
            <Card key={day} style={{ backgroundColor: CARD, borderColor: BORDER }}>
              <Text style={{ color: TEXT, fontSize: 18, fontWeight: '700' }}>{formatLongDate(day)}</Text>
              <View style={{ gap: 10 }}>
                {items.map((entry, idx) => {
                  const expanded = expandedId === entry.id;
                  const hour = new Date(entry.occurredAt).getHours();
                  const slot = hour < 12 ? 'Manana' : hour < 18 ? 'Tarde' : 'Noche';
                  const prev = items[idx - 1];
                  const prevHour = prev ? new Date(prev.occurredAt).getHours() : null;
                  const prevSlot = prevHour === null ? null : prevHour < 12 ? 'Manana' : prevHour < 18 ? 'Tarde' : 'Noche';
                  const showSlot = showTimeGroups && slot !== prevSlot;
                  return (
                    <Animated.View
                      key={entry.id}
                      entering={FadeInDown.duration(220).delay(Math.min(idx * 30, 240))}
                      layout={LinearTransition.springify().damping(18)}
                    >
                    {showSlot ? (
                      <Text style={{ color: GOLD, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>{slot}</Text>
                    ) : null}
                    <Pressable
                      onPress={() => setExpandedId((current) => (current === entry.id ? null : entry.id))}
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: BORDER,
                        backgroundColor: BG,
                        gap: 10,
                      }}
                    >
                      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                        <View style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: iconColor(entry.type) }} />
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={{ color: TEXT, fontSize: 14, fontWeight: '700' }}>{entry.type.toUpperCase()}</Text>
                          <Text style={{ color: MUTED, fontSize: 13 }}>{getDetail(entry)}</Text>
                        </View>
                        <Text style={{ color: TEXT, fontSize: 13, fontWeight: '600' }}>{formatTime(entry.occurredAt)}</Text>
                      </View>
                      {expanded ? (
                        <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10 }}>
                          <Text style={{ color: MUTED, fontSize: 13 }}>{entry.notes || 'Sans note'}</Text>
                          <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 10, justifyContent: 'flex-end' }}>
                            <Button label="Editer" onPress={() => router.push({ pathname: '/entry/[type]', params: { type: entry.type, id: entry.id } })} variant="secondary" fullWidth={isMobile} />
                            <Button label="Supprimer" onPress={() => handleDeleteEntry(entry)} variant="danger" fullWidth={isMobile} />
                          </View>
                        </View>
                      ) : null}
                    </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            </Card>
          ))
        ) : (
          <EmptyState
            icon="time-outline"
            title="Aucune entree"
            body="Aucune entree ne correspond au filtre pour cette date."
            action={<Button label="Ajouter une entree" onPress={() => router.push('/entry/feed')} />}
          />
        )}
    </>
  );

  const undoBar =
    undoEntry ? (
      <View
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
        <Text style={{ color: TEXT, flex: 1, fontSize: 13, fontWeight: '600' }}>Element supprime.</Text>
        <Button label="Annuler" onPress={handleUndoDelete} variant="secondary" fullWidth={false} />
      </View>
    ) : null;

  return (
    <Page scroll={!isWideWeb} contentStyle={[{ width: '100%' }, isWideWeb && { flex: 1 }]}>
      {isWideWeb ? (
        <View style={{ flex: 1, flexDirection: 'row', gap: 16, minHeight: 0, position: 'relative' }}>
          <ScrollView
            style={{ width: 400, flexShrink: 0 }}
            contentContainerStyle={{ gap: 18, paddingBottom: 24 }}
            showsVerticalScrollIndicator
          >
            {historySidebar}
          </ScrollView>
          <ScrollView style={{ flex: 1, minWidth: 0 }} contentContainerStyle={{ gap: 18, paddingBottom: 24 }} showsVerticalScrollIndicator>
            {historyMain}
          </ScrollView>
          {undoBar}
        </View>
      ) : (
        <View style={{ gap: 14, position: 'relative' }}>
          {historySidebar}
          {historyMain}
          {undoBar}
        </View>
      )}
    </Page>
  );
}
