import React, { useState } from 'react';
import { View, Text, TextInput, Platform } from 'react-native';
import { alertInfo } from '@/utils/confirm';
import { spacing, radii } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { typography } from '@/typography';
import { Button, Card, SectionHeader } from '@/components/shared';
import { parseImportData } from '@/services/importExport';
import { useAppData } from '@/context/AppDataContext';
import { EntryType, EntryPayload } from '@/types';

// ─── Tipos internos del importador ───────────────────────────────────────────

interface NormalizedEntry {
  /** ID del JSON de origen para detectar duplicados */
  externalId?: string;
  type: EntryType;
  occurredAt: string;
  notes?: string;
  payload: EntryPayload;
}

interface ValidationIssue {
  source: string;
  index: number;
  field: string;
  message: string;
}

interface ImportPreview {
  newEntries: NormalizedEntry[];
  duplicates: NormalizedEntry[];
  byType: Record<string, number>;
  issues: ValidationIssue[];
}

// ─── Helpers de validación ────────────────────────────────────────────────────

function isValidISO(v: any): v is string {
  if (typeof v !== 'string' || !v) return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
}

function isNonNegNumber(v: any): v is number {
  return typeof v === 'number' && isFinite(v) && v >= 0;
}

function isPositiveNumber(v: any): v is number {
  return typeof v === 'number' && isFinite(v) && v > 0;
}

// ─── Capa de mapeo JSON → modelo interno ─────────────────────────────────────

/**
 * Transforma un reporte JSON al formato interno de EntryRecord.
 * Cada sección del JSON (feeds, meds, measurements, etc.) se mapea
 * a los campos reales que usa addEntry() en AppDataContext.
 */
