import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Share, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, EmptyState, Heading, Page } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { EntryRecord, EntryType } from '@/types';
import { generateWeeklyPdf } from '@/lib/pdf';
import { useResponsiveMetrics } from '@/lib/responsive';
import { dateKey, formatLongDate, formatTime, isSameDay, startOfDay, subtractDays, toDate } from '@/utils/date';
import { getOmsRow, interpolatePercentileBand, omsBySex, type OmsSex } from '@/lib/omsData';

const BG = '#0D1117';
const CARD = '#161B22';
const BORDER = '#21262D';
const GOLD = '#C9A227';
const GREEN = '#B88A2A';
const BLUE = '#58A6FF';
const RED = '#E74C3C';
const PURPLE = '#A371F7';
const TEXT = '#F0F6FC';
const MUTED = '#8B949E';

const COPY = {
  en: {
    report: 'REPORT',
    day: 'DAY',
    weight: 'WEIGHT',
    oms: 'OMS',
    history: 'History',
    subtitle: 'Browse, filter, and export entries by day.',
    overview: 'Daily history and OMS',
    overviewSub: 'Daily summary, growth charts, unified timeline, and doctor export.',
    daySummary: 'Day Summary',
    daySub: 'Smart daily summary with deltas and reference points.',
    weightTrend: 'Weight Trend Chart',
    weightSub: 'Baby curve plus OMS median band.',
    referenceCard: 'Reference Card',
    showTable: 'Show OMS table',
    hideTable: 'Hide OMS table',
    today: 'Today',
    share: 'Share',
    edit: 'Edit',
    delete: 'Delete',
    addEntry: 'Add entry',
    none: 'No entries yet',
    noneBody: 'Add an entry or change the filter for this day.',
    removed: 'Item removed.',
    undo: 'Undo',
  },
  fr: {
    report: 'RAPPORT',
    day: 'JOUR',
    weight: 'POIDS',
    oms: 'OMS',
    history: 'Historique',
    subtitle: 'Parcourez, filtrez et exportez les entrées par jour.',
    overview: 'Historique quotidien et OMS',
    overviewSub: 'Résumé du jour, courbes de croissance, timeline unifiée et export docteur.',
    daySummary: 'Résumé du jour',
    daySub: 'Résumé intelligent du jour avec deltas et repères.',
    weightTrend: 'Courbe de poids',
    weightSub: 'Courbe réelle bébé + bande OMS médiane.',
    referenceCard: 'Carte de référence',
    showTable: 'Afficher la table OMS',
    hideTable: 'Masquer la table OMS',
    today: "Aujourd'hui",
    share: 'Partager',
    edit: 'Éditer',
    delete: 'Supprimer',
    addEntry: 'Ajouter une entrée',
    none: 'Aucune entrée',
    noneBody: "Aucune entrée ne correspond au filtre pour cette date.",
    removed: 'Élément supprimé.',
    undo: 'Annuler',
  },
  es: {
    report: 'INFORME',
    day: 'DÍA',
    weight: 'PESO',
    oms: 'OMS',
    history: 'Historial',
    subtitle: 'Explora, filtra y exporta entradas por día.',
    overview: 'Historial diario y OMS',
    overviewSub: 'Resumen diario, curvas de crecimiento, línea de tiempo unificada y exportación médica.',
    daySummary: 'Resumen del día',
    daySub: 'Resumen inteligente con deltas y referencias.',
    weightTrend: 'Tendencia de peso',
    weightSub: 'Curva real del bebé + banda mediana OMS.',
    referenceCard: 'Tarjeta de referencia',
    showTable: 'Mostrar tabla OMS',
    hideTable: 'Ocultar tabla OMS',
    today: 'Hoy',
    share: 'Compartir',
    edit: 'Editar',
    delete: 'Eliminar',
    addEntry: 'Agregar entrada',
    none: 'Todavía no hay entradas',
    noneBody: 'Agrega una entrada o cambia el filtro de este día.',
    removed: 'Elemento eliminado.',
    undo: 'Deshacer',
  },
  nl: {
    report: 'RAPPORT',
    day: 'DAG',
    weight: 'GEWICHT',
    oms: 'OMS',
    history: 'Historiek',
    subtitle: 'Blader, filter en exporteer items per dag.',
    overview: 'Daghistoriek en OMS',
    overviewSub: 'Dagoverzicht, groeigrafieken, uniforme tijdlijn en dokters-export.',
    daySummary: 'Dagoverzicht',
    daySub: 'Slim dagoverzicht met verschillen en referenties.',
    weightTrend: 'Gewichtstrend',
    weightSub: 'Babycurve plus OMS-mediënband.',
    referenceCard: 'Referentiekaart',
    showTable: 'OMS-tabel tonen',
    hideTable: 'OMS-tabel verbergen',
    today: 'Vandaag',
    share: 'Delen',
    edit: 'Bewerken',
    delete: 'Verwijderen',
    addEntry: 'Item toevoegen',
    none: 'Nog geen items',
    noneBody: 'Voeg een item toe of wijzig het filter voor deze dag.',
    removed: 'Item verwijderd.',
    undo: 'Ongedaan maken',
  },
} as const;

