import React, { useState } from 'react';
import { View, Text, Alert, TextInput, Platform } from 'react-native';
import { spacing, radii } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { typography } from '@/typography';
import { Button, Card, SectionHeader } from '@/components/ui';
import { parseImportData } from '@/lib/importExport';

export interface SettingsImporterProps {
  onImportStart?: () => void;
  onImportComplete?: () => void;
  onError?: (error: Error) => void;
}

export interface SettingsExportData {
  version: string;
  exportedAt: string;
  theme?: {
    variant?: string;
    mode?: string;
    style?: string;
    backgroundPhotoUri?: string;
  };
  goals?: {
    feedingsPerDay?: number;
    sleepHoursPerDay?: number;
    diapersPerDay?: number;
  };
  profile?: {
    caregiverName?: string;
    babyName?: string;
    babyBirthDate?: string;
    babySex?: string;
    language?: string;
  };
}

function validateSettingsData(data: any): SettingsExportData | null {
  if (typeof data !== 'object' || !data) return null;

  const settings: SettingsExportData = {
    version: data.version || '1.0',
    exportedAt: data.exportedAt || new Date().toISOString(),
  };

  if (data.theme && typeof data.theme === 'object') {
    settings.theme = {
      variant: data.theme.variant,
      mode: data.theme.mode,
      style: data.theme.style,
      backgroundPhotoUri: data.theme.backgroundPhotoUri,
    };
  }

  if (data.goals && typeof data.goals === 'object') {
    settings.goals = {
      feedingsPerDay: typeof data.goals.feedingsPerDay === 'number' ? data.goals.feedingsPerDay : undefined,
      sleepHoursPerDay: typeof data.goals.sleepHoursPerDay === 'number' ? data.goals.sleepHoursPerDay : undefined,
      diapersPerDay: typeof data.goals.diapersPerDay === 'number' ? data.goals.diapersPerDay : undefined,
    };
  }

  if (data.profile && typeof data.profile === 'object') {
    settings.profile = {
      caregiverName: data.profile.caregiverName,
      babyName: data.profile.babyName,
      babyBirthDate: data.profile.babyBirthDate,
      babySex: data.profile.babySex,
      language: data.profile.language,
    };
  }

  return settings;
}