function mapReportToEntries(data: any): { entries: NormalizedEntry[]; issues: ValidationIssue[] } {
  const entries: NormalizedEntry[] = [];
  const issues: ValidationIssue[] = [];

  // ── feeds → type: 'feed' ──────────────────────────────────────────────────
  // feed.amountMl         → payload.amountMl
  // feed.dateISO          → occurredAt
  // feed.source           → payload.mode ('bottle' | 'breast')
  // feed.durationSec      → payload.durationMin (÷ 60)
  // feed.bottleStart/End  → payload.durationMin (si durationSec no viene)
  const feeds = Array.isArray(data.feeds) ? data.feeds : [];
  feeds.forEach((item: any, i: number) => {
    if (!isValidISO(item.dateISO)) {
      issues.push({ source: 'feeds', index: i, field: 'dateISO', message: 'Invalid or missing date' });
      return;
    }
    const amountMl = Number(item.amountMl);
    if (!isNonNegNumber(amountMl)) {
      issues.push({ source: 'feeds', index: i, field: 'amountMl', message: 'Expected a non-negative number' });
      return;
    }
    let durationMin: number | undefined;
    if (typeof item.durationSec === 'number' && item.durationSec > 0) {
      durationMin = Math.round(item.durationSec / 60) || undefined;
    } else if (isValidISO(item.bottleStartISO) && isValidISO(item.bottleEndISO)) {
      const diffMs = new Date(item.bottleEndISO).getTime() - new Date(item.bottleStartISO).getTime();
      if (diffMs > 0) durationMin = Math.round(diffMs / 60000) || undefined;
    }
    const mode = item.source === 'breast' ? 'breast' : 'bottle';
    entries.push({
      externalId: item.id != null ? String(item.id) : undefined,
      type: 'feed',
      occurredAt: item.dateISO,
      notes: item.notes,
      payload: { mode, amountMl, ...(durationMin ? { durationMin } : {}) },
    });
  });

  // ── elims / diapers → type: 'diaper' ─────────────────────────────────────
  // elim.dateISO  → occurredAt
  // elim.pee      → payload.pee
  // elim.poop     → payload.poop
  // elim.vomit    → payload.vomit
  // elim.kind     → derivar pee/poop si no vienen explícitos
  const elims: any[] = Array.isArray(data.elims)
    ? data.elims
    : Array.isArray(data.diapers)
    ? data.diapers
    : [];
  elims.forEach((item: any, i: number) => {
    if (!isValidISO(item.dateISO)) {
      issues.push({ source: 'elims', index: i, field: 'dateISO', message: 'Invalid or missing date' });
      return;
    }
    const kind = String(item.kind || '').toLowerCase();
    entries.push({
      externalId: item.id != null ? String(item.id) : undefined,
      type: 'diaper',
      occurredAt: item.dateISO,
      notes: item.notes,
      payload: {
        pee: Number(item.pee) || (kind.includes('pee') || kind.includes('wet') ? 1 : 0),
        poop: Number(item.poop) || (kind.includes('poo') || kind.includes('stool') ? 1 : 0),
        vomit: Number(item.vomit) || 0,
      },
    });
  });

  // ── sleepSessions → type: 'sleep' ─────────────────────────────────────────
  // sleep.durationSec → payload.durationMin (÷ 60)
  // sleep.dateISO / startISO → occurredAt
  const sleeps: any[] = Array.isArray(data.sleepSessions)
    ? data.sleepSessions
    : Array.isArray(data.sleeps)
    ? data.sleeps
    : [];
  sleeps.forEach((item: any, i: number) => {
    const dateStr = item.dateISO || item.startISO;
    if (!isValidISO(dateStr)) {
      issues.push({ source: 'sleepSessions', index: i, field: 'dateISO', message: 'Invalid or missing date' });
      return;
    }
    entries.push({
      externalId: item.id != null ? String(item.id) : undefined,
      type: 'sleep',
      occurredAt: dateStr,
      notes: item.notes,
      payload: { durationMin: Math.max(0, Math.round((Number(item.durationSec) || 0) / 60)) },
    });
  });

  // ── pumpSessions → type: 'pump' ───────────────────────────────────────────
  // pump.amountMl    → payload.amountMl
  // pump.durationSec → payload.durationMin (÷ 60)
  // pump.dateISO     → occurredAt
  const pumps = Array.isArray(data.pumpSessions) ? data.pumpSessions : [];
  pumps.forEach((item: any, i: number) => {
    if (!isValidISO(item.dateISO)) {
      issues.push({ source: 'pumpSessions', index: i, field: 'dateISO', message: 'Invalid or missing date' });
      return;
    }
    const durationMin = Math.max(0, Math.round((Number(item.durationSec) || 0) / 60));
    const amountMl = isNonNegNumber(Number(item.amountMl)) ? Number(item.amountMl) : undefined;
    entries.push({
      externalId: item.id != null ? String(item.id) : undefined,
      type: 'pump',
      occurredAt: item.dateISO,
      notes: item.notes,
      payload: { durationMin, ...(amountMl != null ? { amountMl } : {}) },
    });
  });

  // ── meds → type: 'medication' ─────────────────────────────────────────────
  // med.name / med.medKey → payload.name
  // med.dosage            → payload.dosage
  // med.dateISO           → occurredAt
  const meds: any[] = Array.isArray(data.meds)
    ? data.meds
    : Array.isArray(data.medications)
    ? data.medications
    : [];
  meds.forEach((item: any, i: number) => {
    if (!isValidISO(item.dateISO)) {
      issues.push({ source: 'meds', index: i, field: 'dateISO', message: 'Invalid or missing date' });
      return;
    }
    const name = String(item.name || item.medKey || '').trim();
    if (!name) {
      issues.push({ source: 'meds', index: i, field: 'name', message: 'Missing medication name' });
      return;
    }
    entries.push({
      externalId: item.id != null ? String(item.id) : undefined,
      type: 'medication',
      occurredAt: item.dateISO,
      notes: item.notes,
      payload: { name, ...(item.dosage ? { dosage: String(item.dosage) } : {}) },
    });
  });

  // ── measurements → type: 'measurement' o 'temperature' ───────────────────
  // Si tiene weight/height → 'measurement'  payload.weightKg / payload.heightCm
  // Si tiene temp          → 'temperature'  payload.tempC
  // Un measurement con ambos genera dos entries separados.
  const measurements = Array.isArray(data.measurements) ? data.measurements : [];
  measurements.forEach((item: any, i: number) => {
    if (!isValidISO(item.dateISO)) {
      issues.push({ source: 'measurements', index: i, field: 'dateISO', message: 'Invalid or missing date' });
      return;
    }
    const hasWeight = isPositiveNumber(item.weight);
    const hasHeight = isPositiveNumber(item.height);
    const hasHeadCirc = isPositiveNumber(item.headCircCm);
    const hasTemp = isPositiveNumber(item.temp);

    if (hasWeight || hasHeight || hasHeadCirc) {
      entries.push({
        externalId: item.id != null ? String(item.id) : undefined,
        type: 'measurement',
        occurredAt: item.dateISO,
        notes: item.notes,
        payload: {
          ...(hasWeight ? { weightKg: item.weight } : {}),
          ...(hasHeight ? { heightCm: item.height } : {}),
          ...(hasHeadCirc ? { headCircCm: item.headCircCm } : {}),
        },
      });
    }

    if (hasTemp) {
      entries.push({
        // Sufijo _temp para que no colisione si el mismo measurement ya tiene weight
        externalId: item.id != null ? `${item.id}_temp` : undefined,
        type: 'temperature',
        occurredAt: item.dateISO,
        notes: item.notes,
        payload: { tempC: item.temp },
      });
    }

    if (!hasWeight && !hasHeight && !hasHeadCirc && !hasTemp) {
      issues.push({ source: 'measurements', index: i, field: '*', message: 'No recognized values (weight, height, temp)' });
    }
  });

  // ── entries[] nativos (ya en formato interno de la app) ───────────────────
  const VALID_TYPES = new Set(['feed', 'food', 'sleep', 'diaper', 'pump', 'measurement', 'medication', 'milestone', 'symptom', 'temperature', 'vaccine']);
  const reportEntries = Array.isArray(data.entries) ? data.entries : [];
  reportEntries.forEach((item: any, i: number) => {
    if (!VALID_TYPES.has(item.type)) return;
    if (!isValidISO(item.occurredAt)) {
      issues.push({ source: 'entries', index: i, field: 'occurredAt', message: 'Invalid or missing date' });
      return;
    }
    entries.push({
      externalId: item.id ? String(item.id) : undefined,
      type: item.type as EntryType,
      occurredAt: item.occurredAt,
      notes: item.notes,
      payload: item.payload ?? {},
    });
  });

  return { entries, issues };
}

