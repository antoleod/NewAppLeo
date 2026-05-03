import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Button, Card, EmptyState, Heading, Input, Page, Segment } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocale } from '@/context/LocaleContext';
import { getActiveBaby, getBabies, saveBaby, setActiveBabyId, removeBaby } from '@/lib/storage';
import { DataImporter } from '@/components/DataImporter';
import { getLocalPairingSession } from '@/services/pairingService';
import { flushQueuedOperations, loadQueuedOperations } from '@/lib/sync';
import { useToast } from '@/components/Toast';
import { haptics } from '@/lib/haptics';
import { deleteSession, watchSessions, type SessionItem } from '@/services/sessionService';

const languageOptions = [
  { label: 'FR', value: 'fr' },
  { label: 'ES', value: 'es' },
  { label: 'EN', value: 'en' },
  { label: 'NL', value: 'nl' },
];

function generateBabyId() {
  return globalThis.crypto?.randomUUID?.() ?? `baby_${Date.now()}`;
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { t, format } = useTranslation();
  const { setLanguage: setContextLanguage } = useLocale();
  const { profile, guestMode, saveProfile, signOut, user } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({
    caregiverName: profile?.caregiverName ?? '',
    babyName: profile?.babyName ?? 'Leo',
    babyBirthDate: profile?.babyBirthDate ?? '',
    birthWeightKg: profile?.birthWeightKg ? String(profile.birthWeightKg) : '',
    currentWeightKg: profile?.currentWeightKg ? String(profile.currentWeightKg) : '',
    heightCm: profile?.heightCm ? String(profile.heightCm) : '',
    babyNotes: profile?.babyNotes ?? '',
    babyPhotoUri: profile?.babyPhotoUri ?? '',
  });
  const [babies, setBabies] = useState<Array<{ id: string; name: string; birthDate: string }>>([]);
  const [activeBabyId, setActiveBabyIdLocal] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [queuedSyncCount, setQueuedSyncCount] = useState(0);
  const [showChildren, setShowChildren] = useState(false);
  const [showSession, setShowSession] = useState(false);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setForm({
      caregiverName: profile?.caregiverName ?? '',
      babyName: profile?.babyName ?? 'Leo',
      babyBirthDate: profile?.babyBirthDate ?? '',
      birthWeightKg: profile?.birthWeightKg ? String(profile.birthWeightKg) : '',
      currentWeightKg: profile?.currentWeightKg ? String(profile.currentWeightKg) : '',
      heightCm: profile?.heightCm ? String(profile.heightCm) : '',
      babyNotes: profile?.babyNotes ?? '',
      babyPhotoUri: profile?.babyPhotoUri ?? '',
    });
  }, [profile]);

  const refreshProfileData = useCallback(async () => {
    const [savedBabies, session, queuedOperations] = await Promise.all([
      getBabies(),
      getLocalPairingSession(),
      loadQueuedOperations(),
    ]);

    setBabies(savedBabies);
    setActiveBabyIdLocal((await getActiveBaby())?.id ?? null);
    setPairingCode(session?.code ?? null);
    setQueuedSyncCount(queuedOperations.length);
  }, [user]);

  useEffect(() => {
    void refreshProfileData();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshProfileData();
    });
    return () => subscription.remove();
  }, [refreshProfileData]);

  useEffect(() => {
    if (!user) return;
    const unsub = watchSessions(user.uid, setSessions);
    return () => unsub();
  }, [user]);

  const handleFieldChange = useCallback(
    (field: keyof typeof form, value: string) => {
      setForm((current) => ({ ...current, [field]: value }));
    },
    [setForm],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveProfile({
        caregiverName: form.caregiverName.trim(),
        babyName: form.babyName.trim(),
        babyBirthDate: form.babyBirthDate.trim(),
        birthWeightKg: parseNumber(form.birthWeightKg),
        currentWeightKg: parseNumber(form.currentWeightKg),
        heightCm: parseNumber(form.heightCm),
        babyNotes: form.babyNotes.trim() || undefined,
        babyPhotoUri: form.babyPhotoUri || undefined,
      });
      haptics.success();
      toast.success(t('profile.profileUpdated'));
    } catch (error: any) {
      haptics.error();
      toast.error(error?.message ?? t('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [form, saveProfile, t, toast]);

  const handlePickPhoto = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      haptics.warning();
      toast.warning(t('profile.allowPhotoAccess'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      setForm((current) => ({ ...current, babyPhotoUri: result.assets[0]?.uri ?? current.babyPhotoUri }));
    }
  }, [setForm, t, toast]);

  const handleAddBaby = useCallback(async () => {
    if (!form.babyName.trim() || !form.babyBirthDate.trim()) {
      toast.warning(t('profile.childRequired'));
      return;
    }

    const baby = {
      id: generateBabyId(),
      name: form.babyName.trim(),
      birthDate: form.babyBirthDate.trim(),
      sex: profile?.babySex ?? 'unspecified',
      birthWeightKg: parseNumber(form.birthWeightKg),
      currentWeightKg: parseNumber(form.currentWeightKg),
      heightCm: parseNumber(form.heightCm),
      notes: form.babyNotes.trim() || undefined,
      photoUri: form.babyPhotoUri || undefined,
      language: (profile?.language ?? 'fr') as any,
      createdAt: new Date().toISOString(),
    };

    await saveBaby(baby);
    await refreshProfileData();
    setActiveBabyIdLocal(baby.id);
    toast.success(t('profile.childSaved'));
  }, [form, profile?.babySex, profile?.language, refreshProfileData, t, toast]);

  const handleSetActiveBaby = useCallback(
    async (babyId: string) => {
      await setActiveBabyId(babyId);
      setActiveBabyIdLocal(babyId);
      toast.success(t('profile.childActivated'));
    },
    [t, toast],
  );

  const handleRemoveBaby = useCallback(
    async (babyId: string) => {
      await removeBaby(babyId);
      await refreshProfileData();
      toast.success(t('profile.childRemoved'));
    },
    [refreshProfileData, t, toast],
  );

  const handleSyncNow = useCallback(async () => {
    if (!profile) {
      toast.error(t('profile.signInRequired'));
      return;
    }

    setSyncing(true);
    try {
      const result = await flushQueuedOperations(profile.uid);
      setQueuedSyncCount(0);
      haptics.success();
      toast.success(format('profile.syncFlushed', { count: result.flushed }));
    } catch (error: any) {
      haptics.error();
      toast.error(error?.message ?? t('profile.syncError'));
    } finally {
      setSyncing(false);
    }
  }, [profile, t, toast]);

  const handleRemoveSession = useCallback(
    async (sessionId: string) => {
      if (!user) return;
      const target = sessions.find((item) => item.id === sessionId);
      if (!target) return;
      await deleteSession(user.uid, target);
      toast.success('Session removed.');
    },
    [sessions, toast, user],
  );

  const language = profile?.language ?? 'fr';
  const childSummary = useMemo(
    () => (activeBabyId ? babies.find((baby) => baby.id === activeBabyId) : null),
    [activeBabyId, babies],
  );

  return (
    <Page>
      <Heading eyebrow={t('tabs.profile')} title={t('profile.section')} subtitle={t('profile.subtitle')} />

      <Card>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Pressable
            onPress={handlePickPhoto}
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              overflow: 'hidden',
              backgroundColor: colors.backgroundAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {form.babyPhotoUri ? (
              <Image source={{ uri: form.babyPhotoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Text style={{ color: colors.primary, fontWeight: '800' }}>{t('profile.photo')}</Text>
            )}
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.muted }}>
              {t('profile.modeLabel')}{guestMode ? t('profile.modeGuest') : t('profile.modeCloud')}
            </Text>
            <Text style={{ color: colors.muted }}>
              {t('profile.languageLabel')}{language.toUpperCase()}
            </Text>
            {childSummary ? (
              <Text style={{ color: colors.muted }}>{format('profile.activeChildLabel', { name: childSummary.name })}</Text>
            ) : null}
          </View>
        </View>

        <Input label={t('profile.caregiverLabel')} value={form.caregiverName} onChangeText={(value) => handleFieldChange('caregiverName', value)} />
        <Input label={t('profile.babyNameLabel')} value={form.babyName} onChangeText={(value) => handleFieldChange('babyName', value)} />
        <Input label={t('profile.birthDateLabel')} value={form.babyBirthDate} onChangeText={(value) => handleFieldChange('babyBirthDate', value)} />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Input
              label={t('profile.birthWeightLabel')}
              value={form.birthWeightKg}
              onChangeText={(value) => handleFieldChange('birthWeightKg', value)}
              keyboardType="decimal-pad"
              inputMode="decimal"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label={t('profile.currentWeightLabel')}
              value={form.currentWeightKg}
              onChangeText={(value) => handleFieldChange('currentWeightKg', value)}
              keyboardType="decimal-pad"
              inputMode="decimal"
            />
          </View>
        </View>

        <Input
          label={t('profile.heightLabel')}
          value={form.heightCm}
          onChangeText={(value) => handleFieldChange('heightCm', value)}
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
        <Input label={t('profile.notesLabel')} value={form.babyNotes} onChangeText={(value) => handleFieldChange('babyNotes', value)} multiline />

        <Segment value={language} onChange={(value) => void setContextLanguage(value as any)} options={languageOptions} />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button label={t('common.save')} onPress={handleSave} loading={saving} disabled={saving} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label={t('profile.themeImport')} onPress={() => router.push('/(app)/(tabs)/settings-theme' as any)} variant="secondary" />
          </View>
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{t('profile.childrenTitle')}</Text>
          <Button label={showChildren ? t('modal.hide') : t('modal.show')} onPress={() => setShowChildren((value) => !value)} variant="ghost" />
        </View>

        {showChildren && (
          <>
            {babies.length ? (
              babies.map((baby) => (
                <View
                  key={baby.id}
                  style={{
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: activeBabyId === baby.id ? colors.primary : colors.border,
                    padding: 12,
                    marginTop: 8,
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '700' }}>
                    {baby.name} {activeBabyId === baby.id ? `(${t('profile.activeLabel')})` : ''}
                  </Text>
                  <Text style={{ color: colors.muted }}>{baby.birthDate}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Button
                        label={t('profile.setActive')}
                        onPress={() => handleSetActiveBaby(baby.id)}
                        variant={activeBabyId === baby.id ? 'secondary' : 'ghost'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button label={t('profile.removeChild')} onPress={() => handleRemoveBaby(baby.id)} variant="ghost" />
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <EmptyState
                icon="person-add-outline"
                title={t('profile.noBabiesTitle')}
                body={t('profile.noBabiesBody')}
                action={<Button label={t('profile.addBaby')} onPress={handleAddBaby} />}
              />
            )}
            {babies.length ? (
              <Button label={t('profile.addBaby')} onPress={handleAddBaby} variant="ghost" />
            ) : null}
          </>
        )}
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{t('profile.sessionTitle')}</Text>
          <Button label={showSession ? t('modal.hide') : t('modal.show')} onPress={() => setShowSession((value) => !value)} variant="ghost" />
        </View>

        {showSession && (
          <>
            <Text style={{ color: colors.muted }}>Current session email: {user?.email ?? profile?.authEmail ?? t('profile.emailUnknown')}</Text>
            <Text style={{ color: colors.muted }}>{t('profile.pairing')}: {pairingCode ?? t('profile.pairingNone')}</Text>
            <Text style={{ color: colors.muted }}>{t('profile.queuedSync')}{queuedSyncCount}</Text>
            <Text style={{ color: colors.text, fontWeight: '700', marginTop: 10 }}>Open sessions</Text>
            {sessions.length ? (
              sessions.map((item) => {
                const isCurrent = item.email === (user?.email ?? profile?.authEmail);
                return (
                  <View key={item.id} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10, marginTop: 8 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{item.email} {isCurrent ? '(current)' : ''}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{item.device}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{new Date(item.createdAt ?? Date.now()).toLocaleString()}</Text>
                    <Button label={item.isOwner ? 'Owner session' : 'Remove session'} onPress={() => void handleRemoveSession(item.id)} variant="ghost" disabled={item.isOwner} />
                  </View>
                );
              })
            ) : (
              <Text style={{ color: colors.muted, marginTop: 6 }}>No open sessions found.</Text>
            )}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Button label={t('profile.syncNow')} onPress={handleSyncNow} variant="ghost" loading={syncing} disabled={syncing} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label={t('profile.pairPartner')} onPress={() => router.push('/pair')} variant="ghost" />
              </View>
            </View>
            <Button label={t('profile.logout')} onPress={signOut} variant="danger" />
          </>
        )}
      </Card>

      <DataImporter />
    </Page>
  );
}
