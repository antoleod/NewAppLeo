import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  TextInput,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { spacing, radii } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { typography } from '@/typography';
import {
  Button,
  Card,
  SectionHeader,
} from '@/components/ui';
import {
  parseImportData,
  importJsonData,
  ImportValidator,
} from '@/lib/importExport';

export interface DataImporterProps {
  onImportStart?: () => void;
  onImportComplete?: (count: number, errors: string[]) => void;
  onError?: (error: Error) => void;
}

export function DataImporter({
  onImportStart,
  onImportComplete,
  onError,
}: DataImporterProps) {
  const { theme, colors } = useTheme();
  const { width } = useWindowDimensions();
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [importedData, setImportedData] = useState<any[]>([]);
  const [jsonInput, setJsonInput] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleParseJson = async () => {
    try {
      if (!jsonInput.trim()) {
        Alert.alert('Error', 'Please paste JSON data');
        return;
      }

      const data = parseImportData(jsonInput);
      const entries = importJsonData(data);
      const summary = ImportValidator.getImportSummary(entries);

      setImportedData(entries);
      setPreview(
        `📊 Detected:\n• ${summary.feeds} feedings\n• ${summary.diapers} diapers\n• ${summary.sleeps} sleeps`
      );

      Alert.alert(
        'Import Preview',
        `Found ${summary.total} entries:\n• ${summary.feeds} feedings\n• ${summary.diapers} diapers\n• ${summary.sleeps} sleeps\n\nContinue to import?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            onPress: async () => {
              await handleConfirmImport(entries);
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error parsing JSON', error.message);
      onError?.(error);
    }
  };

  const handleConfirmImport = async (entries: any[]) => {
    try {
      setImporting(true);
      onImportStart?.();

      // Note: This would need proper integration with your app's data context
      // For now, we'll just show a success message
      Alert.alert(
        'Import Success',
        `${entries.length} entries are ready to import.\n\nNote: Full import requires app integration.`,
        [{ text: 'OK' }]
      );

      setImportedData([]);
      setPreview(null);
      setJsonInput('');
      setShowInput(false);
      onImportComplete?.(entries.length, []);
    } catch (error: any) {
      Alert.alert('Import Error', error.message);
      onError?.(error);
    } finally {
      setImporting(false);
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
      <SectionHeader title="📥 Import Data" />
      <Text style={[typography.body, { color: colors.muted, marginBottom: spacing.md }]}>
        Import data from JSON (feeds, diapers, sleeps)
      </Text>

      {preview ? (
        <View style={{ gap: spacing.md }}>
          <View
            style={{
              backgroundColor: `${theme.accent}11`,
              borderColor: theme.accent,
              borderWidth: 1,
              borderRadius: radii.lg,
              padding: spacing.md,
              gap: spacing.sm,
            }}
          >
            <Text style={[typography.body, { color: theme.textPrimary, fontWeight: '600' }]}>
              {preview}
            </Text>
          </View>
          <View style={{ gap: spacing.sm }}>
            <Button
              label={importing ? 'Importing...' : 'Confirm Import'}
              onPress={() => handleConfirmImport(importedData)}
              loading={importing}
              disabled={importing}
            />
            <Button
              label="Cancel"
              onPress={handleClearPreview}
              variant="ghost"
              disabled={importing}
            />
          </View>
        </View>
      ) : showInput ? (
        <View style={{ gap: spacing.md }}>
          <Text style={[typography.detail, { color: colors.muted }]}>
            Paste JSON data below:
          </Text>
          <TextInput
            style={[
              {
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: radii.md,
                padding: spacing.md,
                minHeight: 120,
                color: theme.textPrimary,
                backgroundColor: theme.bgCardAlt,
                fontFamily: 'Courier New',
                fontSize: 11,
              },
            ]}
            placeholder="Paste JSON here..."
            placeholderTextColor={theme.textMuted}
            value={jsonInput}
            onChangeText={setJsonInput}
            multiline
            editable={!importing}
          />
          <View style={{ gap: spacing.sm }}>
            <Button
              label="Parse JSON"
              onPress={handleParseJson}
              disabled={importing || !jsonInput.trim()}
            />
            <Button
              label="Cancel"
              onPress={handleClearPreview}
              variant="ghost"
              disabled={importing}
            />
          </View>
        </View>
      ) : (
        <Button
          label="📋 Paste JSON Data"
          onPress={() => setShowInput(true)}
          variant="secondary"
          disabled={importing}
        />
      )}

      <View
        style={{
          backgroundColor: theme.bgCardAlt,
          borderRadius: radii.md,
          padding: spacing.md,
          marginTop: spacing.md,
          gap: spacing.xs,
        }}
      >
        <Text style={[typography.detail, { color: theme.textPrimary, fontWeight: '600' }]}>
          Supported Formats:
        </Text>
        <Text style={[typography.detail, { color: theme.textMuted, fontSize: 10 }]}>
          {`• Feeds: {"feeds":[{"amountMl":180,"dateISO":"..."}]}`}{'\n'}
          {`• Diapers: {"diapers":[{"kind":"pee","dateISO":"..."}]}`}{'\n'}
          {`• Sleeps: {"sleeps":[{"durationSec":3600,"dateISO":"..."}]}`}
        </Text>
      </View>
    </Card>
  );
}

export function ImportSummary({
  summary,
}: {
  summary: { feeds: number; diapers: number; sleeps: number; total: number };
}) {
  const { theme, colors } = useTheme();

  return (
    <Card>
      <Text style={[typography.sectionTitle, { color: colors.text, marginBottom: spacing.md }]}>
        ✅ Import Summary
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.md,
          justifyContent: 'space-around',
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <Text style={[typography.statValue, { color: theme.accent }]}>
            {summary.feeds}
          </Text>
          <Text style={[typography.statLabel, { color: colors.muted }]}>
            FEEDINGS
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={[typography.statValue, { color: theme.green }]}>
            {summary.diapers}
          </Text>
          <Text style={[typography.statLabel, { color: colors.muted }]}>
            DIAPERS
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={[typography.statValue, { color: theme.blue }]}>
            {summary.sleeps}
          </Text>
          <Text style={[typography.statLabel, { color: colors.muted }]}>
            SLEEPS
          </Text>
        </View>
      </View>
    </Card>
  );
}