// ─── Parsear CSV simple ───────────────────────────────────────────────────────

function parseCsvRows(input: string): any {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return {};
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    return headers.reduce((acc, key, idx) => {
      acc[key] = cols[idx] ?? '';
      return acc;
    }, {} as Record<string, string>);
  });
  if (headers.includes('amountml')) {
    return {
      feeds: rows.map((r) => ({
        amountMl: Number(r.amountml) || 0,
        dateISO: r.dateiso || r.date || '',
        durationSec: Number(r.durationsec) || 0,
        source: r.source || 'bottle',
        id: r.id,
      })),
    };
  }
  return { entries: rows };
}

// ─── Labels para la UI ────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  feed: '🍼 Feeds',
  sleep: '😴 Sleep',
  diaper: '🩱 Diapers',
  pump: '🪣 Pump',
  medication: '💊 Medications',
  measurement: '📏 Measurements',
  temperature: '🌡️ Temperatures',
  food: '🥣 Food',
  vaccine: '💉 Vaccines',
  milestone: '🌟 Milestones',
  symptom: '🤒 Symptoms',
};

// ─── Componente ───────────────────────────────────────────────────────────────

export interface DataImporterProps {
  onImportStart?: () => void;
  onImportComplete?: (count: number, errors: string[]) => void;
  onError?: (error: Error) => void;
}

