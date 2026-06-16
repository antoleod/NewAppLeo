import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppState, Platform, Pressable, Share, Text, View } from 'react-native';
import { confirmAction, alertInfo } from '@/utils/confirm';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeIn, useSharedValue, withSpring } from 'react-native-reanimated';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Button, Card, Heading, Input, Page, Segment , DateTimeField , ExpandableSection , AvatarInitials , useToast } from '@/components/shared';


import { ProfileSkeleton , BabyEditSheet , DataImporter } from '@/components/profile';


import { EntryEditSheet } from '@/components/history';
import { WeightHistoryChart } from '@/components/insights';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocale } from '@/context/LocaleContext';
import { getActiveBaby, getBabies, saveBaby, setActiveBabyId, removeBaby, clearLocalSession, type BabyProfile } from '@/lib/storage';
import { getAgeInMonths, getWHORecommendation } from '@/lib/who-recommendations';

import { getLocalPairingSession } from '@/services/pairingService';
import { loadQueuedOperations } from '@/lib/sync';

import { haptics } from '@/utils/haptics';
import type { UnitSystem } from '@/types';
import { clearCurrentSession } from '@/services/sessionService';
import {
  checkHeadCircRange, checkHeightRange, checkWeightRange,
  clampGoal, dateToIsoString, formatDateForDisplay, formatHeightDisplay, formatWeightDisplay,
  generateBabyId, getCorrectedAgeLabel, isoStringToDate,
  kgToLb, lbToKg, cmToIn, inToCm, parseHeightInput, parseWeightInput,
  sanitizeProfileForExport,
} from '@/utils/profileHelpers';

const languageOptions = [
  { label: 'Français', value: 'fr' },
  { label: 'Español', value: 'es' },
  { label: 'English', value: 'en' },
  { label: 'Nederlands', value: 'nl' },
];
const NOTES_MAX = 500;

