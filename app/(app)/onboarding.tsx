import { useEffect, useMemo, useState, useRef } from 'react';
import { Alert, Pressable, Text, View, useWindowDimensions, Animated, StyleSheet, Platform, useColorScheme, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import Reanimated, { FadeIn, FadeInRight, useAnimatedStyle, useSharedValue, withSequence, withTiming, interpolateColor, withSpring } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Button, Card, Input, Page, Heading } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { buildBabyFromProfile } from '@/lib/storage';
import { DateTimeField } from '@/components/DateTimeField';
import { useOnboarding, type OnboardingPath } from '@/hooks/useOnboarding';
import { useTheme } from '@/context/ThemeContext';
import ConfettiCannon from 'react-native-confetti-cannon';

const BACKGROUND_IMAGES: Record<string, string> = {
  fr: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=2071',
  es: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?q=80&w=2040',
  en: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=2075',
  nl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=2070',
};

type BabySex = 'female' | 'male' | 'unspecified';
type AppLanguage = 'fr' | 'es' | 'en' | 'nl';

const languageOptions = [
  { label: 'Français', value: 'fr', flag: '🇫🇷' },
  { label: 'Español', value: 'es', flag: '🇪🇸' },
  { label: 'English', value: 'en', flag: '🇺🇸' },
  { label: 'Nederlands', value: 'nl', flag: '🇳🇱' },
];

const getZodiacSign = (date: Date, lang: string) => {
  const isNL = lang === 'nl'; const isES = lang === 'es'; const isFR = lang === 'fr';
  const d = date.getDate();
  const m = date.getMonth() + 1;
  if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return { name: isNL ? 'Waterman' : 'Aquarius', symbol: '♒', color: '#4D96FF', trait: isNL ? 'Vernieuwend en origineel.' : isFR ? 'Innovateur et original.' : 'Innovative and original.' };
  if ((m === 2 && d >= 19) || (m === 3 && d <= 20)) return { name: isNL ? 'Vissen' : 'Pisces', symbol: '♓', color: '#6BCB77', trait: isNL ? 'Intuïtief en medelijdend.' : isFR ? 'Intuitif.' : 'Intuitive.' };
  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return { name: isNL ? 'Ram' : 'Aries', symbol: '♈', color: '#FF6B6B', trait: isNL ? 'Dynamisch en zelfverzekerd.' : 'Dynamic.' };
  if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return { name: isNL ? 'Stier' : 'Taurus', symbol: '♉', color: '#4ECDC4', trait: isNL ? 'Betrouwbaar en vastberaden.' : 'Reliable.' };
  if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return { name: isNL ? 'Tweelingen' : 'Gemini', symbol: '♊', color: '#FBC02D', trait: isNL ? 'Nieuwsgierig.' : 'Curious.' };
  if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return { name: isNL ? 'Kreeft' : 'Cancer', symbol: '♋', color: '#FF85A2', trait: isNL ? 'Beschermend.' : 'Protective.' };
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return { name: isNL ? 'Leeuw' : 'Leo', symbol: '♌', color: '#FFA726', trait: isNL ? 'Edelmoedig.' : 'Generous.' };
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return { name: isNL ? 'Maagd' : 'Virgo', symbol: '♍', color: '#6BCB77', trait: isNL ? 'Praktisch.' : 'Practical.' };
  if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return { name: isNL ? 'Weegschaal' : 'Libra', symbol: '♎', color: '#4D96FF', trait: isNL ? 'Diplomatiek.' : 'Diplomatic.' };
  if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return { name: isNL ? 'Schorpioen' : 'Scorpio', symbol: '♏', color: '#9B59B6', trait: isNL ? 'Gepassioneerd.' : 'Passionate.' };
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return { name: isNL ? 'Boogschutter' : 'Sagittarius', symbol: '♐', color: '#E67E22', trait: isNL ? 'Optimistisch.' : 'Optimistic.' };
  return { name: isNL ? 'Steenbok' : 'Capricorn', symbol: '♑', color: '#95A5A6', trait: isNL ? 'Ambitieus.' : 'Ambitious.' };
};

