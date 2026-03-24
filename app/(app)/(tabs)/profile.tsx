import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, EmptyState, EntryCard, Heading, Input, Page, Segment } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  defaultAppSettings,
  defaultModuleVisibility,
  getActiveBaby,
  getAppSettings,
  getBabies,
  getModuleVisibility,
  saveBaby,
  setActiveBabyId,
  setAppSettings,
  setModuleVisibility,
} from '@/lib/storage';
import { scheduleDailySummary } from '@/lib/notifications';
import { useAppData } from '@/context/AppDataContext';
import { getEntrySubtitle, getEntryTitle } from '@/utils/entries';
import { buildDailySummary } from '@/lib/notifications';
import { getLocalPairingSession } from '@/services/pairingService';
import { flushQueuedOperations, loadQueuedOperations } from '@/lib/sync';
import { isVoiceCaptureAvailable, startVoiceCapture } from '@/lib/voiceCapture';
import { AppState } from 'react-native';

export default function ProfileScreen() {
  const { colors, themeMode, themeVariant, setThemeVariant } = useTheme();
  const { profile, guestMode, saveProfile, setThemeMode, signOut } = useAuth();
  const { entries } = useAppData();
  const [caregiverName, setCaregiverName] = useState(profile?.caregiverName ?? '');
  const [babyName, setBabyName] = useState(profile?.babyName ?? 'Leo');
  const [babyBirthDate, setBabyBirthDate] = useState(profile?.babyBirthDate ?? '');
  const [babies, setBabies] = useState<Array<{ id: string; name: string; birthDate: string }>>([]);
  const [activeBabyId, setBabyActiveId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState(defaultModuleVisibility);
  const [settings, setSettings] = useState(defaultAppSettings);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [queuedSyncCount, setQueuedSyncCount] = useState(0);
  const [voiceStatus, setVoiceStatus] = useState('Idle');
  const milestones = useMemo(() => entries.filter((entry) => entry.type === 'milestone').slice(0, 5), [entries]);

  useEffect(() => {
    setCaregiverName(profile?.caregiverName ?? '');
    setBabyName(profile?.babyName ?? 'Leo');
    setBabyBirthDate(profile?.babyBirthDate ?? '');
  }, [profile]);

  useEffect(() => {
    (async () => {
      const items = await getBabies();
      setBabies(items);
      const active = await getActiveBaby();
      setBabyActiveId(active?.id ?? null);
      setVisibility(await getModuleVisibility());
      setSettings(await getAppSettings());
      setPairingCode((await getLocalPairingSession())?.code ?? null);
      setQueuedSyncCount((await loadQueuedOperations()).length);
    })();
  }, []);

  useEffect(() => {
    const refreshQueueCount = async () => {
      setQueuedSyncCount((await loadQueuedOperations()).length);
    };

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshQueueCount();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  async function handleSave() {
    await saveProfile({
      caregiverName: caregiverName.trim(),
      babyName: babyName.trim(),
      babyBirthDate: babyBirthDate.trim(),
    });
    Alert.alert('Profile updated', 'The new values are live across the app.');
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
      sex: 'unspecified',
      createdAt: new Date().toISOString(),
    });
    setBabies(await getBabies());
    setBabyActiveId(baby.id);
  }

  return (
    <Page>
      <Heading eyebrow="Profile" title="Settings" subtitle="Manage family details, theme, and local baby profiles." />

      <Card>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Family profile</Text>
        <Input label="Caregiver name" value={caregiverName} onChangeText={setCaregiverName} />
        <Input label="Baby name" value={babyName} onChangeText={setBabyName} />
        <Input label="Baby birth date" value={babyBirthDate} onChangeText={setBabyBirthDate} />
        <Button label="Save profile" onPress={handleSave} />
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Baby switcher</Text>
        {babies.length ? (
          <View style={{ gap: 10 }}>
            {babies.map((baby) => (
              <Pressable
                key={baby.id}
                onPress={async () => {
                  await setActiveBabyId(baby.id);
                  setBabyActiveId(baby.id);
                }}
                style={{
                  padding: 14,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: activeBabyId === baby.id ? colors.primary : colors.border,
                  backgroundColor: activeBabyId === baby.id ? colors.primarySoft : colors.backgroundAlt,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '800' }}>
                  {baby.name} {activeBabyId === baby.id ? '(Active)' : ''}
                </Text>
                <Text style={{ color: colors.muted }}>{baby.birthDate}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyState title="No baby profiles yet" body="Create the first local baby profile to switch between kids later." action={<Button label="Add baby profile" onPress={handleAddBaby} />} />
        )}
        {babies.length ? <Button label="Add baby profile" onPress={handleAddBaby} variant="ghost" /> : null}
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
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Settings</Text>
        <Text style={{ color: colors.muted }}>Mode: {guestMode ? 'Guest' : 'Cloud account'}</Text>
        <Text style={{ color: colors.muted }}>Theme: {themeVariant}</Text>
        <Input
          label="Daily summary time"
          value={settings.dailySummaryTime}
          onChangeText={async (value) => {
            const next = { ...settings, dailySummaryTime: value };
            setSettings(next);
            await setAppSettings(next);
          }}
          placeholder="22:00"
        />
        <Button
          label={settings.largeTouchMode ? 'Disable large touch mode' : 'Enable large touch mode'}
          onPress={async () => {
            const next = { ...settings, largeTouchMode: !settings.largeTouchMode };
            setSettings(next);
            await setAppSettings(next);
          }}
          variant="ghost"
        />
        <Button
          label={settings.redNightMode ? 'Disable red night mode' : 'Enable red night mode'}
          onPress={async () => {
            const next = { ...settings, redNightMode: !settings.redNightMode };
            setSettings(next);
            await setAppSettings(next);
          }}
          variant="ghost"
        />
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>Theme preset</Text>
        <Segment
          value={settings.themeVariant}
          onChange={async (value) => {
            const next = { ...settings, themeVariant: value as any };
            setSettings(next);
            await setThemeVariant(value as any);
          }}
          options={[
            { label: 'Sage', value: 'sage' },
            { label: 'Rose', value: 'rose' },
            { label: 'Navy', value: 'navy' },
            { label: 'Sand', value: 'sand' },
          ]}
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
                {entry.payload.photoUri ? (
                  <Image source={{ uri: entry.payload.photoUri }} style={{ width: '100%', height: 140, borderRadius: 18 }} resizeMode="cover" />
                ) : null}
                <EntryCard
                  title={getEntryTitle(entry)}
                  subtitle={getEntrySubtitle(entry)}
                  notes={entry.notes ?? (entry.payload.photoUri ? 'Photo attached' : undefined)}
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
        <Button label="Sync now" onPress={handleSyncNow} variant="ghost" />
        <Button label="Schedule daily summary" onPress={handleScheduleSummary} variant="ghost" />
        <Button label="Pair with partner" onPress={() => router.push('/pair')} variant="ghost" />
        <Button
          label="Toggle dark mode"
          onPress={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
          variant="ghost"
        />
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
