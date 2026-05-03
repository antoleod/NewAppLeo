import React, { useState } from 'react';
import { View, Text, Alert, TextInput, Platform } from 'react-native';
import { spacing, radii } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { typography } from '@/typography';
import { Button, Card, SectionHeader } from '@/components/ui';
import { parseImportData, ImportValidator } from '@/lib/importExport';
import { useAppData } from '@/context/AppDataContext';

export interface DataImporterProps {
  onImportStart?: () => void;
  onImportComplete?: (count: number, errors: string[]) => void;
  onError?: (error: Error) => void;
}

export function DataImporter({ onImportStart, onImportComplete, onError }: DataImporterProps) {
  const { theme, colors } = useTheme();
  const { addEntry, deleteEntry, entries } = useAppData();
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [importedData, setImportedData] = useState<any[]>([]);
  const [stagedData, setStagedData] = useState<any[]>([]);
  const [rawInput, setRawInput] = useState('');
  const [showInput, setShowInput] = useState(false);

  function parseCsvRows(input: string) {
    const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.trim());
      return headers.reduce((acc, key, index) => {
        acc[key] = cols[index] ?? '';
        return acc;
      }, {} as Record<string, string>);
    });
  }

  function normalizeImportedEntries(data: any) {
    const feeds = Array.isArray(data.feeds) ? data.feeds : [];
    const diapers = Array.isArray(data.diapers) ? data.diapers : [];
    const sleeps = Array.isArray(data.sleeps) ? data.sleeps : Array.isArray(data.sleepSessions) ? data.sleepSessions : [];
    const elims = Array.isArray(data.diapers) ? data.diapers : Array.isArray(data.elims) ? data.elims : [];
    const reportEntries = Array.isArray(data.entries) ? data.entries : [];
    const normalized: Array<{ type: 'feed' | 'diaper' | 'sleep'; occurredAt?: string; notes?: string; payload: any }> = [];

    feeds.forEach((item: any) => normalized.push({ type: 'feed', occurredAt: item.dateISO, notes: item.notes, payload: { mode: 'bottle', amountMl: Number(item.amountMl) || 0 } }));
    elims.forEach((item: any) => {
      const kind = String(item.kind || '').toLowerCase();
      normalized.push({
        type: 'diaper',
        occurredAt: item.dateISO,
        notes: item.notes,
        payload: {
          pee: Number(item.pee) || (kind.includes('pee') ? 1 : 0),
          poop: Number(item.poop) || (kind.includes('poo') ? 1 : 0),
          vomit: Number(item.vomit) || 0,
        },
      });
    });
    sleeps.forEach((item: any) => normalized.push({ type: 'sleep', occurredAt: item.dateISO || item.startISO, notes: item.notes, payload: { durationMin: Math.max(0, Math.round((Number(item.durationSec) || 0) / 60)) } }));
    reportEntries.forEach((item: any) => {
      if (item?.type === 'feed' || item?.type === 'diaper' || item?.type === 'sleep') {
        normalized.push({ type: item.type, occurredAt: item.occurredAt, notes: item.notes, payload: item.payload || {} });
      }
    });

    return normalized;
  }

  const parseRawDataToPreview = (raw: string) => {
    const trimmed = raw.trim();
    const parsed = trimmed.startsWith('{') || trimmed.startsWith('[') ? parseImportData(trimmed) : { entries: parseCsvRows(trimmed) };
    const entries = normalizeImportedEntries(parsed);
    if (!entries.length) throw new Error('No compatible entries found.');
    const summary = ImportValidator.getImportSummary(entries as any[]);
    setImportedData(entries);
    setStagedData([]);
    setPreview(`Detected: ${summary.total} entries (${summary.feeds} feeds, ${summary.diapers} diapers, ${summary.sleeps} sleeps)`);
  };

  const handleParseInput = async () => {
    try {
      if (!rawInput.trim()) return Alert.alert('Error', 'Please paste JSON or CSV data');
      parseRawDataToPreview(rawInput);
    } catch (error: any) {
      Alert.alert('Parse error', error.message || 'Invalid data format');
      onError?.(error);
    }
  };

  const handleImportFromFile = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Not available on this platform', 'Use "Paste JSON/CSV Data" on mobile for now.');
      return;
    }
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.csv,application/json,text/csv';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const content = await file.text();
        setRawInput(content);
        parseRawDataToPreview(content);
      };
      input.click();
    } catch (error: any) {
      Alert.alert('File import error', error?.message ?? 'Could not read selected file');
      onError?.(error);
    }
  };

  const handleConfirmImport = async () => {
    if (!importedData.length) {
      Alert.alert('Nothing to confirm', 'No data available to stage.');
      return;
    }
    setStagedData(importedData);
    Alert.alert('Staged', `${importedData.length} entries staged. Tap "Import to database".`);
  };

  const handleImportToDatabase = async () => {
    try {
      setImporting(true);
      onImportStart?.();
      if (!stagedData.length) {
        Alert.alert('Nothing staged', 'Confirm import first to stage data.');
        return;
      }

      const keyOf = (type: string, occurredAt: string | undefined, payload: any) =>
        `${type}|${occurredAt ?? ''}|${JSON.stringify(payload ?? {})}`;

      const stagedKeys = new Set(stagedData.map((entry) => keyOf(entry.type, entry.occurredAt, entry.payload)));

      // Remove old duplicates so the newest imported version remains visible.
      for (const existing of entries) {
        const key = keyOf(existing.type, existing.occurredAt, existing.payload);
        if (stagedKeys.has(key)) {
          await deleteEntry(existing.id);
        }
      }

      for (const entry of stagedData) {
        await addEntry({ type: entry.type, occurredAt: entry.occurredAt, notes: entry.notes, payload: entry.payload });
      }
      const count = stagedData.length;
      setImportedData([]); setStagedData([]); setPreview(null); setRawInput(''); setShowInput(false);
      onImportComplete?.(count, []);
      Alert.alert('Import complete', `${count} entries imported successfully.`);
    } catch (error: any) {
      Alert.alert('Import error', error.message || 'Could not import data');
      onError?.(error);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <SectionHeader title="Import Data" />
      <Text style={[typography.body, { color: colors.muted, marginBottom: spacing.md }]}>Import JSON reports or CSV exported from Excel.</Text>
      <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
        <Button label="Import from file (.json/.csv)" onPress={handleImportFromFile} variant="secondary" disabled={importing} />
      </View>

      {preview ? (
        <View style={{ gap: spacing.md }}>
          <View style={{ backgroundColor: `${theme.accent}11`, borderColor: theme.accent, borderWidth: 1, borderRadius: radii.lg, padding: spacing.md }}>
            <Text style={[typography.body, { color: theme.textPrimary, fontWeight: '600' }]}>{preview}</Text>
          </View>
          <Button label={importing ? 'Importing...' : 'Confirm Import'} onPress={handleConfirmImport} loading={importing} disabled={importing} />
          <Button label={importing ? 'Importing...' : 'Import to database'} onPress={handleImportToDatabase} disabled={importing || !stagedData.length} />
          <Button label="Cancel" onPress={() => { setPreview(null); setImportedData([]); }} variant="ghost" disabled={importing} />
        </View>
      ) : showInput ? (
        <View style={{ gap: spacing.md }}>
          <Text style={[typography.detail, { color: colors.muted }]}>Paste JSON or CSV:</Text>
          <TextInput style={{ borderWidth: 1, borderColor: theme.border, borderRadius: radii.md, padding: spacing.md, minHeight: 140, color: theme.textPrimary, backgroundColor: theme.bgCardAlt, fontFamily: 'Courier New', fontSize: 12 }} placeholder="Paste here..." placeholderTextColor={theme.textMuted} value={rawInput} onChangeText={setRawInput} multiline editable={!importing} />
          <Button label="Preview Import" onPress={handleParseInput} disabled={importing || !rawInput.trim()} />
          <Button label="Cancel" onPress={() => { setRawInput(''); setShowInput(false); }} variant="ghost" disabled={importing} />
        </View>
      ) : (
        <Button label="Paste JSON/CSV Data" onPress={() => setShowInput(true)} variant="secondary" disabled={importing} />
      )}
    </Card>
  );
}
