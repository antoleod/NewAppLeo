import React, { useState } from 'react';
import { Alert, Platform, Text, TextInput, View } from 'react-native';
import { spacing, radii } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { typography } from '@/typography';
import { Button, Card, SectionHeader } from '@/components/ui';
import { parseImportData, importJsonData, ImportValidator } from '@/lib/importExport';

export function DataImporter() {
  const { theme, colors } = useTheme();
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
      Alert.alert('Unavailable', 'JSON file upload is currently supported on web.');
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Failed to load file');
    }
  };

  const handleConfirmImport = async (entries: any[]) => {
    try {
      setImporting(true);
      Alert.alert('Import Success', `${entries.length} entries are ready to import.`);
      setImportedData([]);
      setPreview(null);
      setJsonInput('');
      setShowInput(false);
    } catch (error: any) {
      Alert.alert('Import Error', error?.message ?? 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleParseJson = async () => {
    try {
      if (!jsonInput.trim()) {
        Alert.alert('Error', 'Please add JSON data');
        return;
      }

      const data = parseImportData(jsonInput);
      const entries = importJsonData(data);
      const summary = ImportValidator.getImportSummary(entries);
      setImportedData(entries);
      setPreview(`${summary.total} entries detected`);
      Alert.alert('Import preview', `Found ${summary.total} entries. Continue to import?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Import', onPress: async () => handleConfirmImport(entries) },
      ]);
    } catch (error: any) {
      Alert.alert('Error parsing JSON', error?.message ?? 'Invalid JSON');
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
      <SectionHeader title="Import Data" />
      <Text style={[typography.body, { color: colors.muted, marginBottom: spacing.md, fontSize: 12, lineHeight: 17 }]}>
        Import JSON from a file or paste it manually.
      </Text>

      <View style={{ gap: spacing.sm }}>
        <Button label="Upload JSON file" onPress={handlePickFile} variant="secondary" />
        <Button label="Paste JSON Data" onPress={() => setShowInput(true)} variant="ghost" />
      </View>

      {preview ? (
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <View style={{ backgroundColor: `${theme.accent}11`, borderColor: theme.accent, borderWidth: 1, borderRadius: radii.lg, padding: spacing.md }}>
            <Text style={[typography.body, { color: theme.textPrimary, fontWeight: '600' }]}>{preview}</Text>
          </View>
          <Button label={importing ? 'Importing...' : 'Confirm Import'} onPress={() => handleConfirmImport(importedData)} loading={importing} disabled={importing} />
          <Button label="Cancel" onPress={handleClearPreview} variant="ghost" disabled={importing} />
        </View>
      ) : showInput ? (
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: radii.md,
              padding: spacing.md,
              minHeight: 120,
              color: theme.textPrimary,
              backgroundColor: theme.bgCardAlt,
              fontSize: 12,
            }}
            placeholder="Paste JSON here..."
            placeholderTextColor={theme.textMuted}
            value={jsonInput}
            onChangeText={setJsonInput}
            multiline
            editable={!importing}
          />
          <Button label="Parse JSON" onPress={handleParseJson} disabled={importing || !jsonInput.trim()} />
          <Button label="Cancel" onPress={handleClearPreview} variant="ghost" disabled={importing} />
        </View>
      ) : null}

      <View style={{ backgroundColor: theme.bgCardAlt, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md, gap: spacing.xs }}>
        <Text style={[typography.detail, { color: theme.textPrimary, fontWeight: '600' }]}>Supported formats:</Text>
        <Text style={[typography.detail, { color: theme.textMuted, fontSize: 10, lineHeight: 15 }]}>
          {"• Feeds\n• Diapers\n• Sleeps"}
        </Text>
      </View>
    </Card>
  );
}
