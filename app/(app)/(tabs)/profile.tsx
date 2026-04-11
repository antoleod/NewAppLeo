import { useEffect, useMemo, useState } from 'react';
import { Alert, AppState, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Button, Card, EmptyState, EntryCard, Heading, Input, Page, Segment } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLocale } from '@/context/LocaleContext';
import {
  defaultAppSettings,
  defaultModuleVisibility,
  getActiveBaby,
  getAppSettings,
  getBabies,
  getModuleVisibility,
  saveBaby,
  setActiveBabyId,
  removeBaby,
  setModuleVisibility,
  updateAppSettings,
} from '@/lib/storage';
import { scheduleDailySummary } from '@/lib/notifications';
import { useAppData } from '@/context/AppDataContext';
import { getEntrySubtitle, getEntryTitle } from '@/utils/entries';
import { buildDailySummary } from '@/lib/notifications';
import { getLocalPairingSession } from '@/services/pairingService';
import { flushQueuedOperations, loadQueuedOperations } from '@/lib/sync';
import { isVoiceCaptureAvailable, startVoiceCapture } from '@/lib/voiceCapture';

const languageOptions = [
  { label: 'FR', value: 'fr' },
  { label: 'ES', value: 'es' },
  { label: 'EN', value: 'en' },
  { label: 'NL', value: 'nl' },
];

