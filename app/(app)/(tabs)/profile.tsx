import { Alert, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { Button, Card, Heading, Input, Page, Segment } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';

export default function ProfileScreen() {
  const { colors, themeMode } = useTheme();
  const { profile, saveProfile, setThemeMode, signOut } = useAuth();
  const { seedDemoData } = useAppData();
  const [caregiverName, setCaregiverName] = useState(profile?.caregiverName ?? '');
  const [babyName, setBabyName] = useState(profile?.babyName ?? 'Leo');
  const [babyBirthDate, setBabyBirthDate] = useState(profile?.babyBirthDate ?? '');
  const [importJson, setImportJson] = useState('');

  async function handleSave() {
    await saveProfile({
      caregiverName: caregiverName.trim(),
      babyName: babyName.trim(),
      babyBirthDate: babyBirthDate.trim(),
    });
    Alert.alert('Profile updated', 'The new values are live across the app.');
  }

  async function handleExport() {
    const payload = {
      profile,
    };
    const text = JSON.stringify(payload, null, 2);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      Alert.alert('Copied', 'Profile JSON copied to clipboard.');
    } else {
      Alert.alert('Copy manually', text);
    }
  }

  async function handleImport() {
    try {
      const parsed = JSON.parse(importJson);
      if (parsed?.profile) {
        await saveProfile(parsed.profile);
        Alert.alert('Imported', 'Profile values were applied.');
      }
    } catch (error) {
      Alert.alert('Invalid JSON', 'Paste a valid JSON payload.');
    }
  }

  return (
    <Page>
      <Heading eyebrow="Profile" title="Settings" subtitle="Manage family details, theme, and data tools." />

      <Card>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Family profile</Text>
        <Input label="Caregiver name" value={caregiverName} onChangeText={setCaregiverName} />
        <Input label="Baby name" value={babyName} onChangeText={setBabyName} />
        <Input label="Baby birth date" value={babyBirthDate} onChangeText={setBabyBirthDate} />
        <Button label="Save profile" onPress={handleSave} />
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Theme mode</Text>
        <Segment
          value={themeMode}
          onChange={(value) => setThemeMode(value as any)}
          options={[
            { label: 'System', value: 'system' },
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ]}
        />
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Data tools</Text>
        <Button label="Load demo data" onPress={seedDemoData} variant="secondary" />
        <Button label="Export profile JSON" onPress={handleExport} variant="ghost" />
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
          Import/export is intentionally lightweight in the first migration pass. The service layer is already structured for stronger backend sync later.
        </Text>
        <TextInput
          value={importJson}
          onChangeText={setImportJson}
          placeholder='Paste {"profile": {...}} here'
          placeholderTextColor={colors.muted}
          multiline
          style={{
            minHeight: 110,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.backgroundAlt,
            padding: 12,
            color: colors.text,
          }}
        />
        <Button label="Import JSON" onPress={handleImport} variant="ghost" />
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Session</Text>
        <Text style={{ color: colors.muted }}>Signed in as {profile?.authEmail}</Text>
        <Text style={{ color: colors.muted }}>Username: {profile?.username}</Text>
        <Button label="Log out" onPress={signOut} variant="danger" />
      </Card>
    </Page>
  );
}
