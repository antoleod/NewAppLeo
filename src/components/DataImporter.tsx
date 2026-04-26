import React, { useState } from 'react';
import { Alert, Platform, Text, TextInput, View } from 'react-native';
import { spacing, radii } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useLocale } from '@/context/LocaleContext';
import { typography } from '@/typography';
import { Button, Card, SectionHeader } from '@/components/ui';
import { parseImportData, importJsonData, ImportValidator } from '@/lib/importExport';
import { useAppData } from '@/context/AppDataContext';

export function DataImporter() {
  const { theme, colors } = useTheme();
  const { t } = useLocale();
  const { importEntries } = useAppData();
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [importedData, setImportedData] = useState<any[]>([]);
  const [jsonInput, setJsonInput] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handlePickFile = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          const text = await file.text();
          setJsonInput(text);
          setShowInput(true);
        };
        input.click();
        return;
      }

      Alert.alert(t('settings.import.unavailable_title', 'Unavailable'), t('settings.import.unavailable_body', 'Direct JSON file upload is currently supported on web. On native, paste the JSON manually for now.'));
    } catch (error: any) {
      Alert.alert(t('settings.import.error_title', 'Error'), error?.message ?? t('settings.import.load_failed', 'Failed to load file'));
    }
  };

  const handleConfirmImport = async (entries: any[]) => {
    try {
      setImporting(true);
      const result = await importEntries(entries);
      Alert.alert(t('settings.import.success_title', 'Import Success'), `${result.imported} ${t('settings.import.success_body', 'entries imported and synced to Firebase.')}`);
      setImportedData([]);
      setPreview(null);
      setJsonInput('');
      setShowInput(false);
    } catch (error: any) {
      Alert.alert(t('settings.import.failed_title', 'Import Error'), error?.message ?? t('settings.import.failed_body', 'Import failed'));
    } finally {
      setImporting(false);
    }
  };

  const handleParseJson = async () => {
    try {
      if (!jsonInput.trim()) {
        Alert.alert(t('settings.import.error_title', 'Error'), t('settings.import.add_json', 'Please add JSON data'));
        return;
      }

      const data = parseImportData(jsonInput);
      const entries = importJsonData(data);
      const summary = ImportValidator.getImportSummary(entries);
      setImportedData(entries);
      setPreview(
        `${summary.total} entries detected\n` +
          `Feeds: ${summary.feeds} · Diapers: ${summary.diapers} · Sleeps: ${summary.sleeps}\n` +
          `Pumps: ${summary.pumps} · Measurements: ${summary.measurements}\n` +
          `Medications: ${summary.medications} · Milestones: ${summary.milestones} · Symptoms: ${summary.symptoms}`,
      );

      Alert.alert(t('settings.import.preview_title', 'Import preview'), `${t('settings.import.preview_body', 'Found')} ${summary.total} ${t('settings.import.preview_body_end', 'entries ready to import to your current BabyFlow account and sync scope. Continue?')}`, [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { text: t('settings.import.import_now', 'Import'), onPress: async () => handleConfirmImport(entries) },
      ]);
    } catch (error: any) {
      Alert.alert(t('settings.import.parse_title', 'Error parsing JSON'), error?.message ?? t('settings.import.invalid_json', 'Invalid JSON'));
    }
  };

  const handleClearPreview = () => {
    setPreview(null);
    setImportedData([]);
    setJsonInput('');
    setShowInput(false);
  };

  return (
    <Card>
      <SectionHeader title={t('settings.import.title', 'Import Data')} />
      <Text style={[typography.body, { color: colors.muted, marginBottom: spacing.md, fontSize: 12, lineHeight: 17 }]}>
        {t('settings.import.body', 'Import JSON from Leo or BabyFlow exports. Imported entries are written to the active account and synced to Firebase.')}
      </Text>

      <View style={{ gap: spacing.sm }}>
        <Button label={t('settings.import.upload', 'Upload JSON file')} onPress={handlePickFile} variant="secondary" />
        <Button label={t('settings.import.paste', 'Paste JSON Data')} onPress={() => setShowInput(true)} variant="ghost" />
      </View>

      {preview ? (
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <View style={{ backgroundColor: `${theme.accent}11`, borderColor: theme.accent, borderWidth: 1, borderRadius: radii.lg, padding: spacing.md }}>
            <Text style={[typography.body, { color: theme.textPrimary, fontWeight: '600', lineHeight: 20 }]}>{preview}</Text>
          </View>
          <Button label={importing ? t('settings.import.importing', 'Importing...') : t('settings.import.confirm', 'Confirm Import')} onPress={() => handleConfirmImport(importedData)} loading={importing} disabled={importing} />
          <Button label={t('common.cancel', 'Cancel')} onPress={handleClearPreview} variant="ghost" disabled={importing} />
        </View>
      ) : showInput ? (
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: radii.md,
              padding: spacing.md,
              minHeight: 140,
              color: theme.textPrimary,
              backgroundColor: theme.bgCardAlt,
              fontSize: 12,
            }}
            placeholder={t('settings.import.placeholder', 'Paste JSON here...')}
            placeholderTextColor={theme.textMuted}
            value={jsonInput}
            onChangeText={setJsonInput}
            multiline
            editable={!importing}
          />
          <Button label={t('settings.import.parse', 'Parse JSON')} onPress={handleParseJson} disabled={importing || !jsonInput.trim()} />
          <Button label={t('common.cancel', 'Cancel')} onPress={handleClearPreview} variant="ghost" disabled={importing} />
        </View>
      ) : null}

      <View style={{ backgroundColor: theme.bgCardAlt, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md, gap: spacing.xs }}>
        <Text style={[typography.detail, { color: theme.textPrimary, fontWeight: '600' }]}>{t('settings.import.supported', 'Supported formats:')}</Text>
        <Text style={[typography.detail, { color: theme.textMuted, fontSize: 10, lineHeight: 15 }]}>
          {'• Feeds\n• Diapers / elims\n• Sleeps / sleepSessions\n• Pumps\n• Measurements\n• Medications\n• Milestones\n• Symptoms'}
        </Text>
      </View>
    </Card>
  );
}