export default function ProfileScreen() {
  const { colors, theme, paletteMode, themeMode, themeVariant, setThemeVariant, setCustomTheme, toggleTheme } = useTheme();
  const { t } = useLocale();
  const { profile, guestMode, saveProfile, setThemeMode, signOut } = useAuth();
  const { entries } = useAppData();
  const [caregiverName, setCaregiverName] = useState(profile?.caregiverName ?? '');
  const [babyName, setBabyName] = useState(profile?.babyName ?? 'Leo');
  const [babyBirthDate, setBabyBirthDate] = useState(profile?.babyBirthDate ?? '');
  const [birthWeightKg, setBirthWeightKg] = useState(profile?.birthWeightKg ? String(profile.birthWeightKg) : '');
  const [currentWeightKg, setCurrentWeightKg] = useState(profile?.currentWeightKg ? String(profile.currentWeightKg) : '');
  const [heightCm, setHeightCm] = useState(profile?.heightCm ? String(profile.heightCm) : '');
  const [babyNotes, setBabyNotes] = useState(profile?.babyNotes ?? '');
  const [babyPhotoUri, setBabyPhotoUri] = useState(profile?.babyPhotoUri ?? '');
  const [language, setLanguage] = useState(profile?.language ?? 'fr');
  const [babies, setBabies] = useState<Array<{ id: string; name: string; birthDate: string }>>([]);
  const [activeBabyId, setBabyActiveId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState(defaultModuleVisibility);
  const [settings, setSettings] = useState(defaultAppSettings);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [queuedSyncCount, setQueuedSyncCount] = useState(0);
  const [voiceStatus, setVoiceStatus] = useState('Idle');
  const [customPrimary, setCustomPrimary] = useState(defaultAppSettings.customTheme.primary);
  const [customSecondary, setCustomSecondary] = useState(defaultAppSettings.customTheme.secondary);
  const [customBackgroundAlt, setCustomBackgroundAlt] = useState(defaultAppSettings.customTheme.backgroundAlt);
  const milestones = useMemo(() => entries.filter((entry) => entry.type === 'milestone').slice(0, 5), [entries]);

  useEffect(() => {
    setCaregiverName(profile?.caregiverName ?? '');
    setBabyName(profile?.babyName ?? 'Leo');
    setBabyBirthDate(profile?.babyBirthDate ?? '');
    setBirthWeightKg(profile?.birthWeightKg ? String(profile.birthWeightKg) : '');
    setCurrentWeightKg(profile?.currentWeightKg ? String(profile.currentWeightKg) : '');
    setHeightCm(profile?.heightCm ? String(profile.heightCm) : '');
    setBabyNotes(profile?.babyNotes ?? '');
    setBabyPhotoUri(profile?.babyPhotoUri ?? '');
    setLanguage(profile?.language ?? 'fr');
  }, [profile]);

  useEffect(() => {
    const refresh = async () => {
      const items = await getBabies();
      setBabies(items);
      const active = await getActiveBaby();
      setBabyActiveId(active?.id ?? null);
      setVisibility(await getModuleVisibility());
      const nextSettings = await getAppSettings();
      setSettings(nextSettings);
      setCustomPrimary(nextSettings.customTheme.primary);
      setCustomSecondary(nextSettings.customTheme.secondary);
      setCustomBackgroundAlt(nextSettings.customTheme.backgroundAlt);
      setPairingCode((await getLocalPairingSession())?.code ?? null);
      setQueuedSyncCount((await loadQueuedOperations()).length);
    };

    void refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh();
      }
    });

    return () => subscription.remove();
  }, []);

  async function handleSave() {
    await saveProfile({
      caregiverName: caregiverName.trim(),
      babyName: babyName.trim(),
      babyBirthDate: babyBirthDate.trim(),
      birthWeightKg: Number(birthWeightKg) || undefined,
      currentWeightKg: Number(currentWeightKg) || undefined,
      heightCm: Number(heightCm) || undefined,
      babyNotes: babyNotes.trim() || undefined,
      babyPhotoUri: babyPhotoUri || undefined,
      language: language as any,
    });
    Alert.alert('Profile updated', 'Local family data is now in sync across the app.');
  }

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow photo access to attach a baby picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setBabyPhotoUri(result.assets[0].uri);
    }
  }

  async function handleScheduleSummary() {
    try {
      const result = await scheduleDailySummary(settings.dailySummaryTime, buildDailySummary(entries));
      Alert.alert('Daily summary scheduled', `Time: ${settings.dailySummaryTime}${result.id ? '\nNotification ID: ' + result.id : ''}`);
    } catch (error: any) {
      Alert.alert('Could not schedule summary', error?.message ?? 'Please check notification permissions.');
    }
  }

  async function handleSyncNow() {
    try {
      if (!profile) throw new Error('You must be signed in.');
      const result = await flushQueuedOperations(profile.uid);
      setQueuedSyncCount(0);
      Alert.alert('Sync complete', `Flushed ${result.flushed} queued operations.`);
    } catch (error: any) {
      Alert.alert('Sync failed', error?.message ?? 'Could not sync queued changes.');
    }
  }

  function handleVoiceBridge() {
    if (!isVoiceCaptureAvailable()) {
      Alert.alert('Voice capture unavailable', 'This bridge currently works in supported browsers only.');
      return;
    }

    setVoiceStatus('Listening...');
    try {
      const session = startVoiceCapture({
        onTranscript: (transcript) => setVoiceStatus(`Heard: ${transcript}`),
        onIntent: (intent) => setVoiceStatus(`Intent: ${intent.kind}`),
        onError: (error) => {
          setVoiceStatus('Idle');
          Alert.alert('Voice capture failed', error.message);
        },
      });

      setTimeout(() => session.stop(), 4500);
    } catch (error: any) {
      setVoiceStatus('Idle');
      Alert.alert('Voice capture failed', error?.message ?? 'Unable to start voice capture.');
    }
  }

  async function handleAddBaby() {
    if (!babyName.trim() || !babyBirthDate.trim()) return;
    const baby = await saveBaby({
      id: globalThis.crypto?.randomUUID?.() ?? `baby_${Date.now()}`,
      name: babyName.trim(),
      birthDate: babyBirthDate.trim(),
      sex: profile?.babySex ?? 'unspecified',
      birthWeightKg: Number(birthWeightKg) || undefined,
      currentWeightKg: Number(currentWeightKg) || undefined,
      heightCm: Number(heightCm) || undefined,
      notes: babyNotes.trim() || undefined,
      photoUri: babyPhotoUri || undefined,
      language: language as any,
      createdAt: new Date().toISOString(),
    });
    setBabies(await getBabies());
    setBabyActiveId(baby.id);
  }

  async function handleRemoveBaby(babyId: string, babyName: string) {
    Alert.alert(
      'Remove child',
      `Delete ${babyName} from local profiles?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeBaby(babyId);
            const items = await getBabies();
            setBabies(items);
            const active = await getActiveBaby();
            setBabyActiveId(active?.id ?? null);
          },
        },
      ],
    );
  }

  async function patchSettings(patch: Partial<typeof settings>) {
    const next = await updateAppSettings(patch);
    setSettings(next);
  }

  return (
    <Page>
      <Heading eyebrow={t('tabs.profile')} title="Famille et preferences" subtitle="Langue, themes, effets, photo, dashboard et synchronisation locale." />

      <Card>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Family profile</Text>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <Pressable onPress={handlePickPhoto} style={{ width: 86, height: 86, borderRadius: 28, overflow: 'hidden', backgroundColor: colors.backgroundAlt, alignItems: 'center', justifyContent: 'center' }}>
            {babyPhotoUri ? <Image source={{ uri: babyPhotoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={{ color: colors.primary, fontWeight: '900' }}>Photo</Text>}
          </Pressable>
          <View style={{ flex: 1, minWidth: 220, gap: 6 }}>
            <Text style={{ color: colors.muted }}>Mode: {guestMode ? 'Guest' : 'Cloud account'}</Text>
            <Text style={{ color: colors.muted }}>Theme preset: {themeVariant}</Text>
            <Text style={{ color: colors.muted }}>Language: {language.toUpperCase()}</Text>
          </View>
        </View>
        <Input label="Parent" value={caregiverName} onChangeText={setCaregiverName} />
        <Input label="Bebe" value={babyName} onChangeText={setBabyName} />
        <Input label="Date de naissance" value={babyBirthDate} onChangeText={setBabyBirthDate} />
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <View style={{ flex: 1, minWidth: 160 }}>
            <Input label="Poids naissance (kg)" value={birthWeightKg} onChangeText={setBirthWeightKg} keyboardType="decimal-pad" inputMode="decimal" />
          </View>
          <View style={{ flex: 1, minWidth: 160 }}>
            <Input label="Poids actuel (kg)" value={currentWeightKg} onChangeText={setCurrentWeightKg} keyboardType="decimal-pad" inputMode="decimal" />
          </View>
        </View>
        <Input label="Taille (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" inputMode="decimal" />
        <Input label="Notes" value={babyNotes} onChangeText={setBabyNotes} multiline />
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>Language</Text>
        <Segment value={language} onChange={(value) => setLanguage(value as typeof language)} options={languageOptions} />
        <Button label="Save profile" onPress={handleSave} />
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Children</Text>
        {babies.length ? (
          <View style={{ gap: 10 }}>
            {babies.map((baby) => (
              <View
                key={baby.id}
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: activeBabyId === baby.id ? colors.primary : colors.border,
                  backgroundColor: activeBabyId === baby.id ? colors.primarySoft : colors.backgroundAlt,
                  padding: 14,
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '800' }}>
                      {baby.name} {activeBabyId === baby.id ? '(Active)' : ''}
                    </Text>
                    <Text style={{ color: colors.muted }}>{baby.birthDate}</Text>
                  </View>
                  <Button
                    label="Remove"
                    onPress={() => {
                      void handleRemoveBaby(baby.id, baby.name);
                    }}
                    variant="ghost"
                    fullWidth={false}
                    size="sm"
                  />
                </View>
                <Button
                  label="Set active"
                  onPress={async () => {
                    await setActiveBabyId(baby.id);
                    setBabyActiveId(baby.id);
                  }}
                  variant={activeBabyId === baby.id ? 'secondary' : 'ghost'}
                  fullWidth={false}
                  size="sm"
                />
              </View>
            ))}
            <Button label="Add baby profile" onPress={handleAddBaby} variant="ghost" />
          </View>
        ) : (
          <EmptyState title="No baby profiles yet" body="Create the first local baby profile to switch between kids later." action={<Button label="Add baby profile" onPress={handleAddBaby} />} />
        )}
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Theme and layout</Text>
        <Pressable
          onPress={() => void toggleTheme()}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.bgCard,
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text style={{ color: theme.textPrimary, flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 20 }}>
            {paletteMode === 'nuit' ? '🌙 Mode Nuit' : '☀️ Mode Jour'}
          </Text>
          <Text style={{ color: theme.accent, fontFamily: 'DMSans_400Regular', fontSize: 11 }}>
            {paletteMode === 'nuit' ? 'Passer en Jour' : 'Passer en Nuit'}
          </Text>
        </Pressable>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>Theme mode</Text>
        <Segment
          value={themeMode}
          onChange={(value) => setThemeMode(value as any)}
          options={[
            { label: 'System', value: 'system' },
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ]}
        />
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>Theme preset</Text>
        <Segment
          value={settings.themeVariant}
          onChange={async (value) => {
            await patchSettings({ themeVariant: value as any });
            await setThemeVariant(value as any);
          }}
          options={[
            { label: 'Sage', value: 'sage' },
            { label: 'Rose', value: 'rose' },
            { label: 'Navy', value: 'navy' },
            { label: 'Sand', value: 'sand' },
          ]}
        />
        <Button
          label={settings.largeTouchMode ? 'Disable large touch mode' : 'Enable large touch mode'}
          onPress={() => patchSettings({ largeTouchMode: !settings.largeTouchMode })}
          variant="ghost"
        />
        <Button
          label={settings.compactHomeCards ? 'Disable compact home cards' : 'Enable compact home cards'}
          onPress={() => patchSettings({ compactHomeCards: !settings.compactHomeCards })}
          variant="ghost"
        />
        <Button
          label={settings.redNightMode ? 'Disable red night mode' : 'Enable red night mode'}
          onPress={() => patchSettings({ redNightMode: !settings.redNightMode })}
          variant="ghost"
        />
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800', textAlign: 'center' }}>Custom theme builder</Text>
        <Input label="Primary hex" value={customPrimary} onChangeText={setCustomPrimary} placeholder="#4d7c6b" />
        <Input label="Secondary hex" value={customSecondary} onChangeText={setCustomSecondary} placeholder="#c18f54" />
        <Input label="Background alt hex" value={customBackgroundAlt} onChangeText={setCustomBackgroundAlt} placeholder="#eef4ef" />
        <Button
          label={settings.customTheme.enabled ? 'Disable custom theme' : 'Apply custom theme'}
          onPress={async () => {
            const enabled = !settings.customTheme.enabled;
            const nextCustom = {
              enabled,
              primary: customPrimary.trim() || defaultAppSettings.customTheme.primary,
              secondary: customSecondary.trim() || defaultAppSettings.customTheme.secondary,
              backgroundAlt: customBackgroundAlt.trim() || defaultAppSettings.customTheme.backgroundAlt,
            };
            await patchSettings({ customTheme: nextCustom });
            await setCustomTheme(nextCustom);
          }}
          variant="secondary"
        />
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Dashboard personalization</Text>
        <Input
          label="Hydration goal (ml)"
          value={String(settings.hydrationGoalMl)}
          onChangeText={(value) => patchSettings({ hydrationGoalMl: Number(value) || defaultAppSettings.hydrationGoalMl })}
          keyboardType="numeric"
          inputMode="numeric"
        />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(settings.dashboardMetrics).map(([key, enabled]) => (
            <Button
              key={key}
              label={`${enabled ? 'Hide' : 'Show'} ${key}`}
              onPress={() => patchSettings({ dashboardMetrics: { [key]: !enabled } as any })}
              variant={enabled ? 'secondary' : 'ghost'}
              fullWidth={false}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Effects</Text>
        <Text style={{ color: colors.muted }}>All motion stays optional and can be switched off here.</Text>
        <Button
          label={settings.effects.emojiPulse ? 'Disable emoji pulse' : 'Enable emoji pulse'}
          onPress={() => patchSettings({ effects: { ...settings.effects, emojiPulse: !settings.effects.emojiPulse } })}
          variant="ghost"
        />
        <Button
          label={settings.effects.liveCountdown ? 'Disable live countdown' : 'Enable live countdown'}
          onPress={() => patchSettings({ effects: { ...settings.effects, liveCountdown: !settings.effects.liveCountdown } })}
          variant="ghost"
        />
        <Button
          label={settings.effects.gradientCards ? 'Disable gradient cards' : 'Enable gradient cards'}
          onPress={() => patchSettings({ effects: { ...settings.effects, gradientCards: !settings.effects.gradientCards } })}
          variant="ghost"
        />
        <Button
          label={settings.effects.pressScale ? 'Disable press scale' : 'Enable press scale'}
          onPress={() => patchSettings({ effects: { ...settings.effects, pressScale: !settings.effects.pressScale } })}
          variant="ghost"
        />
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Module visibility</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(visibility).map(([key, enabled]) => (
            <Button
              key={key}
              label={`${enabled ? 'Hide' : 'Show'} ${key}`}
              onPress={async () => {
                const next = { ...visibility, [key]: !enabled };
                setVisibility(next);
                await setModuleVisibility(next);
              }}
              variant={enabled ? 'secondary' : 'ghost'}
              fullWidth={false}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Milestones</Text>
        {milestones.length ? (
          <View style={{ gap: 10 }}>
            {milestones.map((entry) => (
              <View key={entry.id} style={{ gap: 8 }}>
                {entry.payload?.photoUri ? (
                  <Image source={{ uri: entry.payload.photoUri }} style={{ width: '100%', height: 140, borderRadius: 18 }} resizeMode="cover" />
                ) : null}
                <EntryCard
                  title={getEntryTitle(entry)}
                  subtitle={getEntrySubtitle(entry)}
                  notes={entry.notes ?? (entry.payload?.photoUri ? 'Photo attached' : undefined)}
                />
              </View>
            ))}
          </View>
        ) : (
          <EmptyState title="No milestones yet" body="Add a milestone to build a simple development journal." action={<Button label="Log milestone" onPress={() => router.push('/entry/milestone')} />} />
        )}
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Session</Text>
        <Text style={{ color: colors.muted }}>Signed in as {profile?.authEmail}</Text>
        <Text style={{ color: colors.muted }}>Username: {profile?.username}</Text>
        <Text style={{ color: colors.muted }}>Pairing: {pairingCode ?? 'none'}</Text>
        <Text style={{ color: colors.muted }}>Queued sync items: {queuedSyncCount}</Text>
        <Input
          label="Daily summary time"
          value={settings.dailySummaryTime}
          onChangeText={(value) => patchSettings({ dailySummaryTime: value })}
          placeholder="22:00"
        />
        <Button label="Sync now" onPress={handleSyncNow} variant="ghost" />
        <Button label="Schedule daily summary" onPress={handleScheduleSummary} variant="ghost" />
        <Button label="Pair with partner" onPress={() => router.push('/pair')} variant="ghost" />
        <Button label="Log out" onPress={signOut} variant="danger" />
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Voice bridge</Text>
        <Text style={{ color: colors.muted, lineHeight: 20 }}>
          Try a browser-only speech capture path that converts a short transcript into a parsed intent.
        </Text>
        <Text style={{ color: colors.muted }}>Status: {voiceStatus}</Text>
        <Button label="Test voice capture" onPress={handleVoiceBridge} variant="ghost" />
      </Card>
    </Page>
  );
}
