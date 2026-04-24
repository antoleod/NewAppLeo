import { useEffect, useMemo, useState } from 'react';
import { Alert, AppState, Image, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Button, Card, EmptyState, EntryCard, Heading, Input, Page, Segment } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLocale } from '@/context/LocaleContext';
import { themeVariantDescriptions } from '@/theme';
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
import { isVoiceCaptureAvailable, startVoiceCapture } from '@/lib/voiceCapture';

const languageOptions = [
  { label: 'FR', value: 'fr' },
  { label: 'ES', value: 'es' },
  { label: 'EN', value: 'en' },
  { label: 'NL', value: 'nl' },
];

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const { colors, theme, paletteMode, themeMode, themeVariant, themeStyle, backgroundPhotoUri, setBackgroundPhotoUri, setThemeVariant, setThemeStyle, setCustomTheme, toggleTheme } = useTheme();
  const { t } = useLocale();
  const { profile, guestMode, saveProfile, setThemeMode, signOut } = useAuth();
  const { entries, clearDemoData } = useAppData();
  const [caregiverName, setCaregiverName] = useState(profile?.caregiverName ?? '');
  const [babyName, setBabyName] = useState(profile?.babyName ?? 'Leo');
  const [babyBirthDate, setBabyBirthDate] = useState(profile?.babyBirthDate ?? '');
  const [birthWeightKg, setBirthWeightKg] = useState(profile?.birthWeightKg ? String(profile.birthWeightKg) : '');
  const [currentWeightKg, setCurrentWeightKg] = useState(profile?.currentWeightKg ? String(profile.currentWeightKg) : '');
  const [heightCm, setHeightCm] = useState(profile?.heightCm ? String(profile.heightCm) : '');
  const [babyNotes, setBabyNotes] = useState(profile?.babyNotes ?? '');
  const [babyPhotoUri, setBabyPhotoUri] = useState(profile?.babyPhotoUri ?? '');
  const [language, setLanguage] = useState(profile?.language ?? 'en');
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const milestones = useMemo(() => entries.filter((entry) => entry.type === 'milestone').slice(0, 5), [entries]);
  const themeVariantLabel = themeVariantDescriptions[themeVariant]?.label ?? themeVariant;
  const isPhone = width < 768;

  useEffect(() => {
    setCaregiverName(profile?.caregiverName ?? '');
    setBabyName(profile?.babyName ?? 'Leo');
    setBabyBirthDate(profile?.babyBirthDate ?? '');
    setBirthWeightKg(profile?.birthWeightKg ? String(profile.birthWeightKg) : '');
    setCurrentWeightKg(profile?.currentWeightKg ? String(profile.currentWeightKg) : '');
    setHeightCm(profile?.heightCm ? String(profile.heightCm) : '');
    setBabyNotes(profile?.babyNotes ?? '');
    setBabyPhotoUri(profile?.babyPhotoUri ?? '');
    setLanguage(profile?.language ?? 'en');
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
      setQueuedSyncCount(0);
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
    try {
      const nextPhoto = babyPhotoUri || undefined;
      await saveProfile({
        caregiverName: caregiverName.trim(),
        babyName: babyName.trim(),
        babyBirthDate: babyBirthDate.trim(),
        birthWeightKg: Number(birthWeightKg) || undefined,
        currentWeightKg: Number(currentWeightKg) || undefined,
        heightCm: Number(heightCm) || undefined,
        babyNotes: babyNotes.trim() || undefined,
        babyPhotoUri: nextPhoto,
        language: language as any,
      });
      setBabyPhotoUri(nextPhoto ?? '');
      Alert.alert(t('settings.update_success', 'Profile updated'), t('settings.update_success_body', 'Your preferences are now in sync across the app.'));
    } catch (error: any) {
      Alert.alert(t('settings.update_failed', 'Update failed'), error?.message ?? t('settings.update_failed_body', 'Please try again.'));
    }
  }

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.cancel', 'Cancel'), 'Allow photo access to attach a baby picture.');
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

  async function handlePickBackgroundPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.cancel', 'Cancel'), 'Allow photo access to set a custom app background.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const uri = result.assets[0].uri;
      await patchSettings({ backgroundPhotoUri: uri });
      await setBackgroundPhotoUri(uri);
    }
  }

  async function handleResetBackgroundPhoto() {
    await patchSettings({ backgroundPhotoUri: '' });
    await setBackgroundPhotoUri('');
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
      setQueuedSyncCount(0);
      Alert.alert('Sync complete', 'No local sync queue is used anymore.');
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

  async function handleClearDemoData() {
    try {
      const result = await clearDemoData();
      Alert.alert('Demo data removed', `${result.removed} imported demo entries were deleted.`);
    } catch (error: any) {
      Alert.alert('Could not remove demo data', error?.message ?? 'Please try again.');
    }
  }

  return (
    <Page contentStyle={{ gap: isPhone ? 12 : 16, paddingBottom: 24 }}>
        <Card style={{ padding: isPhone ? 16 : 20, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <Pressable onPress={handlePickPhoto} style={{ width: 80, height: 80, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.backgroundAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border }}>
              {babyPhotoUri ? <Image source={{ uri: babyPhotoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 12 }}>📷</Text>}
            </Pressable>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>{babyName || 'Tu Bebé'}</Text>
              <Text style={{ color: colors.muted, fontSize: 14 }}>{babyBirthDate || 'Fecha de nacimiento'}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <View style={{ backgroundColor: `${theme.accent}20`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '700' }}>{themeVariantLabel}</Text>
                </View>
                <View style={{ backgroundColor: colors.backgroundAlt, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>{language.toUpperCase()}</Text>
                </View>
              </View>
            </View>
          </View>

          {!profile?.hasCompletedOnboarding && (
            <View style={{ backgroundColor: `${colors.alert}15`, borderColor: colors.alert, borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 16 }}>
              <Text style={{ color: colors.alert, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>⚠️ Completa el perfil para desbloquear todas las funciones</Text>
            </View>
          )}

          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: isPhone ? 'column' : 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input label="Padre/Madre" value={caregiverName} onChangeText={setCaregiverName} placeholder="Tu nombre" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Nombre del bebé" value={babyName} onChangeText={setBabyName} placeholder="Nombre" />
              </View>
            </View>
            <Input label="Fecha de nacimiento" value={babyBirthDate} onChangeText={setBabyBirthDate} placeholder="YYYY-MM-DD" />
            <View style={{ flexDirection: isPhone ? 'column' : 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input label="P. nacimiento (kg)" value={birthWeightKg} onChangeText={setBirthWeightKg} keyboardType="decimal-pad" inputMode="decimal" placeholder="3.5" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="P. actual (kg)" value={currentWeightKg} onChangeText={setCurrentWeightKg} keyboardType="decimal-pad" inputMode="decimal" placeholder="4.2" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 2 }}>
                <Input label="Altura (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" inputMode="decimal" placeholder="55" />
              </View>
              <View style={{ flex: 1 }}>
                <Segment value={language} onChange={(value) => setLanguage(value as typeof language)} options={languageOptions} />
              </View>
            </View>
            <Input label="Notas" value={babyNotes} onChangeText={setBabyNotes} multiline placeholder="Notas sobre el bebé..." />
            <Button label="Guardar Perfil" onPress={handleSave} />
          </View>
        </Card>

        <Card style={{ padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>👶 Perfiles de Bebés</Text>
          {babies.length ? (
            <View style={{ gap: 8 }}>
              {babies.map((baby) => (
                <View
                  key={baby.id}
                  style={{
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: activeBabyId === baby.id ? theme.accent : colors.border,
                    backgroundColor: activeBabyId === baby.id ? `${theme.accent}15` : colors.backgroundAlt,
                    padding: 12,
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>
                        {baby.name} {activeBabyId === baby.id ? '✓' : ''}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 13 }}>{baby.birthDate}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {activeBabyId !== baby.id && (
                        <Button
                          label="Activar"
                          onPress={async () => {
                            await setActiveBabyId(baby.id);
                            setBabyActiveId(baby.id);
                          }}
                          variant="ghost"
                          fullWidth={false}
                          size="sm"
                        />
                      )}
                      <Button
                        label="Eliminar"
                        onPress={() => {
                          void handleRemoveBaby(baby.id, baby.name);
                        }}
                        variant="ghost"
                        fullWidth={false}
                        size="sm"
                      />
                    </View>
                  </View>
                </View>
              ))}
              <Button label="+ Agregar Perfil" onPress={handleAddBaby} variant="secondary" />
            </View>
          ) : (
            <View style={{ alignItems: 'center', padding: 20, gap: 12 }}>
              <Text style={{ fontSize: 32 }}>👶</Text>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>Sin perfiles aún</Text>
              <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center' }}>Crea un perfil para tu bebé para empezar</Text>
              <Button label="Crear Primer Perfil" onPress={handleAddBaby} />
            </View>
          )}
        </Card>

        <Card style={{ padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>🎨 Apariencia</Text>

          <View style={{ gap: 12 }}>
            <Pressable
              onPress={() => void toggleTheme()}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.backgroundAlt,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.text, flex: 1, fontSize: 14, fontWeight: '600' }}>
                {paletteMode === 'nuit' ? '🌙 Modo Noche' : '☀️ Modo Día'}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {paletteMode === 'nuit' ? 'Cambiar a Día' : 'Cambiar a Noche'}
              </Text>
            </Pressable>

            <View>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Paleta de colores</Text>
              <Segment
                value={settings.themeVariant}
                onChange={async (value) => {
                  await patchSettings({ themeVariant: value as any });
                  await setThemeVariant(value as any);
                }}
                options={[
                  { label: 'Claro', value: 'light' },
                  { label: 'Océano', value: 'custom' },
                  { label: 'Púrpura', value: 'parliament' },
                  { label: 'Noche', value: 'noir' },
                ]}
              />
            </View>

            <View>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Modo de tema</Text>
              <Segment
                value={themeMode}
                onChange={(value) => setThemeMode(value as any)}
                options={[
                  { label: 'Auto', value: 'system' },
                  { label: 'Claro', value: 'light' },
                  { label: 'Oscuro', value: 'dark' },
                ]}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Button
                label={settings.largeTouchMode ? 'Botones grandes ✓' : 'Botones grandes'}
                onPress={() => patchSettings({ largeTouchMode: !settings.largeTouchMode })}
                variant={settings.largeTouchMode ? 'secondary' : 'ghost'}
                fullWidth={false}
                size="sm"
              />
              <Button
                label={settings.compactHomeCards ? 'Tarjetas compactas ✓' : 'Tarjetas compactas'}
                onPress={() => patchSettings({ compactHomeCards: !settings.compactHomeCards })}
                variant={settings.compactHomeCards ? 'secondary' : 'ghost'}
                fullWidth={false}
                size="sm"
              />
            </View>
            <Button label="Abrir tema avanzado" onPress={() => router.push('/settings-theme')} variant="ghost" />
          </View>
        </Card>

        <Card>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Advanced</Text>
          <Text style={{ color: colors.muted, lineHeight: 20 }}>Dashboard, effects, sync and voice tools are grouped here so the mobile profile stays focused.</Text>
          <Button label={advancedOpen ? 'Hide advanced settings' : 'Show advanced settings'} onPress={() => setAdvancedOpen((current) => !current)} variant="ghost" />
        </Card>

        {advancedOpen ? (
          <>
        <Card>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{t('profile.dashboard', 'Dashboard personalization')}</Text>
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
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{t('profile.effects', 'Effects')}</Text>
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
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{t('profile.module_visibility', 'Module visibility')}</Text>
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
          </>
        ) : null}

        <Card>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{t('profile.milestones', 'Milestones')}</Text>
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

        {advancedOpen ? (
          <>
        <Card>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{t('profile.session', 'Session')}</Text>
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
          <Button label="Remove demo imported data" onPress={handleClearDemoData} variant="ghost" />
          <Button label="Log out" onPress={signOut} variant="danger" />
        </Card>

        <Card>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{t('profile.voice_bridge', 'Voice bridge')}</Text>
          <Text style={{ color: colors.muted, lineHeight: 20 }}>
            Try a browser-only speech capture path that converts a short transcript into a parsed intent.
          </Text>
          <Text style={{ color: colors.muted }}>Status: {voiceStatus}</Text>
          <Button label="Test voice capture" onPress={handleVoiceBridge} variant="ghost" />
        </Card>
          </>
        ) : null}
    </Page>
  );
}