export default function ProfileScreen() {
  const { colors, theme } = useTheme();
  const { t, format } = useTranslation();
  const { language: localeLanguage, setLanguage: setContextLanguage } = useLocale();
  const { profile, guestMode, saveProfile, signOut, user } = useAuth();
  const { updateEntry, deleteEntry, addEntry, entries } = useAppData();
  const toast = useToast();

  const initialUnits: UnitSystem = profile?.unitSystem ?? 'metric';
  const [form, setForm] = useState({
    caregiverName: profile?.caregiverName ?? '',
    partnerName: profile?.partnerName ?? '',
    babyName: profile?.babyName ?? 'Baby',
    babySex: (profile?.babySex ?? 'unspecified') as 'female' | 'male' | 'unspecified',
    babyBirthDate: isoStringToDate(profile?.babyBirthDate ?? ''),
    birthWeightKg: profile?.birthWeightKg ? String(profile.birthWeightKg) : '',
    birthHeightCm: profile?.birthHeightCm ? String(profile.birthHeightCm) : '',
    birthHeadCircCm: profile?.birthHeadCircCm ? String(profile.birthHeadCircCm) : '',
    currentWeightKg: profile?.currentWeightKg ? String(profile.currentWeightKg) : '',
    heightCm: profile?.heightCm ? String(profile.heightCm) : '',
    headCircCm: profile?.headCircCm ? String(profile.headCircCm) : '',
    babyNotes: profile?.babyNotes ?? '',
    babyPhotoUri: profile?.babyPhotoUri ?? '',
    prematureWeeks: profile?.prematureWeeks ? String(profile.prematureWeeks) : '',
    prematureActive: profile?.prematureWeeks ? '1' : '',
    unitSystem: initialUnits,
    goalFeedingsPerDay: String(profile?.goalFeedingsPerDay ?? 8),
    goalSleepHoursPerDay: String(profile?.goalSleepHoursPerDay ?? 14),
    goalDiapersPerDay: String(profile?.goalDiapersPerDay ?? 6),
  });
  const [babies, setBabies] = useState<BabyProfile[]>([]);
  const [activeBabyId, setActiveBabyIdLocal] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [queuedSyncCount, setQueuedSyncCount] = useState(0);
  const [showChildren, setShowChildren] = useState(false);
  const [showAddBabyForm, setShowAddBabyForm] = useState(false);
  const [newBabyName, setNewBabyName] = useState('');
  const [newBabyBirthDate, setNewBabyBirthDate] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [deletingBabyId, setDeletingBabyId] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBaby, setEditingBaby] = useState<typeof babies[0] | null>(null);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const photoScale = useSharedValue(1);
  const bottomSheetModalRef = useRef<any>(null);
  const entrySheetModalRef = useRef<any>(null);
  const insets = useSafeAreaInsets();
  const isEditingRef = useRef(false);
  const [initialForm, setInitialForm] = useState({ ...form });
  const [fieldErrors, setFieldErrors] = useState<{
    birthWeightKg?: string;
    birthHeightCm?: string;
    birthHeadCircCm?: string;
    currentWeightKg?: string;
    heightCm?: string;
    headCircCm?: string;
  }>({});
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);

  useEffect(() => {
    if (isEditingRef.current) return;
    const activeBaby = activeBabyId ? babies.find((b) => b.id === activeBabyId) : null;
    const units: UnitSystem = profile?.unitSystem ?? 'metric';
    const next = activeBaby
      ? {
          caregiverName: profile?.caregiverName ?? '',
          partnerName: profile?.partnerName ?? '',
          babyName: activeBaby.name,
          babySex: (activeBaby.sex ?? 'unspecified') as 'female' | 'male' | 'unspecified',
          babyBirthDate: isoStringToDate(activeBaby.birthDate),
          birthWeightKg: activeBaby.birthWeightKg ? String(activeBaby.birthWeightKg) : '',
          birthHeightCm: activeBaby.birthHeightCm ? String(activeBaby.birthHeightCm) : '',
          birthHeadCircCm: activeBaby.birthHeadCircCm ? String(activeBaby.birthHeadCircCm) : '',
          currentWeightKg: activeBaby.currentWeightKg ? String(activeBaby.currentWeightKg) : '',
          heightCm: activeBaby.heightCm ? String(activeBaby.heightCm) : '',
          headCircCm: activeBaby.headCircCm ? String(activeBaby.headCircCm) : '',
          babyNotes: activeBaby.notes ?? '',
          babyPhotoUri: activeBaby.photoUri ?? '',
          prematureWeeks: profile?.prematureWeeks ? String(profile.prematureWeeks) : '',
          prematureActive: profile?.prematureWeeks ? '1' : '',
          unitSystem: units,
          goalFeedingsPerDay: String(profile?.goalFeedingsPerDay ?? 8),
          goalSleepHoursPerDay: String(profile?.goalSleepHoursPerDay ?? 14),
          goalDiapersPerDay: String(profile?.goalDiapersPerDay ?? 6),
        }
      : {
          caregiverName: profile?.caregiverName ?? '',
          partnerName: profile?.partnerName ?? '',
          babyName: profile?.babyName ?? 'Baby',
          babySex: (profile?.babySex ?? 'unspecified') as 'female' | 'male' | 'unspecified',
          babyBirthDate: isoStringToDate(profile?.babyBirthDate ?? ''),
          birthWeightKg: profile?.birthWeightKg ? String(profile.birthWeightKg) : '',
          birthHeightCm: profile?.birthHeightCm ? String(profile.birthHeightCm) : '',
          birthHeadCircCm: profile?.birthHeadCircCm ? String(profile.birthHeadCircCm) : '',
          currentWeightKg: profile?.currentWeightKg ? String(profile.currentWeightKg) : '',
          heightCm: profile?.heightCm ? String(profile.heightCm) : '',
          headCircCm: profile?.headCircCm ? String(profile.headCircCm) : '',
          babyNotes: profile?.babyNotes ?? '',
          babyPhotoUri: profile?.babyPhotoUri ?? '',
          prematureWeeks: profile?.prematureWeeks ? String(profile.prematureWeeks) : '',
          prematureActive: profile?.prematureWeeks ? '1' : '',
          unitSystem: units,
          goalFeedingsPerDay: String(profile?.goalFeedingsPerDay ?? 8),
          goalSleepHoursPerDay: String(profile?.goalSleepHoursPerDay ?? 14),
          goalDiapersPerDay: String(profile?.goalDiapersPerDay ?? 6),
        };
    setForm(next);
    setInitialForm(next);
  }, [profile, babies, activeBabyId]);

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
  }, []);

  useEffect(() => {
    refreshProfileData().then(() => setIsLoading(false));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshProfileData();
    });
    return () => subscription.remove();
  }, [refreshProfileData]);

  const handleFieldChange = useCallback(
    (field: keyof typeof form, value: string | Date) => {
      isEditingRef.current = true;
      setForm((current) => ({ ...current, [field]: value }));
      setFieldErrors((prev) => {
        if (!(field in prev)) return prev;
        const next = { ...prev };
        delete next[field as keyof typeof fieldErrors];
        return next;
      });
    },
    [],
  );

  const handleSave = useCallback(async () => {
    const errors: typeof fieldErrors = {};
    const numericFields: (keyof typeof fieldErrors)[] = [
      'birthWeightKg', 'birthHeightCm', 'birthHeadCircCm',
      'currentWeightKg', 'heightCm', 'headCircCm',
    ];
    for (const f of numericFields) {
      const v = (form as any)[f];
      if (v && !Number.isFinite(Number(v))) errors[f] = t('profile.invalidNumber');
    }
    if (Object.keys(errors).length > 0) {
      haptics.warning();
      setFieldErrors(errors);
      return;
    }

    haptics.medium();
    setSaving(true);
    try {
      const units = form.unitSystem;
      const nextBirthWeightKg = form.birthWeightKg ? parseWeightInput(form.birthWeightKg, units) : undefined;
      const nextBirthHeightCm = form.birthHeightCm ? parseHeightInput(form.birthHeightCm, units) : undefined;
      const nextBirthHeadCircCm = form.birthHeadCircCm ? parseHeightInput(form.birthHeadCircCm, units) : undefined;
      const nextCurrentWeightKg = form.currentWeightKg ? parseWeightInput(form.currentWeightKg, units) : undefined;
      const nextHeightCm = form.heightCm ? parseHeightInput(form.heightCm, units) : undefined;
      const nextHeadCircCm = form.headCircCm ? parseHeightInput(form.headCircCm, units) : undefined;
      const previousWeightKg = profile?.currentWeightKg;
      const previousHeightCm = profile?.heightCm;
      const previousHeadCircCm = profile?.headCircCm;
      const weightChanged = nextCurrentWeightKg !== undefined && nextCurrentWeightKg !== previousWeightKg;
      const heightChanged = nextHeightCm !== undefined && nextHeightCm !== previousHeightCm;
      const headCircChanged = nextHeadCircCm !== undefined && nextHeadCircCm !== previousHeadCircCm;

      const activeBaby = activeBabyId ? babies.find((b) => b.id === activeBabyId) : null;

      if (activeBaby) {
        await saveBaby({
          ...activeBaby,
          name: form.babyName.trim(),
          sex: form.babySex,
          birthDate: dateToIsoString(form.babyBirthDate as Date),
          birthWeightKg: nextBirthWeightKg,
          birthHeightCm: nextBirthHeightCm,
          birthHeadCircCm: nextBirthHeadCircCm,
          currentWeightKg: nextCurrentWeightKg,
          heightCm: nextHeightCm,
          headCircCm: nextHeadCircCm,
          notes: form.babyNotes.trim() || undefined,
          photoUri: form.babyPhotoUri || undefined,
        });
        await refreshProfileData();
      }

      await saveProfile({
        caregiverName: form.caregiverName.trim(),
        partnerName: form.partnerName.trim() || undefined,
        babyName: form.babyName.trim(),
        babySex: form.babySex,
        babyBirthDate: dateToIsoString(form.babyBirthDate as Date),
        birthWeightKg: nextBirthWeightKg,
        birthHeightCm: nextBirthHeightCm,
        birthHeadCircCm: nextBirthHeadCircCm,
        currentWeightKg: nextCurrentWeightKg,
        heightCm: nextHeightCm,
        headCircCm: nextHeadCircCm,
        babyNotes: form.babyNotes.trim() || undefined,
        babyPhotoUri: form.babyPhotoUri || undefined,
        prematureWeeks: form.prematureWeeks ? Number(form.prematureWeeks) : undefined,
        unitSystem: units,
        goalFeedingsPerDay: Number(form.goalFeedingsPerDay) || 8,
        goalSleepHoursPerDay: Number(form.goalSleepHoursPerDay) || 14,
        goalDiapersPerDay: Number(form.goalDiapersPerDay) || 6,
      });

      // Dedupe per-day: update today's measurement entry if there is one, else
      // create a new one. Keeps the WeightHistoryChart and profile in sync
      // without littering the timeline with duplicate points.
      if (weightChanged || heightChanged || headCircChanged) {
        try {
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = startOfDay.getTime() + 86400000;
          const todaysMeasurement = entries.find(
            (e) =>
              e.type === 'measurement' &&
              new Date(e.occurredAt).getTime() >= startOfDay.getTime() &&
              new Date(e.occurredAt).getTime() < endOfDay,
          );
          if (todaysMeasurement) {
            await updateEntry(todaysMeasurement.id, {
              occurredAt: new Date().toISOString(),
              payload: {
                ...todaysMeasurement.payload,
                weightKg: weightChanged ? nextCurrentWeightKg : todaysMeasurement.payload?.weightKg,
                heightCm: heightChanged ? nextHeightCm : todaysMeasurement.payload?.heightCm,
                headCircCm: headCircChanged ? nextHeadCircCm : todaysMeasurement.payload?.headCircCm,
              },
            });
          } else {
            await addEntry({
              type: 'measurement',
              title: t('entry.measurement'),
              occurredAt: new Date().toISOString(),
              payload: {
                weightKg: weightChanged ? nextCurrentWeightKg : undefined,
                heightCm: heightChanged ? nextHeightCm : undefined,
                headCircCm: headCircChanged ? nextHeadCircCm : undefined,
              },
            });
          }
        } catch {
          // Non-blocking: profile save already succeeded.
        }
      }

      isEditingRef.current = false;
      setInitialForm(form);
      haptics.success();
      const currentWeight = form.currentWeightKg
        ? `${form.currentWeightKg}${units === 'imperial' ? 'lb' : 'kg'}`
        : '';
      const msg = currentWeight ? `${form.babyName} · ${currentWeight}` : form.babyName;
      toast.success(msg);
    } catch (error: any) {
      haptics.error();
      toast.error(error?.message ?? t('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [form, profile?.currentWeightKg, profile?.heightCm, profile?.headCircCm, saveProfile, t, toast, activeBabyId, babies, refreshProfileData, addEntry, updateEntry, entries]);

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
      isEditingRef.current = true;
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
      const babyName = babies.find((b) => b.id === babyId)?.name ?? 'Baby';
      const currentEditingName = activeBabyId
        ? babies.find((b) => b.id === activeBabyId)?.name ?? form.babyName
        : form.babyName;

      const performSwitch = async () => {
        // Clear edit flag so the sync effect repopulates the form with the
        // newly-active baby's data.
        isEditingRef.current = false;
        haptics.medium();
        await setActiveBabyId(babyId);
        setActiveBabyIdLocal(babyId);
        haptics.success();
        toast.success(format('profile.activeChildLabel', { name: babyName }));
      };

      if (isDirty && currentEditingName) {
        const ok = await confirmAction({
          title: t('profile.discardChangesTitle'),
          message: format('profile.discardChangesBody', { name: currentEditingName }),
          confirmLabel: t('profile.switchAnyway'),
          cancelLabel: t('common.cancel'),
          destructive: true,
        });
        if (ok) await performSwitch();
        return;
      }
      await performSwitch();
    },
    [activeBabyId, babies, form.babyName, format, isDirty, t, toast],
  );

  const handleRemoveBaby = useCallback(
    async (babyId: string) => {
      const babyName = babies.find((b) => b.id === babyId)?.name ?? 'Baby';
      const linkedCount = activeBabyId === babyId ? entries.length : 0;
      const body =
        linkedCount > 0
          ? format('profile.removeChildConfirmRich', { babyName, count: linkedCount })
          : format('profile.removeChildConfirmEmpty', { babyName });
      const ok = await confirmAction({
        title: t('profile.removeChild'),
        message: body,
        confirmLabel: t('profile.removeBaby'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      });
      if (!ok) return;
      haptics.warning();
      setDeletingBabyId(babyId);
      try {
        await removeBaby(babyId);
        if (activeBabyId === babyId) {
          const remaining = babies.filter((b) => b.id !== babyId);
          if (remaining.length > 0) await setActiveBabyId(remaining[0].id);
        }
        await refreshProfileData();
        haptics.success();
        toast.success(t('profile.childRemoved'));
      } finally {
        setDeletingBabyId(null);
      }
    },
    [activeBabyId, babies, entries.length, format, refreshProfileData, t, toast],
  );

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

  const performSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      if (user?.uid) await clearCurrentSession(user.uid);
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }, [signOut, user]);

  const handleSignOut = useCallback(async () => {
    const body = guestMode ? t('profile.logoutConfirmGuestBody') : t('profile.logoutConfirmBody');
    const ok = await confirmAction({
      title: t('profile.logoutConfirmTitle'),
      message: body,
      confirmLabel: t('profile.logoutConfirmAction'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) void performSignOut();
  }, [guestMode, performSignOut, t]);

  const handleExportData = useCallback(async () => {
    const proceed = await confirmAction({
      title: t('profile.exportData'),
      message: t('profile.exportPrivacyNote'),
      confirmLabel: t('common.continue'),
      cancelLabel: t('common.cancel'),
    });
    if (!proceed) return;
    try {
      const payload = JSON.stringify({
        exportedAt: new Date().toISOString(),
        profile: sanitizeProfileForExport(profile),
        babies,
        entries,
      }, null, 2);

      if (Platform.OS === 'web') {
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `babyflow-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ title: 'BabyFlow data', message: payload });
      }
      haptics.success();
      toast.success(t('profile.dataExported'));
    } catch (error: any) {
      haptics.error();
      toast.error(error?.message ?? t('profile.exportFailed'));
    }
  }, [babies, entries, profile, t, toast]);

  const handleDeleteAllData = useCallback(async () => {
    const body = guestMode
      ? t('profile.deleteAccountConfirmBodyGuest')
      : t('profile.deleteAccountConfirmBodyCloud');
    const ok = await confirmAction({
      title: t('profile.deleteAccountConfirmTitle'),
      message: body,
      confirmLabel: t('profile.deleteAccountAction'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await clearLocalSession(user?.uid);
      await performSignOut();
    } catch (error: any) {
      haptics.error();
      toast.error(error?.message ?? t('errors.saveFailed'));
    }
  }, [guestMode, performSignOut, t, toast, user?.uid]);

  const handleSharePairingCode = useCallback(async () => {
    if (!pairingCode) {
      router.push('/pair');
      return;
    }
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(pairingCode);
        toast.success(t('profile.pairCodeCopied'));
      } else {
        await Share.share({ message: pairingCode });
      }
      haptics.success();
    } catch {
      // user cancelled share – not an error
    }
  }, [pairingCode, t, toast]);

  const language = localeLanguage;
  const childSummary = useMemo(
    () => (activeBabyId ? babies.find((baby) => baby.id === activeBabyId) : null),
    [activeBabyId, babies],
  );

  // Only show "Editing X" pill when there is more than one baby — otherwise
  // the parent is implicitly editing the only baby.
  const showEditingPill = babies.length > 1 && !!childSummary;

  const weightUnit = form.unitSystem === 'imperial' ? 'lb' : 'kg';
  const lengthUnit = form.unitSystem === 'imperial' ? 'in' : 'cm';

  if (isLoading) {
    return (
      <Page>
        <Heading eyebrow={t('tabs.profile')} title={t('profile.title')} subtitle={t('profile.subtitle')} align="left" />
        <Card>
          <ProfileSkeleton />
        </Card>
      </Page>
    );
  }

  return (
    <BottomSheetModalProvider>
      <View style={{ flex: 1 }}>
      <Page>
      <Heading eyebrow={t('tabs.profile')} title={t('profile.title')} subtitle={t('profile.subtitle')} align="left" />

      {/* Baby profile card */}
      <Card>
        {/* Sync-mode pill — parent-friendly wording, tappable for an explanation */}
        <Pressable
          onPress={() => {
            alertInfo(
              guestMode ? t('profile.modeGuest') : t('profile.modeCloud'),
              guestMode ? t('profile.modeTooltipGuest') : t('profile.modeTooltipCloud'),
            );
          }}
          accessibilityRole="button"
          accessibilityLabel={guestMode ? t('profile.modeGuest') : t('profile.modeCloud')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: guestMode ? `${colors.muted}18` : `${colors.primary}18`,
            borderRadius: 14,
            paddingHorizontal: 10,
            paddingVertical: 7,
            marginBottom: 14,
          }}
        >
          <Ionicons name={guestMode ? 'phone-portrait-outline' : 'cloud-done-outline'} size={13} color={guestMode ? colors.muted : colors.primary} />
          <Text style={{ color: guestMode ? colors.muted : colors.primary, fontSize: 12, fontWeight: '700', flex: 1 }}>
            {guestMode ? t('profile.modeGuest') : t('profile.modeCloud')}
          </Text>
          {showEditingPill ? (
            <Text style={{ color: colors.muted, fontSize: 11 }} numberOfLines={1}>
              {format('profile.editingActive', { name: childSummary!.name })}
            </Text>
          ) : null}
          <Ionicons name="information-circle-outline" size={13} color={colors.muted} />
        </Pressable>

        {/* Hero: centered avatar with name + corrected age below */}
        <View style={{ alignItems: 'center', marginBottom: 18 }}>
          <Pressable
            onPress={handlePickPhoto}
            accessibilityRole="button"
            accessibilityLabel={form.babyPhotoUri ? t('profile.changePhoto') : t('profile.addPhoto')}
            hitSlop={8}
          >
            <Animated.View style={{ transform: [{ scale: photoScale }] }}>
              <AvatarInitials name={form.babyName} photoUri={form.babyPhotoUri} size={88} />
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: colors.background,
                }}
              >
                <Ionicons name="camera" size={14} color={theme.accentText} />
              </View>
            </Animated.View>
          </Pressable>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18, marginTop: 10 }} numberOfLines={1}>
            {form.babyName || '—'}
          </Text>
          {(() => {
            const correctedLabel = getCorrectedAgeLabel(
              dateToIsoString(form.babyBirthDate as Date),
              Number(form.prematureWeeks) || 0,
              t,
            );
            return correctedLabel ? (
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{correctedLabel}</Text>
            ) : null;
          })()}
        </View>

        {/* "About your baby" section */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Ionicons name="person-outline" size={14} color={colors.primary} />
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>{t('profile.babyInfoSection')}</Text>
        </View>

        <Input
          label={t('profile.babyNameLabel')}
          value={form.babyName}
          onChangeText={(value) => handleFieldChange('babyName', value)}
          autoCapitalize="words"
        />

        {/* Baby sex — drives WHO curves accuracy */}
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 10, marginBottom: 4 }}>{t('profile.babySexLabel')}</Text>
        <Segment
          value={form.babySex}
          onChange={(value) => handleFieldChange('babySex', value)}
          options={[
            { label: t('profile.babySexFemale'), value: 'female' },
            { label: t('profile.babySexMale'), value: 'male' },
            { label: t('profile.babySexUnspecified'), value: 'unspecified' },
          ]}
        />

        <DateTimeField label={t('profile.birthDateLabel')} value={form.babyBirthDate as Date} onChange={(value) => handleFieldChange('babyBirthDate', value)} />

        {/* Premature toggle — row-style toggle for a more "settings"-feel */}
        <Pressable
          onPress={() => handleFieldChange('prematureActive', form.prematureActive ? '' : '1')}
          accessibilityRole="switch"
          accessibilityState={{ checked: Boolean(form.prematureActive) }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 12,
            paddingHorizontal: 12,
            marginTop: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: form.prematureActive ? colors.primary : colors.border,
            backgroundColor: form.prematureActive ? `${colors.primary}10` : pressed ? colors.backgroundAlt : 'transparent',
          })}
        >
          <Ionicons
            name={form.prematureActive ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={form.prematureActive ? colors.primary : colors.muted}
          />
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: form.prematureActive ? '700' : '500', flex: 1 }}>
            {t('profile.prematureToggle')}
          </Text>
        </Pressable>
        {form.prematureActive ? (
          <View style={{ marginTop: 8 }}>
            <Input
              label={t('profile.prematureWeeksLabel')}
              value={form.prematureWeeks}
              onChangeText={(value) => {
                const digits = value.replace(/[^0-9]/g, '');
                const clamped = digits === '' ? '' : String(Math.min(16, Math.max(0, Number(digits))));
                handleFieldChange('prematureWeeks', clamped);
              }}
              keyboardType="number-pad"
              inputMode="numeric"
              placeholder={t('profile.prematurePlaceholder')}
            />
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: -4, marginBottom: 4 }}>
              {t('profile.prematureRangeHint')}
            </Text>
          </View>
        ) : null}

        {/* Measurements section header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, marginBottom: 8 }}>
          <Ionicons name="fitness-outline" size={16} color={colors.primary} />
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800', flex: 1 }}>
            {t('profile.measurementsTitle')}
          </Text>
        </View>

        {/* Unit-system selector */}
        <View style={{ marginBottom: 12 }}>
          <Segment
            value={form.unitSystem}
            onChange={(value) => handleFieldChange('unitSystem', value)}
            options={[
              { label: t('profile.unitsMetric'), value: 'metric' },
              { label: t('profile.unitsImperial'), value: 'imperial' },
            ]}
          />
        </View>

        {/* AT-BIRTH sub-card. Section title provides "at birth" context, so
            field labels can stay short (no redundant "à la naissance" suffix). */}
        <View style={{
          marginTop: 4,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: `${colors.primary}06`,
          padding: 12,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Ionicons name="ribbon-outline" size={14} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>
              {t('profile.birthSectionTitle')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Input
                label={`${t('profile.weightShort')} (${weightUnit})`}
                value={form.unitSystem === 'imperial' && form.birthWeightKg ? formatWeightDisplay(form.birthWeightKg, 'imperial') : form.birthWeightKg}
                onChangeText={(value) => handleFieldChange('birthWeightKg', value)}
                keyboardType="decimal-pad"
                inputMode="decimal"
                error={fieldErrors.birthWeightKg}
              />
              {(() => {
                const w = checkWeightRange(form.birthWeightKg, form.unitSystem);
                return w ? <Text style={{ color: colors.warning, fontSize: 11, marginTop: 4 }}>⚠ {t(w.key)}</Text> : null;
              })()}
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label={`${t('profile.heightShort')} (${lengthUnit})`}
                value={form.unitSystem === 'imperial' && form.birthHeightCm ? formatHeightDisplay(form.birthHeightCm, 'imperial') : form.birthHeightCm}
                onChangeText={(value) => handleFieldChange('birthHeightCm', value)}
                keyboardType="decimal-pad"
                inputMode="decimal"
                error={fieldErrors.birthHeightCm}
              />
              {(() => {
                const h = checkHeightRange(form.birthHeightCm, form.unitSystem);
                return h ? <Text style={{ color: colors.warning, fontSize: 11, marginTop: 4 }}>⚠ {t(h.key)}</Text> : null;
              })()}
            </View>
          </View>
          <Input
            label={`${t('profile.headCircShort')} (${lengthUnit})`}
            value={form.unitSystem === 'imperial' && form.birthHeadCircCm ? formatHeightDisplay(form.birthHeadCircCm, 'imperial') : form.birthHeadCircCm}
            onChangeText={(value) => handleFieldChange('birthHeadCircCm', value)}
            keyboardType="decimal-pad"
            inputMode="decimal"
            error={fieldErrors.birthHeadCircCm}
          />
          {(() => {
            const hc = checkHeadCircRange(form.birthHeadCircCm, form.unitSystem);
            return hc ? <Text style={{ color: colors.warning, fontSize: 11, marginTop: -4, marginBottom: 4 }}>⚠ {t(hc.key)}</Text> : null;
          })()}
        </View>

        {/* CURRENT sub-card — same pattern as at-birth, separate visual block */}
        <View style={{
          marginTop: 12,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: `${colors.primary}06`,
          padding: 12,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Ionicons name="resize-outline" size={14} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>
              {t('profile.currentSectionTitle')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Input
                label={`${t('profile.weightShort')} (${weightUnit})`}
                value={form.unitSystem === 'imperial' && form.currentWeightKg ? formatWeightDisplay(form.currentWeightKg, 'imperial') : form.currentWeightKg}
                onChangeText={(value) => handleFieldChange('currentWeightKg', value)}
                keyboardType="decimal-pad"
                inputMode="decimal"
                error={fieldErrors.currentWeightKg}
              />
              {(() => {
                const w = checkWeightRange(form.currentWeightKg, form.unitSystem);
                return w ? <Text style={{ color: colors.warning, fontSize: 11, marginTop: 4 }}>⚠ {t(w.key)}</Text> : null;
              })()}
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label={`${t('profile.heightShort')} (${lengthUnit})`}
                value={form.unitSystem === 'imperial' && form.heightCm ? formatHeightDisplay(form.heightCm, 'imperial') : form.heightCm}
                onChangeText={(value) => handleFieldChange('heightCm', value)}
                keyboardType="decimal-pad"
                inputMode="decimal"
                error={fieldErrors.heightCm}
              />
              {(() => {
                const h = checkHeightRange(form.heightCm, form.unitSystem);
                return h ? <Text style={{ color: colors.warning, fontSize: 11, marginTop: 4 }}>⚠ {t(h.key)}</Text> : null;
              })()}
            </View>
          </View>
          <Input
            label={`${t('profile.headCircShort')} (${lengthUnit})`}
            value={form.unitSystem === 'imperial' && form.headCircCm ? formatHeightDisplay(form.headCircCm, 'imperial') : form.headCircCm}
            onChangeText={(value) => handleFieldChange('headCircCm', value)}
            keyboardType="decimal-pad"
            inputMode="decimal"
            error={fieldErrors.headCircCm}
          />
          {(() => {
            const hc = checkHeadCircRange(form.headCircCm, form.unitSystem);
            return hc ? <Text style={{ color: colors.warning, fontSize: 11, marginTop: -4, marginBottom: 4 }}>⚠ {t(hc.key)}</Text> : null;
          })()}
        </View>

        <Input
          label={t('profile.notesLabel')}
          value={form.babyNotes}
          onChangeText={(value) => handleFieldChange('babyNotes', value.slice(0, NOTES_MAX))}
          placeholder={t('profile.notesPlaceholder')}
          multiline
        />
        {form.babyNotes.length > NOTES_MAX * 0.8 && (
          <Text style={{
            color: form.babyNotes.length >= NOTES_MAX ? colors.danger : colors.muted,
            fontSize: 11,
            marginTop: -4,
            marginBottom: 4,
            textAlign: 'right',
          }}>
            {format('profile.notesCharsLeft', { n: NOTES_MAX - form.babyNotes.length })}
          </Text>
        )}
      </Card>

      {/* Growth history card with calming WHO message */}
      <Card>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 4 }}>{t('profile.weightHistory')}</Text>
        <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 12 }}>{t('profile.tapToEdit')}</Text>
        <WeightHistoryChart limit={5} onEditEntry={handleEditEntry} />
        {(() => {
          const birthIso = dateToIsoString(form.babyBirthDate as Date);
          if (!birthIso) return null;
          const prematureWeeksValue = Number(form.prematureWeeks) || 0;
          const referenceIso = prematureWeeksValue > 0
            ? new Date(new Date(birthIso).getTime() + prematureWeeksValue * 7 * 86400000).toISOString()
            : birthIso;
          const ageMonths = getAgeInMonths(referenceIso);
          const rec = getWHORecommendation(referenceIso);
          const latest = entries
            .filter((e) => e.type === 'measurement' && e.payload?.weightKg)
            .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())[0];
          const latestKg = latest?.payload?.weightKg ?? undefined;
          const ageLabel = `${ageMonths} ${t('profile.monthsShort')}`;
          if (!latestKg || !rec) {
            return (
              <View style={{ marginTop: 12, padding: 10, borderRadius: 14, backgroundColor: `${colors.primary}10` }}>
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>{t('profile.growthCalm')}</Text>
              </View>
            );
          }
          let msgKey = 'profile.growthCalmWithRange';
          if (latestKg < rec.weight.min) msgKey = 'profile.growthBelowRange';
          else if (latestKg > rec.weight.max) msgKey = 'profile.growthAboveRange';
          return (
            <View style={{ marginTop: 12, padding: 10, borderRadius: 14, backgroundColor: `${colors.primary}10` }}>
              <Text style={{ color: colors.text, fontSize: 12, lineHeight: 17 }}>
                {format(msgKey, { age: ageLabel })}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                {t('profile.growthCalm')}
              </Text>
            </View>
          );
        })()}
      </Card>

      {/* Daily goals — stepper-style rows make the values easier to tune
          one-handed than three separate numeric inputs. */}
      <Card>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 4 }}>{t('profile.dailyGoalsTitle')}</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 14, lineHeight: 17 }}>{t('profile.dailyGoalsBody')}</Text>
        {([
          { key: 'goalFeedingsPerDay', label: t('profile.goalFeedingsLabel'), unit: t('profile.goalFeedingsUnit'), min: 1, max: 20, icon: 'water-outline' as const },
          { key: 'goalSleepHoursPerDay', label: t('profile.goalSleepLabel'), unit: t('profile.goalSleepUnit'), min: 1, max: 24, icon: 'moon-outline' as const },
          { key: 'goalDiapersPerDay', label: t('profile.goalDiapersLabel'), unit: t('profile.goalDiapersUnit'), min: 1, max: 20, icon: 'happy-outline' as const },
        ] as const).map((g) => {
          const current = Number((form as any)[g.key]) || g.min;
          const dec = () => handleFieldChange(g.key, clampGoal(String(current - 1), g.min, g.max));
          const inc = () => handleFieldChange(g.key, clampGoal(String(current + 1), g.min, g.max));
          return (
            <View
              key={g.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: `${colors.border}80`,
              }}
            >
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${colors.primary}14`, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={g.icon} size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{g.label}</Text>
                <Text style={{ color: colors.muted, fontSize: 11, marginTop: 1 }}>
                  {current} {g.unit}
                </Text>
              </View>
              <Pressable
                onPress={dec}
                accessibilityRole="button"
                accessibilityLabel={`− ${g.label}`}
                disabled={current <= g.min}
                hitSlop={8}
                style={({ pressed }) => ({
                  width: 32, height: 32, borderRadius: 16,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1, borderColor: colors.border,
                  backgroundColor: pressed ? colors.backgroundAlt : 'transparent',
                  opacity: current <= g.min ? 0.4 : 1,
                })}
              >
                <Ionicons name="remove" size={16} color={colors.text} />
              </Pressable>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', minWidth: 28, textAlign: 'center' }}>
                {current}
              </Text>
              <Pressable
                onPress={inc}
                accessibilityRole="button"
                accessibilityLabel={`+ ${g.label}`}
                disabled={current >= g.max}
                hitSlop={8}
                style={({ pressed }) => ({
                  width: 32, height: 32, borderRadius: 16,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1, borderColor: colors.border,
                  backgroundColor: pressed ? colors.backgroundAlt : 'transparent',
                  opacity: current >= g.max ? 0.4 : 1,
                })}
              >
                <Ionicons name="add" size={16} color={colors.text} />
              </Pressable>
            </View>
          );
        })}
      </Card>

      {/* Preferences card — caregiver, partner, language, appearance link */}
      <Card>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 12 }}>{t('profile.preferencesTitle')}</Text>
        <Input
          label={t('profile.caregiverLabel')}
          value={form.caregiverName}
          onChangeText={(value) => handleFieldChange('caregiverName', value)}
          autoCapitalize="words"
        />
        <Input
          label={t('profile.partnerLabel')}
          value={form.partnerName}
          onChangeText={(value) => handleFieldChange('partnerName', value)}
          placeholder={t('profile.partnerPlaceholder')}
          autoCapitalize="words"
        />
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 12, marginBottom: 4 }}>{t('profile.languageLabel2')}</Text>
        <Segment value={language} onChange={(value) => void setContextLanguage(value as any)} options={languageOptions} />

        {/* Appearance is no longer its own card — just an inline link */}
        <Pressable
          onPress={() => router.push('/(app)/(tabs)/settings-theme' as any)}
          accessibilityRole="button"
          accessibilityLabel={t('profile.appearanceInline')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 14,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="color-palette-outline" size={16} color={colors.primary} />
          <Text style={{ flex: 1, color: colors.text, fontSize: 13, fontWeight: '700' }}>{t('profile.appearanceInline')}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.muted} />
        </Pressable>
      </Card>

      {/* Share with co-parent — always visible; guest mode gets an upgrade CTA */}
      <Card>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 6 }}>{t('profile.pairCardTitle')}</Text>
        <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 12, lineHeight: 18 }}>
          {t('profile.pairCardBody')}
        </Text>
        {!guestMode && pairingCode ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              padding: 10,
              borderRadius: 14,
              backgroundColor: `${colors.primary}10`,
              marginBottom: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('profile.pairCodeLabel')}
              </Text>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: 2, marginTop: 2 }}>{pairingCode}</Text>
            </View>
            <Pressable
              onPress={handleSharePairingCode}
              accessibilityRole="button"
              accessibilityLabel={t('profile.pairCodeShare')}
              style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                backgroundColor: colors.primary,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: theme.accentText, fontSize: 12, fontWeight: '700' }}>{t('profile.pairCodeShare')}</Text>
            </Pressable>
          </View>
        ) : null}
        <Button
          label={guestMode ? t('profile.pairCardGuestCta') : t('profile.pairCardCta')}
          onPress={() => router.push(guestMode ? '/(auth)/register' : '/pair')}
        />
      </Card>

      {/* Children section — only when there's more than one baby */}
      {babies.length > 1 ? (
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
              {babies.map((baby) => (
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
                      <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 12, backgroundColor: `${colors.primary}22` }}>
                        <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '800' }}>{t('profile.activeLabel')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{formatDateForDisplay(baby.birthDate, language)}</Text>
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
                      <Button
                        label={t('common.delete')}
                        onPress={() => handleRemoveBaby(baby.id)}
                        variant="ghost"
                        size="sm"
                        loading={deletingBabyId === baby.id}
                        disabled={deletingBabyId === baby.id}
                      />
                    </View>
                  </View>
                </View>
              ))}

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
      ) : (
        /* Single baby (or none): slim "Add another baby" row */
        <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
          {showAddBabyForm ? (
            <Card>
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
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
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
            </Card>
          ) : (
            <Button
              label={t('profile.addBaby')}
              onPress={() => {
                haptics.light();
                setShowAddBabyForm(true);
              }}
              variant="ghost"
            />
          )}
        </View>
      )}

      {/* Always-visible sync chip — surfaces queued count without digging into Sessions */}
      {!guestMode && queuedSyncCount > 0 && (
        <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
          <Pressable
            onPress={() => router.push('/profile-sessions')}
            accessibilityRole="button"
            accessibilityLabel={t('profile.syncNow')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: `${colors.primary}40`,
              backgroundColor: `${colors.primary}10`,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="cloud-upload-outline" size={16} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                {format(queuedSyncCount === 1 ? 'profile.queuedSyncCalm' : 'profile.queuedSyncCalmPlural', { count: queuedSyncCount })}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 1 }}>{t('profile.queuedSyncTapHint')}</Text>
            </View>
          </Pressable>
        </View>
      )}

      {/* Session block — collapsed to a single link row that opens the sub-screen */}
      {!guestMode && (
        <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
          <Pressable
            onPress={() => router.push('/profile-sessions')}
            accessibilityRole="button"
            accessibilityLabel={t('profile.openSessionsLink')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="people-outline" size={16} color={colors.primary} />
            <Text style={{ flex: 1, color: colors.text, fontSize: 13, fontWeight: '700' }}>{t('profile.openSessionsLink')}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.muted} />
          </Pressable>
        </View>
      )}

      {/* Data & privacy — export, import, delete */}
      <Card>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 12 }}>{t('profile.dataPrivacyTitle')}</Text>
        <View style={{ gap: 8 }}>
          <Button label={t('profile.exportData')} onPress={() => void handleExportData()} variant="secondary" />
          <DataImporter />
          <Button label={t('profile.deleteAccount')} onPress={handleDeleteAllData} variant="danger" />
        </View>

        {/* Logout — always visible at the bottom of the privacy card */}
        <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Button
            label={t('profile.logout')}
            onPress={handleSignOut}
            loading={signingOut}
            disabled={signingOut}
            variant="danger"
          />
        </View>
      </Card>

      {isDirty && <View style={{ height: 96 }} />}
    </Page>

    {isDirty && (
      <Animated.View
        entering={FadeIn.duration(180)}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 24,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Button label={t('common.save')} onPress={handleSave} loading={saving} disabled={saving} />
      </Animated.View>
    )}

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
    </View>
    </BottomSheetModalProvider>
  );
}
