import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { spacing, radii } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { typography } from '@/typography';
import { Button, Card, SectionHeader } from '@/components/shared';
import { useAppData } from '@/context/AppDataContext';
import { EntryRecord, EntryType } from '@/types';

type Period = 'all' | 'year' | 'month' | 'week' | 'day';
type ExportFormat = 'json' | 'csv';

const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  feed: 'Lactancia',
  food: 'Comida',
  sleep: 'Sueño',
  diaper: 'Pañal',
  pump: 'Extracción',
  measurement: 'Medidas',
  medication: 'Medicación',
  milestone: 'Hito',
  symptom: 'Síntoma',
  temperature: 'Temperatura',
  vaccine: 'Vacuna',
};

const PERIOD_LABELS: Record<Period, string> = {
  all: 'Todo',
  year: 'Este año',
  month: 'Este mes',
  week: 'Esta semana',
  day: 'Hoy',
};

function getPeriodStart(period: Period): Date | null {
  const now = new Date();
  if (period === 'all') return null;
  if (period === 'day') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === 'week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff);
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (period === 'year') {
    return new Date(now.getFullYear(), 0, 1);
  }
  return null;
}

function filterEntries(entries: EntryRecord[], period: Period, type: EntryType | 'all'): EntryRecord[] {
  const start = getPeriodStart(period);
  return entries.filter((e) => {
    if (type !== 'all' && e.type !== type) return false;
    if (start) {
      const d = new Date(e.occurredAt);
      if (d < start) return false;
    }
    return true;
  });
}

function toCSV(entries: EntryRecord[]): string {
  const headers = ['id', 'type', 'title', 'occurredAt', 'notes', 'payload'];
  const rows = entries.map((e) => [
    e.id,
    e.type,
    `"${(e.title ?? '').replace(/"/g, '""')}"`,
    e.occurredAt,
    `"${(e.notes ?? '').replace(/"/g, '""')}"`,
    `"${JSON.stringify(e.payload).replace(/"/g, '""')}"`,
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function downloadOnWeb(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

function buildFilename(period: Period, type: EntryType | 'all', ext: string): string {
  const date = new Date().toISOString().split('T')[0];
  const typePart = type === 'all' ? 'todo' : type;
  const periodPart = period === 'all' ? 'completo' : period;
  return `leo-datos-${typePart}-${periodPart}-${date}.${ext}`;
}

export function DataExporter() {
  const { theme, colors } = useTheme();
  const { entries } = useAppData();
  const [period, setPeriod] = useState<Period>('month');
  const [entryType, setEntryType] = useState<EntryType | 'all'>('all');
  const [format, setFormat] = useState<ExportFormat>('json');
  const [exporting, setExporting] = useState(false);

  const filtered = filterEntries(entries, period, entryType);

  const handleExport = async () => {
    if (filtered.length === 0) {
      Alert.alert('Sin datos', 'No hay registros para el período y tipo seleccionado.');
      return;
    }

    try {
      setExporting(true);
      const filename = buildFilename(period, entryType, format);

      if (format === 'json') {
        const content = JSON.stringify(
          { exportedAt: new Date().toISOString(), period, type: entryType, count: filtered.length, entries: filtered },
          null,
          2
        );
        if (Platform.OS === 'web') {
          downloadOnWeb(content, filename, 'application/json');
          Alert.alert('Listo', `${filtered.length} registros exportados.`);
        } else {
          Alert.alert('Exportar datos', `${filtered.length} registros\n\nCopia el JSON:\n\n${content.slice(0, 400)}...`);
        }
      } else {
        const content = toCSV(filtered);
        if (Platform.OS === 'web') {
          downloadOnWeb(content, filename, 'text/csv');
          Alert.alert('Listo', `${filtered.length} registros exportados.`);
        } else {
          Alert.alert('Exportar datos', `${filtered.length} registros\n\nCSV:\n\n${content.slice(0, 400)}...`);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'No se pudo exportar.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <SectionHeader title="Exportar datos" />
      <Text style={[typography.body, { color: colors.muted, marginBottom: spacing.md }]}>
        Descarga todos tus registros — lactancia, comida, sueño y más — filtrados por período.
      </Text>

      <Text style={[styles.label, { color: theme.textPrimary }]}>Período</Text>
      <View style={styles.chipRow}>
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <Pressable
            key={p}
            onPress={() => setPeriod(p)}
            style={[styles.chip, { borderColor: period === p ? theme.accent : theme.border, backgroundColor: period === p ? `${theme.accent}22` : theme.bgCardAlt }]}
          >
            <Text style={[styles.chipText, { color: period === p ? theme.accent : theme.textMuted }]}>{PERIOD_LABELS[p]}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: theme.textPrimary }]}>Tipo de registro</Text>
      <View style={styles.chipRow}>
        <Pressable
          key="all"
          onPress={() => setEntryType('all')}
          style={[styles.chip, { borderColor: entryType === 'all' ? theme.accent : theme.border, backgroundColor: entryType === 'all' ? `${theme.accent}22` : theme.bgCardAlt }]}
        >
          <Text style={[styles.chipText, { color: entryType === 'all' ? theme.accent : theme.textMuted }]}>Todos</Text>
        </Pressable>
        {(Object.keys(ENTRY_TYPE_LABELS) as EntryType[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setEntryType(t)}
            style={[styles.chip, { borderColor: entryType === t ? theme.accent : theme.border, backgroundColor: entryType === t ? `${theme.accent}22` : theme.bgCardAlt }]}
          >
            <Text style={[styles.chipText, { color: entryType === t ? theme.accent : theme.textMuted }]}>{ENTRY_TYPE_LABELS[t]}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: theme.textPrimary }]}>Formato</Text>
      <View style={[styles.chipRow, { marginBottom: spacing.md }]}>
        {(['json', 'csv'] as ExportFormat[]).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFormat(f)}
            style={[styles.chip, { borderColor: format === f ? theme.accent : theme.border, backgroundColor: format === f ? `${theme.accent}22` : theme.bgCardAlt }]}
          >
            <Text style={[styles.chipText, { color: format === f ? theme.accent : theme.textMuted }]}>{f.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.summary, { backgroundColor: theme.bgCardAlt, borderColor: theme.border }]}>
        <Text style={[typography.detail, { color: theme.textMuted }]}>
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          {period !== 'all' ? ` · ${PERIOD_LABELS[period].toLowerCase()}` : ''}
          {entryType !== 'all' ? ` · ${ENTRY_TYPE_LABELS[entryType as EntryType]}` : ''}
        </Text>
      </View>

      <Button
        label={exporting ? 'Exportando...' : `Exportar ${filtered.length > 0 ? `(${filtered.length})` : ''}`}
        onPress={handleExport}
        loading={exporting}
        disabled={exporting || filtered.length === 0}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '800', marginTop: spacing.md, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radii.pill, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '700' },
  summary: { borderRadius: radii.md, borderWidth: 1, padding: spacing.sm, marginBottom: spacing.md },
});