export function DataImporter({ onImportStart, onImportComplete, onError }: DataImporterProps) {
  const { theme, colors } = useTheme();
  const { t, format } = useTranslation();
  const { addEntry, entries: existingEntries } = useAppData();

  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [rawInput, setRawInput] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; dupes: number; errors: number } | null>(null);

  // Construir el preview a partir del texto raw
  const buildPreview = (raw: string): ImportPreview => {
    const trimmed = raw.trim();
    const parsed =
      trimmed.startsWith('{') || trimmed.startsWith('[')
        ? parseImportData(trimmed)
        : parseCsvRows(trimmed);

    const { entries: normalized, issues } = mapReportToEntries(parsed);

    if (!normalized.length && !issues.length) {
      throw new Error('No recognized data found in this file. Check that the JSON contains feeds, meds, measurements, sleepSessions, pumpSessions or elims.');
    }

    // Detectar duplicados: por id externo o por type+occurredAt exacto
    const existingIds = new Set(existingEntries.map((e) => e.id));
    const existingKeys = new Set(existingEntries.map((e) => `${e.type}|${e.occurredAt}`));

    const newEntries: NormalizedEntry[] = [];
    const duplicates: NormalizedEntry[] = [];

    for (const entry of normalized) {
      const dupeById = entry.externalId != null && existingIds.has(entry.externalId);
      const dupeByKey = existingKeys.has(`${entry.type}|${entry.occurredAt}`);
      if (dupeById || dupeByKey) {
        duplicates.push(entry);
      } else {
        newEntries.push(entry);
      }
    }

    const byType = newEntries.reduce<Record<string, number>>((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {});

    return { newEntries, duplicates, byType, issues };
  };

  const handleParse = (raw: string) => {
    try {
      setPreview(buildPreview(raw));
      setImportResult(null);
    } catch (err: any) {
      alertInfo(t('dataIO.parseErrorTitle'), err?.message ?? t('dataIO.invalidFormat'));
      onError?.(err);
    }
  };

  const handleImportFromFile = () => {
    if (Platform.OS !== 'web') {
      alertInfo(t('dataIO.importFromFileTitle'), t('dataIO.importWebOnly'));
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv,application/json,text/csv';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const content = await file.text();
        setRawInput(content);
        handleParse(content);
      } catch (err: any) {
        alertInfo(t('dataIO.fileReadErrorTitle'), err?.message ?? t('dataIO.fileReadError'));
        onError?.(err);
      }
    };
    input.click();
  };

  const handleConfirmImport = async () => {
    if (!preview?.newEntries.length) {
      alertInfo(t('dataIO.nothingToImportTitle'), t('dataIO.nothingToImportMsg'));
      return;
    }

    setImporting(true);
    onImportStart?.();

    let success = 0;
    let errorCount = 0;
    const errorMessages: string[] = [];

    for (const entry of preview.newEntries) {
      try {
        await addEntry({
          type: entry.type,
          occurredAt: entry.occurredAt,
          notes: entry.notes,
          payload: entry.payload,
        });
        success++;
      } catch (err: any) {
        errorCount++;
        errorMessages.push(`${entry.type} @ ${entry.occurredAt}: ${err?.message ?? 'unknown error'}`);
      }
    }

    setImportResult({ success, dupes: preview.duplicates.length, errors: errorCount });
    setPreview(null);
    setRawInput('');
    setShowInput(false);
    setImporting(false);
    onImportComplete?.(success, errorMessages);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Card>
      <SectionHeader title={t('dataIO.importTitle')} />
      <Text style={[typography.body, { color: colors.muted, marginBottom: spacing.md }]}>
        {t('dataIO.importSubtitle')}
      </Text>

      {/* Estado final: resumen de lo que se importó */}
      {importResult ? (
        <View style={{ gap: spacing.sm }}>
          <View
            style={{
              backgroundColor: `${colors.primary}15`,
              borderColor: colors.primary,
              borderWidth: 1,
              borderRadius: radii.lg,
              padding: spacing.md,
              gap: 4,
            }}
          >
            <Text style={[typography.body, { color: theme.textPrimary, fontWeight: '700', marginBottom: 4 }]}>
              {t('dataIO.importComplete')}
            </Text>
            <Text style={[typography.body, { color: theme.textPrimary }]}>{format('dataIO.importedCount', { count: importResult.success })}</Text>
            {importResult.dupes > 0 && (
              <Text style={[typography.body, { color: colors.muted }]}>
                {format('dataIO.importSkippedCount', { count: importResult.dupes })}
              </Text>
            )}
            {importResult.errors > 0 && (
              <Text style={[typography.body, { color: colors.danger }]}>
                {format('dataIO.importErrorsCount', { count: importResult.errors })}
              </Text>
            )}
          </View>
          <Button label={t('dataIO.importAnother')} onPress={() => setImportResult(null)} variant="secondary" />
        </View>
      ) : preview ? (
        // Estado intermedio: preview con breakdown por tipo
        <View style={{ gap: spacing.md }}>
          <View
            style={{
              backgroundColor: `${theme.accent}11`,
              borderColor: theme.accent,
              borderWidth: 1,
              borderRadius: radii.lg,
              padding: spacing.md,
              gap: 4,
            }}
          >
            <Text style={[typography.body, { color: theme.textPrimary, fontWeight: '700', marginBottom: 2 }]}>
              {format('dataIO.importPreviewCount', { count: preview.newEntries.length })}
            </Text>
            {Object.entries(preview.byType).map(([type, count]) => (
              <Text key={type} style={[typography.body, { color: theme.textPrimary }]}>
                {TYPE_LABELS[type] ?? type}: {count}
              </Text>
            ))}
            {preview.duplicates.length > 0 && (
              <Text style={[typography.detail, { color: colors.muted, marginTop: 4 }]}>
                {format('dataIO.importDupesSkipped', { count: preview.duplicates.length })}
              </Text>
            )}
          </View>

          {/* Errores de validación */}
          {preview.issues.length > 0 && (
            <View
              style={{
                backgroundColor: `${colors.danger}11`,
                borderColor: colors.danger,
                borderWidth: 1,
                borderRadius: radii.md,
                padding: spacing.sm,
                gap: 2,
              }}
            >
              <Text style={[typography.detail, { color: colors.danger, fontWeight: '700', marginBottom: 2 }]}>
                {format('dataIO.importValidationErrors', { count: preview.issues.length })}
              </Text>
              {preview.issues.slice(0, 5).map((issue, idx) => (
                <Text key={idx} style={[typography.detail, { color: colors.danger }]}>
                  {issue.source}[{issue.index}].{issue.field}: {issue.message}
                </Text>
              ))}
              {preview.issues.length > 5 && (
                <Text style={[typography.detail, { color: colors.muted }]}>
                  {format('dataIO.importAndMore', { count: preview.issues.length - 5 })}
                </Text>
              )}
            </View>
          )}

          <Button
            label={importing ? t('dataIO.importingBtn') : format('dataIO.importConfirmBtn', { count: preview.newEntries.length })}
            onPress={handleConfirmImport}
            loading={importing}
            disabled={importing || preview.newEntries.length === 0}
          />
          <Button
            label={t('common.cancel')}
            onPress={() => { setPreview(null); setRawInput(''); }}
            variant="ghost"
            disabled={importing}
          />
        </View>
      ) : showInput ? (
        // Estado: campo de texto para pegar datos
        <View style={{ gap: spacing.md }}>
          <Text style={[typography.detail, { color: colors.muted }]}>{t('dataIO.pasteDataLabel')}</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: radii.md,
              padding: spacing.md,
              minHeight: 140,
              color: theme.textPrimary,
              backgroundColor: theme.bgCardAlt,
              fontFamily: 'Courier New',
              fontSize: 12,
            }}
            placeholder={t('dataIO.pastePlaceholder')}
            placeholderTextColor={theme.textMuted}
            value={rawInput}
            onChangeText={setRawInput}
            multiline
          />
          <Button label={t('dataIO.previewImportBtn')} onPress={() => handleParse(rawInput)} disabled={!rawInput.trim()} />
          <Button
            label={t('common.cancel')}
            onPress={() => { setRawInput(''); setShowInput(false); }}
            variant="ghost"
          />
        </View>
      ) : (
        // Estado inicial: botones de entrada
        <View style={{ gap: spacing.sm }}>
          <Button label={t('dataIO.importFromFileBtn')} onPress={handleImportFromFile} variant="secondary" />
          <Button label={t('dataIO.pasteJsonCsvBtn')} onPress={() => setShowInput(true)} variant="secondary" />
        </View>
      )}
    </Card>
  );
}