export function SettingsImporter({ onImportStart, onImportComplete, onError }: SettingsImporterProps) {
  const { theme, colors } = useTheme();
  const { profile, saveProfile, setThemeMode } = useAuth();
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [stagingData, setStagingData] = useState<SettingsExportData | null>(null);
  const [rawInput, setRawInput] = useState('');
  const [showInput, setShowInput] = useState(false);

  const parseRawDataToPreview = (raw: string) => {
    try {
      const trimmed = raw.trim();
      const parsed = parseImportData(trimmed);
      const validated = validateSettingsData(parsed);

      if (!validated) {
        throw new Error('Invalid settings format');
      }

      let previewText = 'Settings import detected:\n';
      if (validated.theme?.variant) previewText += `• Theme: ${validated.theme.variant}\n`;
      if (validated.theme?.mode) previewText += `• Mode: ${validated.theme.mode}\n`;
      if (validated.goals?.feedingsPerDay) previewText += `• Feeding goal: ${validated.goals.feedingsPerDay}/day\n`;
      if (validated.goals?.sleepHoursPerDay) previewText += `• Sleep goal: ${validated.goals.sleepHoursPerDay}h/day\n`;
      if (validated.goals?.diapersPerDay) previewText += `• Diaper goal: ${validated.goals.diapersPerDay}/day\n`;
      if (validated.profile?.caregiverName) previewText += `• Caregiver: ${validated.profile.caregiverName}\n`;
      if (validated.profile?.babyName) previewText += `• Baby: ${validated.profile.babyName}`;

      setStagingData(validated);
      setPreview(previewText);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to parse JSON');
    }
  };

  const handleParseInput = async () => {
    try {
      if (!rawInput.trim()) return Alert.alert('Error', 'Please paste JSON data');
      parseRawDataToPreview(rawInput);
    } catch (error: any) {
      Alert.alert('Parse error', error.message || 'Invalid data format');
      onError?.(error);
    }
  };

  const handleImportFromFile = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Not available on this platform', 'Use "Paste JSON" on mobile for now.');
      return;
    }
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
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

  const handleApplySettings = async () => {
    if (!stagingData || !profile) return;

    try {
      setImporting(true);
      onImportStart?.();

      const updates: Partial<any> = {};

      if (stagingData.goals) {
        if (stagingData.goals.feedingsPerDay) updates.goalFeedingsPerDay = stagingData.goals.feedingsPerDay;
        if (stagingData.goals.sleepHoursPerDay) updates.goalSleepHoursPerDay = stagingData.goals.sleepHoursPerDay;
        if (stagingData.goals.diapersPerDay) updates.goalDiapersPerDay = stagingData.goals.diapersPerDay;
      }

      if (stagingData.profile) {
        if (stagingData.profile.caregiverName) updates.caregiverName = stagingData.profile.caregiverName;
        if (stagingData.profile.babyName) updates.babyName = stagingData.profile.babyName;
        if (stagingData.profile.babyBirthDate) updates.babyBirthDate = stagingData.profile.babyBirthDate;
        if (stagingData.profile.babySex) updates.babySex = stagingData.profile.babySex;
        if (stagingData.profile.language) updates.language = stagingData.profile.language;
      }

      if (Object.keys(updates).length > 0) {
        await saveProfile(updates);
      }

      if (stagingData.theme?.mode) {
        await setThemeMode(stagingData.theme.mode as any);
      }

      setPreview(null);
      setStagingData(null);
      setRawInput('');
      setShowInput(false);
      onImportComplete?.();
      Alert.alert('Success', 'Settings imported successfully');
    } catch (error: any) {
      Alert.alert('Import error', error.message || 'Could not apply settings');
      onError?.(error);
    } finally {
      setImporting(false);
    }
  };

  const generateExportData = (): SettingsExportData => ({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    theme: {
      variant: 'sage', // From ThemeContext
      mode: profile?.themeMode,
    },
    goals: {
      feedingsPerDay: profile?.goalFeedingsPerDay,
      sleepHoursPerDay: profile?.goalSleepHoursPerDay,
      diapersPerDay: profile?.goalDiapersPerDay,
    },
    profile: {
      caregiverName: profile?.caregiverName,
      babyName: profile?.babyName,
      babyBirthDate: profile?.babyBirthDate,
      babySex: profile?.babySex,
      language: profile?.language,
    },
  });

  const handleExportJson = () => {
    try {
      const data = generateExportData();
      const json = JSON.stringify(data, null, 2);

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `app-leo-settings-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        window.URL.revokeObjectURL(url);
        Alert.alert('Success', 'Settings exported to JSON');
      } else {
        Alert.alert('Export', 'Copy this JSON:\n\n' + json);
      }
    } catch (error: any) {
      Alert.alert('Export error', error?.message ?? 'Could not export settings');
      onError?.(error);
    }
  };

  return (
    <Card>
      <SectionHeader title="Import/Export Settings" />
      <Text style={[typography.body, { color: colors.muted, marginBottom: spacing.md }]}>
        Backup or restore app settings including theme preferences and baby goals.
      </Text>
      <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
        <Button label="Import from file (.json)" onPress={handleImportFromFile} variant="secondary" disabled={importing} />
        <Button label="Export as JSON" onPress={handleExportJson} variant="secondary" disabled={importing} />
      </View>

      {preview ? (
        <View style={{ gap: spacing.md }}>
          <View style={{ backgroundColor: `${theme.accent}11`, borderColor: theme.accent, borderWidth: 1, borderRadius: radii.lg, padding: spacing.md }}>
            <Text style={[typography.body, { color: theme.textPrimary, fontFamily: 'Courier New', fontSize: 12 }]}>{preview}</Text>
          </View>
          <Button label={importing ? 'Applying...' : 'Apply Settings'} onPress={handleApplySettings} loading={importing} disabled={importing} />
          <Button label="Cancel" onPress={() => { setPreview(null); setStagingData(null); }} variant="ghost" disabled={importing} />
        </View>
      ) : showInput ? (
        <View style={{ gap: spacing.md }}>
          <Text style={[typography.detail, { color: colors.muted }]}>Paste JSON export:</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: theme.border, borderRadius: radii.md, padding: spacing.md, minHeight: 140, color: theme.textPrimary, backgroundColor: theme.bgCardAlt, fontFamily: 'Courier New', fontSize: 12 }}
            placeholder="Paste exported JSON here..."
            placeholderTextColor={theme.textMuted}
            value={rawInput}
            onChangeText={setRawInput}
            multiline
            editable={!importing}
          />
          <Button label="Preview" onPress={handleParseInput} disabled={importing || !rawInput.trim()} />
          <Button label="Cancel" onPress={() => { setRawInput(''); setShowInput(false); }} variant="ghost" disabled={importing} />
        </View>
      ) : (
        <Button label="Paste JSON" onPress={() => setShowInput(true)} variant="secondary" disabled={importing} />
      )}
    </Card>
  );
}