const FILTERS: Array<{ label: string; value: EntryType | 'all' }> = [
  { label: 'Tout', value: 'all' },
  { label: 'Feed', value: 'feed' },
  { label: 'Food', value: 'food' },
  { label: 'Sleep', value: 'sleep' },
  { label: 'Diaper', value: 'diaper' },
  { label: 'Pump', value: 'pump' },
  { label: 'Meds', value: 'medication' },
  { label: 'Mesure', value: 'measurement' },
  { label: 'Milestone', value: 'milestone' },
  { label: 'Symptome', value: 'symptom' },
];

function iconColor(type: EntryType) {
  if (type === 'feed') return GOLD;
  if (type === 'food') return '#F0B85A';
  if (type === 'sleep') return BLUE;
  if (type === 'diaper') return RED;
  if (type === 'medication') return GREEN;
  if (type === 'measurement') return PURPLE;
  if (type === 'pump') return '#F778BA';
  if (type === 'milestone') return '#FFA657';
  return '#56D364';
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

function percentileStatus(value: number | null | undefined, band: { p3: number; p10: number; p90: number; p97: number }) {
  if (!value) return { label: 'Sans donnees', color: MUTED };
  if (value < band.p3 || value > band.p97) return { label: '⚠ Consulter pediatre', color: RED };
  if (value < band.p10 || value > band.p90) return { label: 'Attention', color: '#F2C86F' };
  return { label: '✓ Normal', color: GREEN };
}

function progressPercent(value: number | null | undefined, min: number, max: number) {
  if (!value || max <= min) return 0;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function WeightChart({
  points,
  bandRows,
}: {
  points: Array<{ label: string; value: number }>;
  bandRows: Array<{ label: string; p25: number; p75: number }>;
}) {
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
}

function OmsMetricCard({
  label,
  value,
  unit,
  band,
}: {
  label: string;
  value: number | null | undefined;
  unit: string;
  band: { p3: number; p10: number; p50: number; p90: number; p97: number };
}) {
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
}

export default function HistoryScreen() {
  const { width } = useWindowDimensions();
  const responsive = useResponsiveMetrics();
  const { entries, deleteEntry, addEntry } = useAppData();
  const { profile } = useAuth();
  const [filter, setFilter] = useState<EntryType | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showOmsTable, setShowOmsTable] = useState(false);
  const [omsSex, setOmsSex] = useState<OmsSex>(profile?.babySex === 'male' ? 'male' : 'female');
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

  const timelineEntries = useMemo(
    () => entries.filter((entry) => filter === 'all' || entry.type === filter).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [entries, filter],
  );
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
      Alert.alert('CSV', 'Export du jour copie dans le presse-papiers.');
      return;
    }
    await Share.share({ message: currentCsv, title: 'AppLeo CSV' });
  }

  async function exportPdf() {
    const pdf = await generateWeeklyPdf(dayEntries);
    Alert.alert('PDF', pdf.summary);
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

  return (
    <Page contentStyle={{ width: '100%' }}>
      <View style={{ gap: responsive.verticalGap + 2 }}>
        <Heading eyebrow="REPORT" title="Historique & OMS" subtitle="Resume quotidien, courbes de croissance, timeline unifiee et export docteur." />

        <Card style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Button
              label="<"
              onPress={() => setSelectedDate((current) => subtractDays(current, 1))}
              variant="ghost"
              fullWidth={false}
              size="sm"
            />
            <Text style={{ color: TEXT, fontSize: 15, fontWeight: '700', textAlign: 'center', flex: 1 }}>
              {new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(selectedDate)}
            </Text>
            <Button
              label=">"
              onPress={() => setSelectedDate((current) => subtractDays(current, -1))}
              variant="ghost"
              fullWidth={false}
              size="sm"
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { label: 'CSV', action: exportCsv, active: false },
              { label: 'PDF', action: exportPdf, active: false },
              { label: 'Partager', action: shareDay, active: false },
              { label: "Aujourd'hui", action: () => setSelectedDate(startOfDay(new Date())), active: true },
            ].map((item) => (
              <Pressable
                key={item.label}
                onPress={item.action}
                  style={{
                    minHeight: 36,
                    paddingHorizontal: 12,
                    borderRadius: 16,
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 6 }}>
            {FILTERS.map((item) => {
              const active = filter === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setFilter(item.value)}
                  style={{
                    minHeight: 34,
                    paddingHorizontal: 12,
                    borderRadius: 16,
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
          <Heading eyebrow="JOUR" title="Day Summary" subtitle="Resume intelligent du jour avec deltas et reperes." />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {[
              { label: 'Prises', value: String(dayFeedCount), detail: `${dayFeedCount - yesterdayFeedCount >= 0 ? '+' : ''}${dayFeedCount - yesterdayFeedCount} vs hier` },
              { label: 'Lait total', value: `${dayBottleMl} ml`, detail: `${profile?.goalFeedingsPerDay ?? 8} prises cible` },
              { label: 'Sommeil total', value: `${sleepMinutes} min`, detail: 'OMS 720-1020 min' },
              { label: 'Couches', value: String(diaperCount), detail: 'Jour courant' },
              { label: 'Medicaments', value: String(medEntries.length), detail: medEntries.map((entry) => entry.payload.name).filter(Boolean).join(', ') || 'Aucun' },
              { label: 'Mesures', value: String(measureEntries.length), detail: latestMeasure ? getDetail(latestMeasure) : 'Aucune' },
            ].map((stat) => (
              <View key={stat.label} style={{ flexBasis: width < 680 ? '100%' : '48%', minWidth: width < 680 ? 0 : 220, gap: 8, padding: 14, borderRadius: 12, backgroundColor: BG, borderWidth: 1, borderColor: BORDER }}>
                <Text style={{ color: MUTED, fontSize: 12, fontWeight: '600' }}>{stat.label}</Text>
                <Text style={{ color: TEXT, fontSize: 24, fontWeight: '700' }}>{stat.value}</Text>
                <Text style={{ color: MUTED, fontSize: 13 }}>{stat.detail}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
            {[
              { label: 'Frequence', value: frequencyBadge },
              { label: 'Moy. ml/prise', value: `${avgMlPerFeed} ml` },
              { label: 'Premiere prise', value: firstFeed ? formatTime(firstFeed.occurredAt) : '--' },
            ].map((badge) => (
              <View key={badge.label} style={{ width: width < 680 ? '100%' : undefined, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: BG, borderWidth: 1, borderColor: BORDER }}>
                <Text style={{ color: MUTED, fontSize: 11, fontWeight: '600' }}>{badge.label}</Text>
                <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700' }}>{badge.value}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <Heading eyebrow="POIDS" title="Weight Trend Chart" subtitle="Courbe reelle bebe + bande OMS mediane." />
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
        </Card>

        <Card style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <Pressable onPress={() => setShowOmsTable((current) => !current)} style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: GOLD, fontSize: 16, fontWeight: '700' }}>{showOmsTable ? 'Masquer la table OMS' : 'Afficher la table OMS'}</Text>
          </Pressable>
          {showOmsTable ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 900, gap: 6 }}>
                <View style={{ flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                  {['Age', 'Poids P3/P50/P97', 'Taille P3/P50/P97', 'PC P50'].map((header) => (
                    <Text key={header} style={{ width: 210, color: MUTED, fontWeight: '700' }}>
                      {header}
                    </Text>
                  ))}
                </View>
                {omsBySex[omsSex].map((row) => {
                  const active = row.month === Math.round(age.monthsFloat);
                  return (
                    <View
                      key={row.month}
                      style={{
                        flexDirection: 'row',
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: active ? `${GOLD}22` : 'transparent',
                      }}
                    >
                      <Text style={{ width: 210, color: active ? GOLD : TEXT }}>{row.month} mois</Text>
                      <Text style={{ width: 210, color: active ? GOLD : TEXT }}>{row.weight.p3} / {row.weight.p50} / {row.weight.p97}</Text>
                      <Text style={{ width: 210, color: active ? GOLD : TEXT }}>{row.height.p3} / {row.height.p50} / {row.height.p97}</Text>
                      <Text style={{ width: 210, color: active ? GOLD : TEXT }}>{row.headCirc.p50}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          ) : null}
        </Card>

        {unifiedTimeline.length ? (
          unifiedTimeline.map(([day, items]) => (
            <Card key={day} style={{ backgroundColor: CARD, borderColor: BORDER }}>
              <Text style={{ color: TEXT, fontSize: 18, fontWeight: '700' }}>{formatLongDate(day)}</Text>
              <View style={{ gap: 10 }}>
                {items.map((entry) => {
                  const expanded = expandedId === entry.id;
                  return (
                    <Pressable
                      key={entry.id}
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
                      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                        <View style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: iconColor(entry.type) }} />
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={{ color: TEXT, fontSize: 15, fontWeight: '700' }}>{entry.type.toUpperCase()}</Text>
                          <Text style={{ color: MUTED, fontSize: 13 }}>{getDetail(entry)}</Text>
                        </View>
                        <Text style={{ color: TEXT, fontSize: 14, fontWeight: '600' }}>{formatTime(entry.occurredAt)}</Text>
                      </View>
                      {expanded ? (
                        <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10 }}>
                          <Text style={{ color: MUTED, fontSize: 13 }}>{entry.notes || 'Sans note'}</Text>
                          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                            <Button label="Editer" onPress={() => router.push({ pathname: '/entry/[type]', params: { type: entry.type, id: entry.id } })} variant="secondary" fullWidth={false} />
                            <Button label="Supprimer" onPress={() => handleDeleteEntry(entry)} variant="danger" fullWidth={false} />
                          </View>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          ))
        ) : (
          <EmptyState title="Aucune entree" body="Aucune entree ne correspond au filtre pour cette date." action={<Button label="Ajouter une entree" onPress={() => router.push('/entry/feed')} />} />
        )}

        {undoEntry ? (
          <View
            style={{
              position: 'absolute',
              left: responsive.horizontalPadding,
              right: responsive.horizontalPadding,
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
        ) : null}
      </View>
    </Page>
  );
}
