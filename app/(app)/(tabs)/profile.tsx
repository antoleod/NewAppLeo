import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Image, Pressable, Text, View, RefreshControl, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeIn, ZoomIn, useSharedValue, withSpring } from 'react-native-reanimated';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Button, Card, EmptyState, Heading, Input, Page, Segment } from '@/components/ui';
import { DateTimeField } from '@/components/DateTimeField';
import { ExpandableSection } from '@/components/ExpandableSection';
import { ProfileSkeleton } from '@/components/ProfileSkeleton';
import { AvatarInitials } from '@/components/AvatarInitials';
import { BabyEditSheet } from '@/components/BabyEditSheet';
import { EntryEditSheet } from '@/components/EntryEditSheet';
import { WeightHistoryChart } from '@/components/WeightHistoryChart';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocale } from '@/context/LocaleContext';
import { getActiveBaby, getBabies, saveBaby, setActiveBabyId, removeBaby } from '@/lib/storage';
import { DataImporter } from '@/components/DataImporter';
import { getLocalPairingSession } from '@/services/pairingService';
import { flushQueuedOperations, loadQueuedOperations } from '@/lib/sync';
import { useToast } from '@/components/Toast';
import { haptics } from '@/lib/haptics';
import {
  clearCurrentSession,
  deleteSession,
  getCurrentSessionId,
  registerCurrentSession,
  watchSessions,
  type SessionItem,
} from '@/services/sessionService';