const pathCards: Array<{ key: OnboardingPath; title: string; body: string }> = [
  { key: 'guest', title: 'Guest', body: 'Start quickly and keep everything local.' },
  { key: 'pin', title: 'PIN', body: 'Quick access to the home with a local code.' },
  { key: 'account', title: 'Account', body: 'Classic profile with local data.' },
];

const getPathCards = (lang: string) => pathCards.map(p => {
  let title = p.title;
  let body = p.body;
  if (lang === 'fr') {
    if (p.key === 'guest') title = 'Invité';
    if (p.key === 'account') title = 'Compte';
    body = 'Commencer vite et tout garder en local.';
  } else if (lang === 'nl') {
    if (p.key === 'guest') title = 'Gast';
    if (p.key === 'account') title = 'Account';
    body = 'Begin snel en bewaar alles lokaal.';
  } else if (lang === 'es') {
    if (p.key === 'guest') title = 'Invitado';
    if (p.key === 'account') title = 'Cuenta';
    body = 'Empieza rápido y guarda todo localmente.';
  }
  return { ...p, title, body };
});

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function computeAutoGoals(birthDate: Date, currentWeightKg?: number) {
  const ageDays = Math.max(0, Math.floor((Date.now() - birthDate.getTime()) / 86400000));
  const ageMonths = ageDays / 30.4375;

  let feedings = ageMonths < 1 ? 8 : ageMonths < 3 ? 7 : ageMonths < 6 ? 6 : ageMonths < 9 ? 5 : 4;
  const sleep = ageMonths < 1 ? 15 : ageMonths < 3 ? 14 : ageMonths < 6 ? 14 : ageMonths < 12 ? 13 : 12;
  const diapers = ageMonths < 1 ? 8 : ageMonths < 3 ? 7 : ageMonths < 6 ? 6 : ageMonths < 12 ? 5 : 4;

  if (typeof currentWeightKg === 'number' && currentWeightKg > 0 && ageMonths < 6 && currentWeightKg < 4) {
    feedings += 1;
  }

  return {
    feedings: clamp(Math.round(feedings), 3, 12),
    sleep: clamp(Math.round(sleep), 8, 18),
    diapers: clamp(Math.round(diapers), 2, 12),
  };
}

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const { theme, colors } = useTheme();
  const scheme = useColorScheme();
  const { user, profile, guestMode, signInGuest, completeUserOnboarding } = useAuth();
  const isDesktop = width >= 1280;
  const uiScale = isDesktop ? 0.8 : 1.0;
  const isTablet = width >= 768;

  const { path, setPath, step, setStep, next, back, progress } = useOnboarding(1);
  const [caregiverName, setCaregiverName] = useState(profile?.caregiverName ?? '');
  const [babyName, setBabyName] = useState(profile?.babyName ?? 'Leo');
  const [babyBirthDate, setBabyBirthDate] = useState(new Date(profile?.babyBirthDate ?? '2025-10-21T08:00:00.000Z'));
  const [babySex, setBabySex] = useState<BabySex>(profile?.babySex ?? 'unspecified');
  const [birthWeightKg, setBirthWeightKg] = useState(profile?.birthWeightKg ? String(profile.birthWeightKg) : '');
  const [currentWeightKg, setCurrentWeightKg] = useState(profile?.currentWeightKg ? String(profile.currentWeightKg) : '');
  const [heightCm, setHeightCm] = useState(profile?.heightCm ? String(profile.heightCm) : '');
  const [headCircCm, setHeadCircCm] = useState(profile?.headCircCm ? String(profile.headCircCm) : '');
  const [babyNotes, setBabyNotes] = useState(profile?.babyNotes ?? '');
  const [language, setLanguage] = useState<AppLanguage>(profile?.language ?? 'fr');
  const [goalFeedingsPerDay, setGoalFeedingsPerDay] = useState(profile?.goalFeedingsPerDay ? String(profile.goalFeedingsPerDay) : '');
  const [goalSleepHoursPerDay, setGoalSleepHoursPerDay] = useState(profile?.goalSleepHoursPerDay ? String(profile.goalSleepHoursPerDay) : '');
  const [goalDiapersPerDay, setGoalDiapersPerDay] = useState(profile?.goalDiapersPerDay ? String(profile.goalDiapersPerDay) : '');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [babyPhotoUri, setBabyPhotoUri] = useState<string | null>(profile?.babyPhotoUri ?? null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showTraits, setShowTraits] = useState(false);
  const shake = useSharedValue(0);
  const goldValue = useSharedValue(0);
  const zodiacRotation = useSharedValue(0);

  // Sistema de tinte por género
  const genderValue = useSharedValue(0); // 0: neutral, 1: female, 2: male
  useEffect(() => {
    genderValue.value = withTiming(
      babySex === 'female' ? 1 : babySex === 'male' ? 2 : 0,
      { duration: 800 }
    );
  }, [babySex]);

  // Sistema de tinte dorado para objetivos completados
  const isObjectivesStep = ((step === 3 && path !== 'pin') || (step === 4 && path === 'pin'));
  const goalsFilled = Boolean(goalFeedingsPerDay && goalSleepHoursPerDay && goalDiapersPerDay);

  const zodiac = useMemo(() => getZodiacSign(babyBirthDate, language), [babyBirthDate, language]);
  const zodiacTint = useSharedValue('transparent');

  useEffect(() => {
    goldValue.value = withTiming(isObjectivesStep && goalsFilled ? 1 : 0, { duration: 1000 });
  }, [isObjectivesStep, goalsFilled]);

  useEffect(() => {
    // Animar rotación del símbolo cuando cambia el zodiaco
    zodiacRotation.value = 0;
    zodiacRotation.value = withSpring(360, { damping: 12 });
    
    // Actualizar color de fondo según zodiaco
    zodiacTint.value = withTiming(`${zodiac.color}15`, { duration: 800 });
  }, [zodiac.symbol, zodiac.color]);

  // Sistema de transición de fondo
  const bgOpacity = useRef(new Animated.Value(1)).current;
  const [bgSource, setBgSource] = useState(BACKGROUND_IMAGES[language] || BACKGROUND_IMAGES.en);

  useEffect(() => {
    const nextImg = BACKGROUND_IMAGES[language];
    if (nextImg && nextImg !== bgSource) {
      Animated.timing(bgOpacity, { toValue: 0.2, duration: 300, useNativeDriver: true }).start(() => {
        setBgSource(nextImg);
        Animated.timing(bgOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      });
    }
  }, [language]);

  const animatedTintStyle = useAnimatedStyle(() => {
    const genderColor = interpolateColor(
      genderValue.value,
      [0, 1, 2],
      ['transparent', 'rgba(255, 182, 193, 0.12)', 'rgba(173, 216, 230, 0.12)']
    );
    const goldColor = interpolateColor(
      goldValue.value,
      [0, 1],
      ['transparent', 'rgba(255, 215, 0, 0.1)']
    );

    const currentZodiacColor = zodiacTint.value;

    return {
      backgroundColor: goldValue.value > 0 ? goldColor : (step >= 2 ? currentZodiacColor : genderColor),
    };
  });

  const animatedZodiacStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${zodiacRotation.value}deg` }]
  }));

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Esto obliga a elegir un cuadrado (el rostro)
      quality: 0.8,
    });

    if (!result.canceled) {
      setBabyPhotoUri(result.assets[0].uri);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const autoGoals = useMemo(
    () => computeAutoGoals(babyBirthDate, Number(currentWeightKg) || undefined),
    [babyBirthDate, currentWeightKg],
  );

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress}%`,
  }));

  useEffect(() => {
    setPath(guestMode ? 'guest' : 'account');
    setStep((current) => (current < 1 ? 1 : current));
  }, [guestMode, setPath, setStep]);

  const canContinueProfile = useMemo(() => {
    const isDateValid = babyBirthDate.getTime() <= Date.now();
    return Boolean(babyName.trim() && caregiverName.trim() && isDateValid);
  }, [babyName, caregiverName, babyBirthDate]);

  const handleProfileNext = () => {
    const isFutureDate = babyBirthDate.getTime() > Date.now();
    
    if (isFutureDate) {
      shake.value = withSequence(
        withTiming(-10, { duration: 45 }),
        withTiming(10, { duration: 45 }),
        withTiming(-10, { duration: 45 }),
        withTiming(10, { duration: 45 }),
        withTiming(0, { duration: 45 })
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    if (canContinueProfile) {
      next();
    } else {
      setShowValidation(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  async function playPopSound() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3' },
        { shouldPlay: true }
      );
      await sound.playAsync();
    } catch (e) {
      console.log('Error playing sound', e);
    }
  }

  async function finishOnboarding() {
    if (saving) return;
    setSaving(true);
    setSubmitError('');
    try {
      if (!guestMode && !user) {
        throw new Error('Session not ready yet. Please sign in again.');
      }

      if (path === 'pin') {
        if (pin.length !== 4 || confirmPin.length !== 4 || pin !== confirmPin) {
          shake.value = withSequence(withTiming(-8, { duration: 70 }), withTiming(8, { duration: 70 }), withTiming(0, { duration: 70 }));
          Alert.alert('PIN invalide', 'Le PIN doit faire 4 chiffres et correspondre a la confirmation.');
          return;
        }
        await AsyncStorage.setItem('appleo.localPin', pin);
      }

      await AsyncStorage.setItem('appleo.onboardingPath', path);
      const parsedFeedings = Number(goalFeedingsPerDay);
      const parsedSleep = Number(goalSleepHoursPerDay);
      const parsedDiapers = Number(goalDiapersPerDay);
      const finalGoals = {
        feedingsPerDay: Number.isFinite(parsedFeedings) && parsedFeedings > 0 ? clamp(Math.round(parsedFeedings), 3, 12) : autoGoals.feedings,
        sleepHoursPerDay: Number.isFinite(parsedSleep) && parsedSleep > 0 ? clamp(Math.round(parsedSleep), 8, 18) : autoGoals.sleep,
        diapersPerDay: Number.isFinite(parsedDiapers) && parsedDiapers > 0 ? clamp(Math.round(parsedDiapers), 2, 12) : autoGoals.diapers,
      };
      await completeUserOnboarding({
        caregiverName: caregiverName.trim() || 'Parent',
        babyName: babyName.trim() || 'Leo',
        babyBirthDate: babyBirthDate.toISOString(),
        babySex,
        birthWeightKg: Number(birthWeightKg) || undefined,
        currentWeightKg: Number(currentWeightKg) || undefined,
        heightCm: Number(heightCm) || undefined,
        headCircCm: Number(headCircCm) || undefined,
        babyNotes: babyNotes.trim() || undefined,
        language,
        goalFeedingsPerDay: finalGoals.feedingsPerDay,
        goalSleepHoursPerDay: finalGoals.sleepHoursPerDay,
        goalDiapersPerDay: finalGoals.diapersPerDay,
      });

      if (profile) {
        await buildBabyFromProfile(
          {
            ...profile,
            caregiverName: caregiverName.trim() || profile.caregiverName,
            babyName: babyName.trim() || 'Leo',
            babyBirthDate: babyBirthDate.toISOString(),
            babySex,
            birthWeightKg: Number(birthWeightKg) || undefined,
            currentWeightKg: Number(currentWeightKg) || undefined,
            heightCm: Number(heightCm) || undefined,
            headCircCm: Number(headCircCm) || undefined,
            babyNotes: babyNotes.trim() || undefined,
            language,
          },
          babyName.trim() || 'Leo',
          babyBirthDate.toISOString(),
          babySex,
        );
      }

      router.replace('/home');
    } catch (error: any) {
      const message = error?.message ?? 'Verifie les champs et recommence.';
      setSubmitError(message);
      Alert.alert('Configuration impossible', message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page scroll={true} contentStyle={styles.pageContainer}>
      <Animated.Image source={{ uri: bgSource }} style={[StyleSheet.absoluteFillObject, { opacity: bgOpacity }]} />
      <BlurView intensity={Platform.OS === 'ios' ? 30 : 60} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
      
      {/* Capa de color por género */}
      <Reanimated.View style={[StyleSheet.absoluteFillObject, animatedTintStyle]} />

      <View style={[styles.shell, { maxWidth: isDesktop ? 460 : isTablet ? 520 : '100%' }]}>
        <Card style={{ padding: 24 * uiScale }}>
          {/* Header unificado minimalista */}
          <View style={{ marginBottom: 20 * uiScale }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 * uiScale }}>
              {step > 0 && (
                <Pressable onPress={back} style={{ position: 'absolute', left: -10 * uiScale, padding: 8 }}>
                  <Ionicons name="chevron-back" size={24 * uiScale} color={colors.primary} />
                </Pressable>
              )}
            <Heading 
              title={
                step === 0 ? (language === 'nl' ? "Welkom" : language === 'es' ? "Bienvenido" : language === 'en' ? "Welcome" : "Bienvenue") : 
                step === 1 ? (language === 'nl' ? "Taal" : language === 'es' ? "Idioma" : language === 'en' ? "Language" : "Langue") : 
                step === 2 ? (babyName || (language === 'nl' ? "Baby" : language === 'es' ? "Bebé" : "Bébé")) : 
                (language === 'nl' ? "Doelen" : language === 'es' ? "Objetivos" : "Objectifs")
              } 
            />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 * uiScale }}>
              <Text style={{ fontSize: 9 * uiScale, fontWeight: '900', color: colors.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
                {language === 'fr' ? 'Étape' : language === 'es' ? 'Paso' : language === 'nl' ? 'Stap' : 'Step'} {step + 1} / {path === 'pin' ? 5 : 4}
              </Text>
            </View>
            <View style={{ height: 4 * uiScale, borderRadius: 10, backgroundColor: theme.progressBg, overflow: 'hidden' }}>
              <Reanimated.View style={[{ height: '100%', backgroundColor: colors.primary, borderRadius: 10 }, progressStyle]} />
            </View>
          </View>

          <View>
            {step === 0 && (
          <Reanimated.View entering={FadeIn.duration(220)} style={{ gap: 12 * uiScale }}>
            {getPathCards(language).map((item) => {
              const active = path === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={async () => {
                    setPath(item.key);
                    if (item.key === 'guest' && !profile && !guestMode) {
                      await signInGuest();
                    }
                  }}
                  style={{
                    borderRadius: 16 * uiScale,
                    borderWidth: 1,
                    padding: 16 * uiScale,
                    borderColor: active ? theme.borderActive : theme.border,
                    backgroundColor: active ? `${theme.accent}16` : theme.bgCardAlt,
                    gap: 4 * uiScale,
                  }}
                >
                  <Text style={{ fontSize: 17 * uiScale, fontWeight: '800', color: theme.textPrimary }}>{item.title}</Text>
                  <Text style={{ fontSize: 14 * uiScale, color: theme.textMuted }}>{item.body}</Text>
                </Pressable>
              );
            })}
            <Button label={path === 'guest' ? 'Continuer en invite' : 'Continuer'} onPress={next} />
          </Reanimated.View>
            )}

            {step === 1 && (
          <Reanimated.View entering={FadeInRight.duration(220)} style={{ gap: 8 * uiScale }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 * uiScale, justifyContent: 'center' }}>
              {languageOptions.map((item) => {
                const active = language === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setLanguage(item.value as AppLanguage)}
                    style={{
                      width: isTablet ? '44%' : '46%',
                      padding: 12 * uiScale,
                      borderRadius: 14 * uiScale,
                      borderWidth: 1.5,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? `${colors.primary}15` : colors.surface,
                      alignItems: 'center',
                      gap: 4 * uiScale
                    }}
                  >
                    <Text style={{ fontSize: 32 * uiScale }}>{item.flag}</Text>
                    <Text style={{ fontSize: 14 * uiScale, fontWeight: '700', color: colors.text }}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Button label={language === 'nl' ? 'Doorgaan' : 'Continuer'} onPress={next} fullWidth />
          </Reanimated.View>
            )}

            {step === 2 && (
              <Reanimated.View entering={FadeInRight.duration(220)} style={{ gap: 10 * uiScale }}>
                {/* Preview Card Premium & Adorable */}
                <View style={{ 
                  backgroundColor: scheme === 'dark' ? `${zodiac.color}15` : `${zodiac.color}08`, 
                  borderRadius: 20 * uiScale, 
                  padding: 16 * uiScale, 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: 14 * uiScale,
                  marginBottom: 4 * uiScale,
                  borderWidth: 2,
                  borderColor: scheme === 'dark' ? `${zodiac.color}30` : `${zodiac.color}15`,
                  ...Platform.select({
                    web: { boxShadow: '0px 8px 24px rgba(0,0,0,0.06)' },
                  })
                }}>
                  <Reanimated.View style={[{ position: 'absolute', top: 12 * uiScale, right: 12 * uiScale, backgroundColor: `${zodiac.color}20`, width: 26 * uiScale, height: 26 * uiScale, borderRadius: 13 * uiScale, alignItems: 'center', justifyContent: 'center' }, animatedZodiacStyle]}>
                    <Text style={{ fontSize: 12 * uiScale }}>{zodiac.symbol}</Text>
                  </Reanimated.View>

                  <Reanimated.View style={animatedAvatarStyle}>
                  <Pressable onPress={pickImage} style={({ pressed }) => ({
                    width: 64 * uiScale, 
                    height: 64 * uiScale, 
                    borderRadius: 20 * uiScale, 
                    backgroundColor: babySex === 'female' ? '#FF85A225' : babySex === 'male' ? '#4D96FF25' : colors.backgroundAlt, 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: babySex === 'female' ? '#FF85A240' : babySex === 'male' ? '#4D96FF40' : colors.border,
                    overflow: 'hidden',
                    opacity: pressed ? 0.8 : 1,
                    ...Platform.select({
                      web: { boxShadow: 'inset 0px 2px 4px rgba(255,255,255,0.3)' }
                    })
                  })}>
                    {babyPhotoUri ? (
                      <Image source={{ uri: babyPhotoUri }} style={{ width: '100%', height: '100%', borderRadius: 20 * uiScale }} />
                    ) : (
                      <Text style={{ fontSize: 34 * uiScale }}>{babySex === 'female' ? "🎀" : babySex === 'male' ? "🪁" : "🧸"}</Text>
                    )}
                    <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.primary, padding: 3 * uiScale, borderTopLeftRadius: 8 * uiScale }}>
                      <Ionicons name="camera" size={11 * uiScale} color="#fff" />
                    </View>
                  </Pressable>
                  </Reanimated.View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 20 * uiScale, fontWeight: '900', color: colors.text, letterSpacing: -0.8 }}>{babyName || "..."}</Text>
                      <Pressable onPress={() => { setShowTraits(!showTraits); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                        <Ionicons name="information-circle-outline" size={18 * uiScale} color={zodiac.color} />
                      </Pressable>
                    </View>
                    {showTraits && (
                      <Reanimated.Text entering={FadeIn} style={{ fontSize: 11 * uiScale, color: colors.muted, fontStyle: 'italic', marginBottom: 4 }}>
                        {zodiac.trait}
                      </Reanimated.Text>
                    )}
                  </View>
                </View>

            <Input 
              label={language === 'nl' ? 'Uw naam *' : language === 'es' ? 'Tu nombre *' : 'Votre nom *'} 
              value={caregiverName} 
              onChangeText={setCaregiverName} 
              placeholder="Andrea" 
              autoCapitalize="words" 
              iconName="person-outline"
              error={showValidation && !caregiverName.trim() ? '•' : undefined}
            />
            <Input 
              label={language === 'nl' ? "Baby's naam *" : language === 'es' ? 'Nombre del bebé *' : 'Nom du bébé *'} 
              value={babyName} 
              onChangeText={setBabyName} 
              placeholder="Leo" 
              autoCapitalize="words" 
              iconName="heart-outline"
              iconColor="#FF85A2"
              error={showValidation && !babyName.trim() ? '•' : undefined}
            />
            <View style={{ marginTop: 4 * uiScale, gap: 8 * uiScale }}>
              <Reanimated.View style={{ transform: [{ translateX: shake }] }}>
                <DateTimeField 
                  label={language === 'nl' ? 'Geboortedatum *' : language === 'es' ? 'Fecha de nacimiento *' : 'Date de naissance *'} 
                  value={babyBirthDate} 
                  onChange={(d) => {
                    setBabyBirthDate(d);
                    setIsDateConfirmed(false);
                  }} 
                  scale={uiScale}
                  error={babyBirthDate.getTime() > Date.now()}
                />
              </Reanimated.View>
              {babyBirthDate.getTime() > Date.now() && (
                <Text style={{ color: colors.danger, fontSize: 11 * uiScale, marginLeft: 4 * uiScale, marginTop: -4 * uiScale }}>
                  {language === 'nl' ? 'Datum kan niet in de toekomst zijn' : language === 'es' ? 'La fecha no puede ser futura' : language === 'fr' ? 'La date ne peut pas être future' : 'Date cannot be in the future'}
                </Text>
              )}
              {!isDateConfirmed && (
                <Reanimated.View entering={FadeIn.duration(300)}>
                  <Button 
                    label={language === 'nl' ? 'Bevestig datum' : language === 'es' ? 'Confirmar fecha' : language === 'en' ? 'Confirm Date' : 'Confirmer la date'}
                    variant="secondary"
                    iconName="checkmark-done-outline"
                    onPress={() => {
                      setIsDateConfirmed(true);
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }}
                  />
                </Reanimated.View>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 * uiScale, marginTop: 4 * uiScale }}>
              {([
                { value: 'unspecified' as const, label: language === 'nl' ? 'Neutraal' : language === 'es' ? 'Neutro' : 'Neutre', icon: 'remove-circle-outline' as const },
                { value: 'female' as const, label: language === 'nl' ? 'Meisje' : language === 'es' ? 'Niña' : 'Fille', icon: 'female-outline' as const },
                { value: 'male' as const, label: language === 'nl' ? 'Jongen' : language === 'es' ? 'Niño' : 'Garçon', icon: 'male-outline' as const },
              ] as const).map((item) => {
                const active = babySex === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setBabySex(item.value)}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 34 * uiScale,
                      borderRadius: 12 * uiScale,
                      borderWidth: 1.5,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? `${colors.primary}15` : colors.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6 * uiScale,
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <Ionicons name={item.icon} size={14 * uiScale} color={active ? colors.primary : colors.muted} />
                    <Text style={{ color: active ? colors.primary : colors.muted, fontWeight: '700', fontSize: 10 * uiScale }}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 12 * uiScale, marginTop: 4 * uiScale }}>
               <View style={{ flex: 1, gap: 8 * uiScale }}>
                  <Input 
                    label={language === 'fr' ? 'Poids (kg)' : language === 'nl' ? 'Gewicht (kg)' : 'Weight (kg)'} 
                    value={birthWeightKg} 
                    onChangeText={setBirthWeightKg} 
                    keyboardType="decimal-pad" 
                    placeholder="0.0" 
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20 * uiScale, marginTop: -4 * uiScale }}>
                    <Pressable onPress={() => {
                      const current = parseFloat(birthWeightKg) || 3.5;
                      setBirthWeightKg(Math.max(0, current - 0.1).toFixed(1));
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }} style={{ padding: 4 }}>
                      <Ionicons name="remove-circle-outline" size={22 * uiScale} color={colors.primary} />
                    </Pressable>
                    <Pressable onPress={() => {
                      const current = parseFloat(birthWeightKg) || 3.5;
                      setBirthWeightKg(Math.max(0, current + 0.1).toFixed(1));
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }} style={{ padding: 4 }}>
                      <Ionicons name="add-circle-outline" size={22 * uiScale} color={colors.primary} />
                    </Pressable>
                  </View>
               </View>
               <View style={{ flex: 1, gap: 8 * uiScale }}>
                  <Input 
                    label={language === 'fr' ? 'Taille (cm)' : language === 'nl' ? 'Lengte (cm)' : 'Height (cm)'} 
                    value={heightCm} 
                    onChangeText={setHeightCm} 
                    keyboardType="decimal-pad" 
                    placeholder="0" 
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20 * uiScale, marginTop: -4 * uiScale }}>
                    <Pressable onPress={() => {
                      const current = parseInt(heightCm) || 50;
                      setHeightCm(String(Math.max(0, current - 1)));
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }} style={{ padding: 4 }}>
                      <Ionicons name="remove-circle-outline" size={22 * uiScale} color={colors.primary} />
                    </Pressable>
                    <Pressable onPress={() => {
                      const current = parseInt(heightCm) || 50;
                      setHeightCm(String(Math.max(0, current + 1)));
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }} style={{ padding: 4 }}>
                      <Ionicons name="add-circle-outline" size={22 * uiScale} color={colors.primary} />
                    </Pressable>
                  </View>
               </View>
            </View>
            <Button label={language === 'nl' ? 'Doorgaan' : 'Continuer'} onPress={handleProfileNext} fullWidth />
          </Reanimated.View>
            )}

            {step === 3 && path === 'pin' && (
              <Reanimated.View entering={FadeInRight.duration(220)} style={{ gap: 16 * uiScale }}>
            <Reanimated.View style={{ transform: [{ translateX: shake }] }}>
              <Input label={language === 'nl' ? '4-cijferige pincode' : 'PIN 4 chiffres'} value={pin} onChangeText={setPin} keyboardType="number-pad" inputMode="numeric" />
              <Input label={language === 'nl' ? 'Bevestig pincode' : 'Confirmer le PIN'} value={confirmPin} onChangeText={setConfirmPin} keyboardType="number-pad" inputMode="numeric" />
            </Reanimated.View>
            <Button label={language === 'nl' ? 'Doorgaan' : 'Continuer'} onPress={next} disabled={pin.length < 4 || confirmPin.length < 4} />
          </Reanimated.View>
            )}

            {((step === 3 && path !== 'pin') || (step === 4 && path === 'pin')) && (
              <Reanimated.View entering={FadeInRight.duration(220)} style={{ gap: 16 * uiScale }}>
            <Input
              label={language === 'nl' ? 'Doel voedingen / dag' : language === 'es' ? 'Objetivo tomas / día' : language === 'en' ? 'Daily feeding goal' : 'Objectif prises / jour'}
              value={goalFeedingsPerDay}
              onChangeText={setGoalFeedingsPerDay}
              keyboardType="numeric"
              inputMode="numeric"
              iconName="water"
              iconColor="#4D96FF"
              hint={`Suggestion auto: ${autoGoals.feedings}`}
            />
            <Input
              label={language === 'nl' ? 'Doel slaap / dag' : language === 'es' ? 'Objetivo sueño / día' : language === 'en' ? 'Daily sleep goal' : 'Objectif sommeil / jour'}
              value={goalSleepHoursPerDay}
              onChangeText={setGoalSleepHoursPerDay}
              keyboardType="numeric"
              inputMode="numeric"
              iconName="moon"
              iconColor="#9B59B6"
              hint={`Suggestion auto: ${autoGoals.sleep}`}
            />
            <Input
              label={language === 'nl' ? 'Doel luiers / dag' : language === 'es' ? 'Objetivo pañales / día' : language === 'en' ? 'Daily diapers goal' : 'Objectif couches / jour'}
              value={goalDiapersPerDay}
              onChangeText={setGoalDiapersPerDay}
              keyboardType="numeric"
              inputMode="numeric"
              iconName="layers"
              iconColor="#6BCB77"
              hint={`Suggestion auto: ${autoGoals.diapers}`}
            />
            {submitError ? <Text style={{ color: colors.danger, textAlign: 'center', fontSize: 13 * uiScale }}>{submitError}</Text> : null}
            <Button label={language === 'nl' ? 'Klaar!' : 'Tout est pret'} onPress={finishOnboarding} loading={saving} disabled={saving} />
          </Reanimated.View>
            )}
          </View>
        </Card>
      </View>

      {showConfetti && (
        <ConfettiCannon 
          count={250} 
          origin={{ x: width / 2, y: -50 }} 
          explosionSpeed={350}
          colors={[colors.primary, theme.accent, '#FFD700', '#FF85A2', '#4D96FF', '#6BCB77']}
        />
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40, // Espacio para que el scroll respire
  },
  shell: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignSelf: 'center',
  },
});
