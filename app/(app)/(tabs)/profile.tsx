import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Alert, AppState, Image, Pressable, StyleSheet, Text, View, useWindowDimensions, Platform, Modal } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, useSharedValue, useAnimatedProps, withTiming } from 'react-native-reanimated';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
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
import { triggerHaptic } from '@/lib/mobile';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const languageOptions = [
  { label: 'FR', value: 'fr', flag: '🇫🇷' },
  { label: 'ES', value: 'es', flag: '🇪🇸' },
  { label: 'EN', value: 'en', flag: '🇬🇧' },
  { label: 'NL', value: 'nl', flag: '🇳🇱' },
];

function LanguageSelector({ value, onChange, options }: { value: string, onChange: (v: string) => void, options: typeof languageOptions }) {
  const { theme, colors } = useTheme();
  const selectedIndex = options.findIndex(o => o.value === value);
  const translateX = useSharedValue(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (width > 0) {
      const segmentWidth = width / options.length;
      translateX.value = withSpring(selectedIndex * segmentWidth, { damping: 20, stiffness: 140 });
    }
  }, [selectedIndex, width, options.length]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: width ? width / options.length : '25%',
  }));

  return (
    <View 
      style={[styles.langContainer, { backgroundColor: `${colors.border}33`, borderColor: colors.border }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <Animated.View style={[styles.langIndicator, { backgroundColor: theme.accent }, animatedStyle]} />
      )}
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              void triggerHaptic('selection');
              onChange(opt.value);
            }}
            style={styles.langOption}
          >
            <Text style={[styles.langText, { color: active ? '#FFFFFF' : colors.muted, fontWeight: active ? '800' : '600', fontSize: 18 }]}>
              {opt.flag}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AgeBadge({ birthDate, accentColor }: { birthDate: string, accentColor: string }) {
  const age = useMemo(() => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return null;
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return null;

    if (diffDays < 30) return `${diffDays}d`;
    const months = Math.floor(diffDays / 30.4375);
    if (months < 12) return `${months}m`;
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    return remMonths > 0 ? `${years}y ${remMonths}m` : `${years}y`;
  }, [birthDate]);

  if (!age) return null;
  return (
    <View style={[styles.ageBadge, { backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40` }]}>
      <Text style={[styles.ageBadgeText, { color: accentColor }]}>👶 {age}</Text>
    </View>
  );
}

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [queuedSyncCount, setQueuedSyncCount] = useState(0);
  const [voiceStatus, setVoiceStatus] = useState('Idle');
  const [customPrimary, setCustomPrimary] = useState(defaultAppSettings.customTheme.primary);
  const [customSecondary, setCustomSecondary] = useState(defaultAppSettings.customTheme.secondary);
  const [customBackgroundAlt, setCustomBackgroundAlt] = useState(defaultAppSettings.customTheme.backgroundAlt);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const milestones = useMemo(() => entries.filter((entry) => entry.type === 'milestone').slice(0, 5), [entries]);
  const themeVariantLabel = themeVariantDescriptions[themeVariant]?.label ?? themeVariant;

  // Shared value para el efecto de pulsación suave
  const buttonScale = useSharedValue(1);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

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
      try {
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
      } catch (error) {
        console.error("Error refreshing profile data:", error);
        Alert.alert(t('common.error', 'Error'), t('profile.load_data_failed', 'Could not load profile data. Please check your internet connection.'));
      }
    };

    void refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh();
      }
    });

    return () => subscription.remove();
  }, []);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) {
        confirmDate(selectedDate);
      }
    } else {
      // En iOS, solo actualizamos la fecha temporal mientras el modal está abierto
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const confirmDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    setBabyBirthDate(`${y}-${m}-${d}`);
    setShowDatePicker(false);
  };

  const dateValueForPicker = useMemo(() => {
    if (!babyBirthDate) return new Date();
    const parts = babyBirthDate.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0])) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return new Date();
  }, [babyBirthDate]);

  async function handleSave() {
    try {
      // 1. Validación de campos de texto obligatorios
      if (!caregiverName.trim() || !babyName.trim()) {
        Alert.alert(t('common.error', 'Error'), t('profile.error_name_required', 'Names are required.'));
        return;
      }

      // 2. Validación de formato de fecha (YYYY-MM-DD) para babyBirthDate
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!babyBirthDate.trim().match(dateRegex)) {
        Alert.alert(t('common.error', 'Error'), t('profile.error_invalid_birth_date_format', 'Invalid birth date format. Please use YYYY-MM-DD.'));
        return;
      }
      const parsedDate = new Date(babyBirthDate.trim());
      if (isNaN(parsedDate.getTime())) {
        Alert.alert(t('common.error', 'Error'), t('profile.error_invalid_birth_date', 'Invalid birth date.'));
        return;
      }

      // 3. Validación numérica para peso y altura
      const parseAndValidateNumber = (value: string, fieldName: string) => {
        const num = Number(value);
        if (isNaN(num) || num <= 0) {
          Alert.alert(t('common.error', 'Error'), t('profile.error_invalid_number', `Invalid ${fieldName}. Please enter a positive number.`));
          return null;
        }
        return num;
      };

      const parsedBirthWeightKg = parseAndValidateNumber(birthWeightKg, t('profile.birth_weight_field', 'Birth Weight'));
      const parsedCurrentWeightKg = parseAndValidateNumber(currentWeightKg, t('profile.current_weight_field', 'Current Weight'));
      const parsedHeightCm = parseAndValidateNumber(heightCm, t('profile.height_field', 'Height'));
      if (parsedBirthWeightKg === null || parsedCurrentWeightKg === null || parsedHeightCm === null) return;

      const nextPhoto = babyPhotoUri || undefined;
      await saveProfile({
        caregiverName: caregiverName.trim(),
        babyName: babyName.trim(),
        babyBirthDate: babyBirthDate.trim(),
        birthWeightKg: parsedBirthWeightKg,
        currentWeightKg: parsedCurrentWeightKg,
        heightCm: parsedHeightCm,
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
      if (!profile) throw new Error(t('auth.error_signed_in', 'You must be signed in.'));
      setQueuedSyncCount(0);
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

  const transparentCardStyle = useMemo(
    () => ({
      backgroundColor: paletteMode === 'nuit' ? 'rgba(0,0,0,0.50)' : 'rgba(255,255,255,0.50)',
      borderColor: paletteMode === 'nuit' ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.10)',
      borderWidth: 1,
      shadowColor: paletteMode === 'nuit' ? theme.accent : 'transparent',
      shadowOpacity: 0.35,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 0 },
      elevation: paletteMode === 'nuit' ? 8 : 0,
    }),
    [paletteMode, theme.accent]
  );

  return (
    <Page contentStyle={{ gap: isPhone ? 12 : 16, paddingBottom: 24 }}>
        <Card style={[styles.mainCard, transparentCardStyle, { borderColor: colors.border, padding: isPhone ? 16 : 20 }]}>
          <View style={styles.profileHeader}>
            <Pressable onPress={handlePickPhoto} style={[styles.photoButton, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}>
              {babyPhotoUri ? <Image source={{ uri: babyPhotoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 12 }}>📷</Text>}
            </Pressable>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>{babyName || 'Tu Bebé'}</Text>
                <AgeBadge birthDate={babyBirthDate} accentColor={theme.accent} />
              </View>
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

          {!profile?.hasCompletedOnboarding && ( // Este chequeo asegura que el botón solo se muestre si el onboarding no está completo
            <Button
              label={t('profile.complete_onboarding', '⚠️ Complete el perfil para desbloquear todas las funciones')}
              onPress={() => Alert.alert(t('profile.complete_profile_tip', 'Complete el Perfil'), t('profile.complete_profile_body', 'Por favor, rellene todos los campos obligatorios para desbloquear todas las funciones de la aplicación.'))}
              style={[styles.onboardingButton, { backgroundColor: `${colors.alert}15`, borderColor: colors.alert }]}
              fullWidth
            />
          )}

          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: isPhone ? 'column' : 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input label={t('profile.caregiver', 'Parent/Caregiver')} value={caregiverName} onChangeText={setCaregiverName} placeholder="Tu nombre" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label={t('profile.baby_name', 'Baby Name')} value={babyName} onChangeText={setBabyName} placeholder="Nombre" />
              </View>
            </View>
            
            <Pressable onPress={() => {
              setTempDate(dateValueForPicker);
              setShowDatePicker(true);
            }}>
              <View style={{ pointerEvents: 'none' }}>
                <Input label={t('profile.birth_date', 'Birth Date')} value={babyBirthDate} onChangeText={setBabyBirthDate} placeholder="YYYY-MM-DD" />
              </View>
            </Pressable>

            {showDatePicker && Platform.OS === 'ios' && (
              <Modal transparent animationType="slide" visible={showDatePicker}>
                <BlurView 
                  intensity={paletteMode === 'nuit' ? 30 : 50} 
                  tint={paletteMode === 'nuit' ? 'dark' : 'light'} 
                  style={styles.modalOverlay}
                >
                  <Pressable style={styles.modalDismiss} onPress={() => setShowDatePicker(false)} />
                  <Card style={[styles.bottomSheetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 16, textAlign: 'center' }}>
                      {t('profile.select_date', 'Select Birth Date')}
                    </Text>
                    <DateTimePicker
                      value={tempDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'} // Mantener spinner en iOS para mejor UX
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                      textColor={colors.text}
                    />
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                      <Button label={t('common.cancel', 'Cancel')} variant="ghost" onPress={() => setShowDatePicker(false)} />
                      <Button label={t('common.confirm', 'Confirm')} onPress={() => confirmDate(tempDate)} />
                    </View>
                  </Card>
                </BlurView>
              </Modal>
            )}

            {showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={dateValueForPicker}
                mode="date"
                display="default"
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}

            <View style={{ flexDirection: isPhone ? 'column' : 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Input label={t('profile.birth_weight', 'Birth Weight (kg)')} value={birthWeightKg} onChangeText={setBirthWeightKg} keyboardType="decimal-pad" inputMode="decimal" placeholder="3.5" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label={t('profile.current_weight', 'Current Weight (kg)')} value={currentWeightKg} onChangeText={setCurrentWeightKg} keyboardType="decimal-pad" inputMode="decimal" placeholder="4.2" />
              </View>
            </View>
            <View style={{ flexDirection: isPhone ? 'column' : 'row', gap: 12, alignItems: isPhone ? 'stretch' : 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Input label={t('profile.height', 'Height (cm)')} value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" inputMode="decimal" placeholder="55" />
              </View>
              <View style={{ flex: 1 }}>
                <LanguageSelector value={language} onChange={(val) => setLanguage(val as any)} options={languageOptions} />
              </View>
            </View>
            <Input label={t('profile.notes', 'Notes')} value={babyNotes} onChangeText={setBabyNotes} multiline placeholder="Notas sobre el bebé..." />
            
            <Pressable 
              onPress={handleSave}
              onPressIn={() => {
                void triggerHaptic('light');
                buttonScale.value = withSpring(0.97, { damping: 15 });
              }}
              onPressOut={() => {
                buttonScale.value = withSpring(1);
              }}
            >
              <Animated.View style={buttonAnimatedStyle}>
                <LinearGradient
                  colors={[theme.accent, `${theme.accent}CC`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>
                    {t('profile.save_button', 'Save Profile')}
                  </Text>
                </LinearGradient>
              </Animated.View>
            </Pressable>
          </View>
        </Card>

        <Card style={[{ padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border }, transparentCardStyle]}>
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

        <Card style={[{ padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border }, transparentCardStyle]}>
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

        <Card style={transparentCardStyle}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Advanced</Text>
          <Text style={{ color: colors.muted, lineHeight: 20 }}>Dashboard, effects, sync and voice tools are grouped here so the mobile profile stays focused.</Text>
          <Button label={advancedOpen ? 'Hide advanced settings' : 'Show advanced settings'} onPress={() => setAdvancedOpen((current) => !current)} variant="ghost" />
        </Card>

        {advancedOpen ? (
          <>
        <Card style={transparentCardStyle}>
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

        <Card style={transparentCardStyle}>
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

        <Card style={transparentCardStyle}>
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

        <Card style={transparentCardStyle}>
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
        <Card style={transparentCardStyle}>
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

        <Card style={transparentCardStyle}>
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

const styles = StyleSheet.create({
  mainCard: {
    borderRadius: 24,
    borderWidth: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16
  },
  photoButton: {
    width: 80,
    height: 80,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2
  },
  // Se reemplaza el estilo de la alerta por el del botón
  // onboardingAlert: {
  //   borderWidth: 1,
  //   borderRadius: 16,
  //   padding: 12,
  //   marginBottom: 16
  // },
  // alertText: {
  //   fontSize: 13,
  //   fontWeight: '700',
  //   textAlign: 'center'
  // },
  onboardingButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12, // Ajustado para que coincida con la altura visual de la alerta original
    marginBottom: 16
  },
  onboardingButtonText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center'
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end', // Alinea el contenido en la parte inferior
    alignItems: 'stretch', // Estira el contenido horizontalmente
    // No padding aquí, el padding va en la tarjeta
  },
  modalDismiss: {
    ...StyleSheet.absoluteFillObject
  },
  bottomSheetCard: {
    width: '100%',
    padding: 20, // Padding interno de la tarjeta
    borderTopLeftRadius: 24, // Solo bordes superiores redondeados
    borderTopRightRadius: 24,
    borderWidth: 1,
    elevation: 5
  },
  langContainer: {
    flexDirection: 'row',
    height: 62,
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    position: 'relative',
    overflow: 'hidden'
  },
  langIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 0 },
      },
      android: { elevation: 2 },
      web: { boxShadow: '0px 0px 4px rgba(0, 0, 0, 0.1)' },
    }),
  },
  langOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1
  },
  langText: {
    fontSize: 13,
    letterSpacing: 0.5
  },
  ageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  ageBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  saveButtonGradient: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  }
});