const languageOptions = [
  { label: 'FR', value: 'fr' },
  { label: 'ES', value: 'es' },
  { label: 'EN', value: 'en' },
  { label: 'NL', value: 'nl' },
];

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function generateBabyId() {
  return globalThis.crypto?.randomUUID?.() ?? `baby_${Date.now()}`;
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function dateToIsoString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function isoStringToDate(iso: string): Date {
  if (!iso) return new Date();
  return new Date(iso + 'T00:00:00.000Z');
}

function formatDateForDisplay(iso: string, locale: string): string {
  if (!iso) return '';
  const date = new Date(iso + 'T00:00:00.000Z');
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString(locale === 'es' ? 'es-ES' : locale === 'en' ? 'en-US' : locale === 'nl' ? 'nl-NL' : 'fr-FR', options);
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
    babyBirthDate: isoStringToDate(profile?.babyBirthDate ?? ''),
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
  const [showAddBabyForm, setShowAddBabyForm] = useState(false);
  const [newBabyName, setNewBabyName] = useState('');
  const [newBabyBirthDate, setNewBabyBirthDate] = useState(new Date());
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingBaby, setEditingBaby] = useState<typeof babies[0] | null>(null);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const photoScale = useSharedValue(1);
  const bottomSheetModalRef = useRef<any>(null);
  const entrySheetModalRef = useRef<any>(null);

  useEffect(() => {
    setForm({
      caregiverName: profile?.caregiverName ?? '',
      babyName: profile?.babyName ?? 'Leo',
      babyBirthDate: isoStringToDate(profile?.babyBirthDate ?? ''),
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
    refreshProfileData().then(() => setIsLoading(false));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshProfileData();
    });
    return () => subscription.remove();
  }, [refreshProfileData]);

  useEffect(() => {
    if (!user || guestMode) return;
    const unsub = watchSessions(user.uid, setSessions);
    registerCurrentSession(user.uid, user.email ?? profile?.authEmail ?? '')
      .then((id) => setCurrentSessionId(id))
      .catch(() => {
        getCurrentSessionId(user.uid).then((id) => { if (id) setCurrentSessionId(id); });
      });
    return () => unsub();
  }, [user, guestMode, profile?.authEmail]);

  const handleFieldChange = useCallback(
    (field: keyof typeof form, value: string | Date) => {
      setForm((current) => ({ ...current, [field]: value }));
    },
    [setForm],
  );

  const handleSave = useCallback(async () => {
    haptics.medium();
    setSaving(true);
    try {
      const currentWeight = form.currentWeightKg ? `${form.currentWeightKg}kg` : '';
      await saveProfile({
        caregiverName: form.caregiverName.trim(),
        babyName: form.babyName.trim(),
        babyBirthDate: dateToIsoString(form.babyBirthDate as Date),
        birthWeightKg: parseNumber(form.birthWeightKg),
        currentWeightKg: parseNumber(form.currentWeightKg),
        heightCm: parseNumber(form.heightCm),
        babyNotes: form.babyNotes.trim() || undefined,
        babyPhotoUri: form.babyPhotoUri || undefined,
      });
      haptics.success();
      const msg = currentWeight ? `✅ ${form.babyName} updated · ${currentWeight}` : `✅ ${form.babyName} updated`;
      toast.success(msg);
    } catch (error: any) {
      haptics.error();
      toast.error(error?.message ?? t('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [form, saveProfile, t, toast]);

  const handlePickPhoto = useCallback(async () => {
    haptics.light();
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
      photoScale.value = withSpring(1.1, { damping: 8, mass: 1 }, () => {
        photoScale.value = withSpring(1, { damping: 8, mass: 1 });
      });
      haptics.success();
      setForm((current) => ({ ...current, babyPhotoUri: result.assets[0]?.uri ?? current.babyPhotoUri }));
    }
  }, [setForm, t, toast, photoScale]);


  const handleAddNewBaby = useCallback(async () => {
    if (!newBabyName.trim()) {
      haptics.warning();
      toast.warning(t('profile.childRequired'));
      return;
    }
    haptics.medium();
    const baby = {
      id: generateBabyId(),
      name: newBabyName.trim(),
      birthDate: dateToIsoString(newBabyBirthDate),
      sex: 'unspecified' as const,
      language: (profile?.language ?? 'en') as any,
      createdAt: new Date().toISOString(),
    };
    await saveBaby(baby);
    await refreshProfileData();
    setNewBabyName('');
    setNewBabyBirthDate(new Date());
    setShowAddBabyForm(false);
    haptics.success();
    toast.success(t('profile.childSaved'));
  }, [newBabyName, newBabyBirthDate, profile?.language, refreshProfileData, t, toast]);

  const handleSetActiveBaby = useCallback(
    async (babyId: string) => {
      haptics.medium();
      const babyName = babies.find((b) => b.id === babyId)?.name ?? 'Baby';
      await setActiveBabyId(babyId);
      setActiveBabyIdLocal(babyId);
      haptics.success();
      toast.success(format('profile.activeChildLabel', { name: babyName }));
    },
    [babies, format, toast],
  );

  const handleRemoveBaby = useCallback(
    (babyId: string) => {
      const babyName = babies.find((b) => b.id === babyId)?.name ?? 'Baby';
      Alert.alert(
        t('profile.removeChild'),
        format('profile.removeChildConfirm', { babyName }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('profile.removeBaby'),
            style: 'destructive',
            onPress: async () => {
              haptics.warning();
              await removeBaby(babyId);
              // If the removed baby was active, activate the next available one
              if (activeBabyId === babyId) {
                const remaining = babies.filter((b) => b.id !== babyId);
                if (remaining.length > 0) {
                  await setActiveBabyId(remaining[0].id);
                }
              }
              await refreshProfileData();
              haptics.success();
              toast.success(t('profile.childRemoved'));
            },
          },
        ]
      );
    },
    [activeBabyId, babies, format, refreshProfileData, t, toast],
  );

  const handleSyncNow = useCallback(async () => {
    if (!profile) {
      toast.error(t('profile.signInRequired'));
      return;
    }

    setSyncing(true);
    try {
      const result = await flushQueuedOperations(profile.uid);
      const queuedOperations = await loadQueuedOperations();
      setQueuedSyncCount(queuedOperations.length);
      haptics.success();
      toast.success(format('profile.syncFlushed', { count: result.flushed }));
    } catch (error: any) {
      haptics.error();
      const message = String(error?.message ?? '');
      const code = String(error?.code ?? '');
      if (code.includes('permission-denied') || /insufficient permissions|missing or insufficient/i.test(message)) {
        toast.error('Sync blocked by Firestore rules for this account. Please verify database permissions.');
      } else {
        toast.error(error?.message ?? t('profile.syncError'));
      }
      const queuedOperations = await loadQueuedOperations();
      setQueuedSyncCount(queuedOperations.length);
    } finally {
      setSyncing(false);
    }
  }, [profile, t, toast]);

  const handleRemoveSession = useCallback(
    async (sessionId: string) => {
      haptics.light();
      if (!user) return;
      const target = sessions.find((item) => item.id === sessionId);
      if (!target) return;
      try {
        await deleteSession(user.uid, target);
        haptics.success();
        toast.success(t('profile.sessionRemoved'));
      } catch (error: any) {
        haptics.error();
        toast.error(error?.message ?? t('errors.saveFailed'));
      }
    },
    [sessions, t, toast, user],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    haptics.light();
    try {
      await refreshProfileData();
      haptics.success();
    } catch {
      haptics.error();
    } finally {
      setRefreshing(false);
    }
  }, [refreshProfileData]);

  const handleEditBaby = useCallback(
    (baby: typeof babies[0]) => {
      setEditingBaby(baby);
      bottomSheetModalRef.current?.present();
    },
    []
  );

  const handleSaveBaby = useCallback(
    async (updated: any) => {
      await saveBaby(updated);
      await refreshProfileData();
    },
    [refreshProfileData]
  );

  const { updateEntry, deleteEntry } = useAppData();

  const handleEditEntry = useCallback(
    (entry: any) => {
      setEditingEntry(entry);
      entrySheetModalRef.current?.present();
    },
    []
  );

  const handleSaveEntry = useCallback(
    async (updated: any) => {
      await updateEntry(updated.id, updated);
    },
    [updateEntry]
  );

  const handleDeleteEntry = useCallback(
    async (id: string) => {
      await deleteEntry(id);
    },
    [deleteEntry]
  );

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      if (user?.uid) await clearCurrentSession(user.uid);
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }, [signOut, user]);

  const language = profile?.language ?? 'fr';
  const childSummary = useMemo(
    () => (activeBabyId ? babies.find((baby) => baby.id === activeBabyId) : null),
    [activeBabyId, babies],
  );

  if (isLoading) {
    return (
      <Page>
        <Heading eyebrow={t('tabs.profile')} title={t('profile.section')} subtitle={t('profile.subtitle')} />
        <Card>
          <ProfileSkeleton />
        </Card>
      </Page>
    );
  }

  return (
    <BottomSheetModalProvider>
      <Page>
      <Heading eyebrow={t('tabs.profile')} title={t('profile.section')} subtitle={t('profile.subtitle')} />

      <Card>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Animated.View
            style={{
              transform: [{ scale: photoScale }],
            }}
          >
            <AvatarInitials
              name={form.babyName}
              photoUri={form.babyPhotoUri}
              size={72}
              onPress={handlePickPhoto}
            />
          </Animated.View>

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

        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>{t('profile.babyNameLabel')}</Text>
        <Input label={t('profile.babyNameLabel')} value={form.babyName} onChangeText={(value) => handleFieldChange('babyName', value)} />
        <DateTimeField label={t('profile.birthDateLabel')} value={form.babyBirthDate as Date} onChange={(value) => handleFieldChange('babyBirthDate', value)} />

        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>{t('profile.measurementsTitle')}</Text>
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

        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>{t('profile.weightHistory')}</Text>
        <WeightHistoryChart limit={5} onEditEntry={handleEditEntry} />

        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>{t('profile.preferencesTitle')}</Text>
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
          <Button
            label={showChildren ? t('modal.hide') : t('modal.show')}
            onPress={() => {
              haptics.light();
              setShowChildren((value) => !value);
            }}
            variant="ghost"
          />
        </View>

        <ExpandableSection isExpanded={showChildren}>
          <>
            {babies.length > 0 ? (
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{baby.name}</Text>
                    {activeBabyId === baby.id && (
                      <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: `${colors.primary}22` }}>
                        <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '800' }}>{t('profile.activeLabel')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{baby.birthDate}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Button label={t('common.edit')} onPress={() => handleEditBaby(baby)} variant="primary" size="sm" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        label={t('profile.setActive')}
                        onPress={() => void handleSetActiveBaby(baby.id)}
                        variant={activeBabyId === baby.id ? 'secondary' : 'ghost'}
                        size="sm"
                        disabled={activeBabyId === baby.id}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button label={t('common.delete')} onPress={() => handleRemoveBaby(baby.id)} variant="ghost" size="sm" />
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <EmptyState
                icon="person-add-outline"
                title={t('profile.noBabiesTitle')}
                body={t('profile.noBabiesBody')}
              />
            )}

            {/* Add new baby — inline form */}
            {showAddBabyForm ? (
              <View style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, marginTop: 12, gap: 8 }}>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 4 }}>{t('profile.addBaby')}</Text>
                <Input
                  label={t('profile.babyNameLabel')}
                  value={newBabyName}
                  onChangeText={setNewBabyName}
                  autoCapitalize="words"
                />
                <DateTimeField
                  label={t('profile.birthDateLabel')}
                  value={newBabyBirthDate}
                  onChange={(value) => setNewBabyBirthDate(value as Date)}
                />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <View style={{ flex: 1 }}>
                    <Button label={t('common.save')} onPress={() => void handleAddNewBaby()} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label={t('common.cancel')}
                      onPress={() => {
                        setShowAddBabyForm(false);
                        setNewBabyName('');
                        setNewBabyBirthDate(new Date());
                      }}
                      variant="ghost"
                    />
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ marginTop: 10 }}>
                <Button
                  label={t('profile.addBaby')}
                  onPress={() => {
                    haptics.light();
                    setShowAddBabyForm(true);
                  }}
                  variant="ghost"
                />
              </View>
            )}
          </>
        </ExpandableSection>
      </Card>

      <Card>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
              {t('profile.sessionTitle')}
            </Text>
            {!guestMode && sessions.length > 0 && (
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>
                {sessions.length} {t('profile.openSessions').toLowerCase()}
              </Text>
            )}
          </View>
          <Button
            label={showSession ? t('modal.hide') : t('modal.show')}
            onPress={() => { haptics.light(); setShowSession((v) => !v); }}
            variant="ghost"
          />
        </View>

        <ExpandableSection isExpanded={showSession}>
          {guestMode ? (
            <View style={{ paddingTop: 8 }}>
              <Text style={{ color: colors.muted }}>{t('profile.guestSessionInfo')}</Text>
            </View>
          ) : (
            <View style={{ paddingTop: 4 }}>
              {/* Account meta */}
              <View style={{ gap: 3, paddingBottom: 10 }}>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {user?.email ?? profile?.authEmail ?? t('profile.emailUnknown')}
                </Text>
                {pairingCode ? (
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {t('profile.pairing')}: {pairingCode}
                  </Text>
                ) : null}
                {queuedSyncCount > 0 ? (
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {t('profile.queuedSync')}{queuedSyncCount}
                  </Text>
                ) : null}
              </View>

              {/* Section label */}
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13, marginBottom: 4 }}>
                {t('profile.openSessions')}
              </Text>

              {/* Session cards */}
              {sessions.length > 0 ? (
                sessions.map((item) => {
                  const isCurrent = item.id === currentSessionId;
                  const canRevoke = !item.isOwner && !isCurrent;
                  const timeLabel = item.lastActiveAt ?? item.createdAt;
                  return (
                    <View
                      key={item.id}
                      style={{
                        borderWidth: 1,
                        borderColor: isCurrent ? colors.primary : colors.border,
                        borderRadius: 14,
                        padding: 12,
                        marginTop: 6,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                        {/* Platform icon */}
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            backgroundColor: `${colors.primary}18`,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons
                            name={item.platform === 'web' ? 'laptop-outline' : 'phone-portrait-outline'}
                            size={18}
                            color={isCurrent ? colors.primary : colors.muted}
                          />
                        </View>

                        {/* Info */}
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text
                              style={{
                                color: colors.text,
                                fontWeight: '700',
                                fontSize: 14,
                                flexShrink: 1,
                              }}
                            >
                              {item.device}
                            </Text>
                            {isCurrent && (
                              <View
                                style={{
                                  paddingHorizontal: 7,
                                  paddingVertical: 2,
                                  borderRadius: 8,
                                  backgroundColor: `${colors.primary}22`,
                                }}
                              >
                                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '800' }}>
                                  {t('profile.thisDevice')}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ color: colors.muted, fontSize: 12 }}>{item.email}</Text>
                          {timeLabel ? (
                            <Text style={{ color: colors.muted, fontSize: 11 }}>
                              {t('profile.sessionStarted')}: {formatRelativeTime(timeLabel)}
                            </Text>
                          ) : null}
                        </View>

                        {/* Revoke */}
                        {canRevoke && (
                          <Pressable
                            onPress={() => void handleRemoveSession(item.id)}
                            style={({ pressed }) => ({
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: '#ef4444',
                              opacity: pressed ? 0.5 : 1,
                              marginTop: 1,
                            })}
                            hitSlop={8}
                          >
                            <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700' }}>
                              {t('profile.revokeSession')}
                            </Text>
                          </Pressable>
                        )}
                      </View>

                      {/* Owner badge */}
                      {item.isOwner && (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            marginTop: 6,
                            paddingLeft: 46,
                          }}
                        >
                          <Ionicons name="shield-checkmark-outline" size={11} color={colors.muted} />
                          <Text style={{ color: colors.muted, fontSize: 11 }}>
                            {t('profile.ownerSession')}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                  {t('profile.noSessions')}
                </Text>
              )}

              {/* Action row */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label={t('profile.syncNow')}
                    onPress={handleSyncNow}
                    variant="ghost"
                    loading={syncing}
                    disabled={syncing}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label={t('profile.pairPartner')}
                    onPress={() => router.push('/pair')}
                    variant="ghost"
                  />
                </View>
              </View>
            </View>
          )}
        </ExpandableSection>

        {/* Logout — always visible, outside the expandable section */}
        <View style={{ marginTop: 10 }}>
          <Button
            label={t('profile.logout')}
            onPress={handleSignOut}
            loading={signingOut}
            disabled={signingOut}
            variant="danger"
          />
        </View>
      </Card>

      <DataImporter />

      {editingBaby && (
        <BabyEditSheet
          baby={editingBaby}
          onSave={handleSaveBaby}
          onClose={() => setEditingBaby(null)}
          bottomSheetModalRef={bottomSheetModalRef}
        />
      )}

      {editingEntry && (
        <EntryEditSheet
          entry={editingEntry}
          onSave={handleSaveEntry}
          onClose={() => setEditingEntry(null)}
          onDelete={handleDeleteEntry}
          bottomSheetModalRef={entrySheetModalRef}
        />
      )}
    </Page>
    </BottomSheetModalProvider>
  );
}
