import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, Animated, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated2, { FadeInRight, useAnimatedStyle } from 'react-native-reanimated';
import { Button, Card, Input, Page, Segment } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { DateTimeField } from '@/components/DateTimeField';
import { useOnboarding, type OnboardingPath } from '@/hooks/useOnboarding';
import { useTheme } from '@/context/ThemeContext';
import { useLocale } from '@/context/LocaleContext';
import { useResponsiveLayout } from '@/lib/responsiveLayout';
import { ResponsiveHeroSection, ResponsiveFormGroup, ResponsiveContentWrapper, ResponsiveSection } from '@/components/ResponsiveLayout';
import { typography } from '@/typography';
import { AppLanguage } from '@/types';


type BabySex = 'female' | 'male' | 'unspecified';

const languageOptions = [
  { label: 'Francais', value: 'fr' },
  { label: 'Espanol', value: 'es' },
  { label: 'English', value: 'en' },
  { label: 'Nederlands', value: 'nl' },
];

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
  const { theme } = useTheme();
  const { t } = useLocale();
  const layout = useResponsiveLayout();
  const { user, profile, guestMode, completeUserOnboarding } = useAuth();
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
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  const autoGoals = useMemo(
    () => computeAutoGoals(babyBirthDate, Number(currentWeightKg) || undefined),
    [babyBirthDate, currentWeightKg],
  );

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress}%`,
  }));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [step]);

  useEffect(() => {
    setPath(guestMode ? 'guest' : 'account');
    setStep((current) => (current < 1 ? 1 : current));
  }, [guestMode, setPath, setStep]);

  useEffect(() => {
    if (!profile) return;
    setCaregiverName(profile.caregiverName ?? '');
    setBabyName(profile.babyName ?? 'Leo');
    setBabyBirthDate(new Date(profile.babyBirthDate ?? '2025-10-21T08:00:00.000Z'));
    setBabySex(profile.babySex ?? 'unspecified');
    setBirthWeightKg(profile.birthWeightKg ? String(profile.birthWeightKg) : '');
    setCurrentWeightKg(profile.currentWeightKg ? String(profile.currentWeightKg) : '');
    setHeightCm(profile.heightCm ? String(profile.heightCm) : '');
    setHeadCircCm(profile.headCircCm ? String(profile.headCircCm) : '');
    setBabyNotes(profile.babyNotes ?? '');
    setLanguage(profile.language ?? 'fr');
    setGoalFeedingsPerDay(profile.goalFeedingsPerDay ? String(profile.goalFeedingsPerDay) : '');
    setGoalSleepHoursPerDay(profile.goalSleepHoursPerDay ? String(profile.goalSleepHoursPerDay) : '');
    setGoalDiapersPerDay(profile.goalDiapersPerDay ? String(profile.goalDiapersPerDay) : '');
  }, [profile]);

  const canContinueProfile = useMemo(() => {
    return Boolean(babyName.trim() && caregiverName.trim());
  }, [babyName, caregiverName]);

  const validateField = (field: string, value: string): string | null => {
    switch (field) {
      case 'caregiverName':
        if (!value.trim()) return 'Parent name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        return null;
      case 'babyName':
        if (!value.trim()) return 'Baby name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        return null;
      case 'birthWeightKg':
        if (value && (Number(value) < 0.5 || Number(value) > 10)) return 'Weight must be between 0.5 and 10 kg';
        return null;
      case 'currentWeightKg':
        if (value && (Number(value) < 0.5 || Number(value) > 10)) return 'Weight must be between 0.5 and 10 kg';
        return null;
      case 'heightCm':
        if (value && (Number(value) < 30 || Number(value) > 120)) return 'Height must be between 30 and 120 cm';
        return null;
      case 'headCircCm':
        if (value && (Number(value) < 20 || Number(value) > 60)) return 'Head circumference must be between 20 and 60 cm';
        return null;
      default:
        return null;
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    const error = validateField(field, value);
    setFormErrors(prev => ({ ...prev, [field]: error || '' }));
    setSubmitError('');

    // Update the corresponding state
    switch (field) {
      case 'caregiverName': setCaregiverName(value); break;
      case 'babyName': setBabyName(value); break;
      case 'birthWeightKg': setBirthWeightKg(value); break;
      case 'currentWeightKg': setCurrentWeightKg(value); break;
      case 'heightCm': setHeightCm(value); break;
      case 'headCircCm': setHeadCircCm(value); break;
    }
  };

  async function finishOnboarding() {
    if (saving) return;
    setSaving(true);
    setSubmitError('');
    try {
      if (!guestMode && !user) {
        throw new Error('Session not ready yet. Please sign in again.');
      }
      const parsedFeedings = Number(goalFeedingsPerDay);
      const parsedSleep = Number(goalSleepHoursPerDay);
      const parsedDiapers = Number(goalDiapersPerDay);
      const finalGoals = {
        feedingsPerDay: Number.isFinite(parsedFeedings) && parsedFeedings > 0 ? clamp(Math.round(parsedFeedings), 3, 12) : autoGoals.feedings,
        sleepHoursPerDay: Number.isFinite(parsedSleep) && parsedSleep > 0 ? clamp(Math.round(parsedSleep), 8, 18) : autoGoals.sleep,
        diapersPerDay: Number.isFinite(parsedDiapers) && parsedDiapers > 0 ? clamp(Math.round(parsedDiapers), 2, 12) : autoGoals.diapers,
      };
      const updatedProfile = await completeUserOnboarding({
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
    <Page scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: layout.gapMd, paddingBottom: layout.gapXl }}>
        <View style={styles.container}>
          {/* Header */}
          <Animated.View style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            gap: layout.gapMd,
            marginBottom: layout.gapLg
          }}>
            <View style={styles.header}>
              <Text style={[styles.brand, { color: theme.accent }]}>BABYFLOW</Text>
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>BabyFlow setup</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: theme.progressBg }]}>
                <Animated.View style={[{ height: '100%', backgroundColor: theme.progressFill, borderRadius: 999 }, progressStyle]} />
              </View>
              <Text style={[styles.progressText, { color: theme.textMuted }]}>
                Step {step} of 3
              </Text>
            </View>
          </Animated.View>

          {/* Back Button */}
          {step > 1 && (
            <Animated2.View entering={FadeInRight.duration(200)}>
              <Button
                label="Back"
                onPress={back}
                variant="ghost"
                style={styles.backButton}
              />
            </Animated2.View>
          )}

          {/* Step 1: Language */}
          {step === 1 ? (
            <Animated2.View entering={FadeInRight.duration(300)} style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }}>
              <View style={[styles.stepCard, { backgroundColor: theme.bgCard }]}>
                <View style={styles.stepHeader}>
                  <Ionicons name="language-outline" size={24} color={theme.accent} />
                  <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>Language</Text>
                  <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>Choose your preferred language</Text>
                </View>

                <View style={styles.languageContainer}>
                  <Segment value={language} onChange={(value) => setLanguage(value as AppLanguage)} options={languageOptions} />
                </View>

                <View style={styles.actionContainer}>
                  <Button label="Continue" onPress={next} style={styles.primaryButton} />
                </View>
              </View>
            </Animated2.View>
          ) : null}

          {/* Step 2: Profile */}
          {step === 2 ? (
            <Animated2.View entering={FadeInRight.duration(300)} style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }}>
              <View style={[styles.stepCard, { backgroundColor: theme.bgCard }]}>
                <View style={styles.stepHeader}>
                  <Ionicons name="person-outline" size={24} color={theme.accent} />
                  <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>Baby Profile</Text>
                  <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>Tell us about your baby</Text>
                </View>

                <View style={styles.formContainer}>
                  <View style={styles.requiredNote}>
                    <Text style={[styles.requiredText, { color: theme.textMuted }]}>* Required fields</Text>
                  </View>

                  <View style={styles.formGroup}>
                    <Input
                      label="Parent Name *"
                      value={caregiverName}
                      onChangeText={(value) => handleFieldChange('caregiverName', value)}
                      placeholder="Andrea"
                      autoCapitalize="words"
                      error={formErrors.caregiverName}
                    />
                    <Input
                      label="Baby Name *"
                      value={babyName}
                      onChangeText={(value) => handleFieldChange('babyName', value)}
                      placeholder="Leo"
                      autoCapitalize="words"
                      error={formErrors.babyName}
                    />
                    <DateTimeField
                      label="Birth Date *"
                      value={babyBirthDate}
                      onChange={setBabyBirthDate}
                    />
                  </View>

                  {/* Baby Sex Options */}
                  <View style={styles.genderSection}>
                    <Text style={[styles.sectionLabel, { color: theme.accent }]}>Gender</Text>
                    <View style={styles.genderOptions}>
                      {[
                        { value: 'unspecified' as const, label: 'Not specified', icon: 'help-circle-outline' as const },
                        { value: 'female' as const, label: 'Girl', icon: 'female-outline' as const },
                        { value: 'male' as const, label: 'Boy', icon: 'male-outline' as const },
                      ].map((item) => {
                        const active = babySex === item.value;
                        return (
                          <Pressable
                            key={item.value}
                            onPress={() => setBabySex(item.value)}
                            style={({ pressed }: any) => [
                              styles.genderOption,
                              {
                                borderColor: active ? theme.accent : theme.border,
                                backgroundColor: active ? `${theme.accent}22` : theme.pillBg,
                                opacity: pressed ? 0.88 : 1,
                              }
                            ]}
                          >
                            <Ionicons name={item.icon} size={18} color={active ? theme.accent : theme.textMuted} />
                            <Text style={[styles.genderText, { color: active ? theme.accent : theme.textMuted }]}>
                              {item.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Input
                      label="Birth Weight (kg)"
                      value={birthWeightKg}
                      onChangeText={(value) => handleFieldChange('birthWeightKg', value)}
                      keyboardType="decimal-pad"
                      inputMode="decimal"
                      error={formErrors.birthWeightKg}
                    />
                    <Input
                      label="Current Weight (kg)"
                      value={currentWeightKg}
                      onChangeText={(value) => handleFieldChange('currentWeightKg', value)}
                      keyboardType="decimal-pad"
                      inputMode="decimal"
                      error={formErrors.currentWeightKg}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Input
                      label="Height (cm)"
                      value={heightCm}
                      onChangeText={(value) => handleFieldChange('heightCm', value)}
                      keyboardType="decimal-pad"
                      inputMode="decimal"
                      error={formErrors.heightCm}
                    />
                    <Input
                      label="Head Circumference (cm)"
                      value={headCircCm}
                      onChangeText={(value) => handleFieldChange('headCircCm', value)}
                      keyboardType="decimal-pad"
                      inputMode="decimal"
                      error={formErrors.headCircCm}
                    />
                  </View>

                  <Input
                    label="Notes"
                    value={babyNotes}
                    onChangeText={setBabyNotes}
                    multiline
                    placeholder="Optional notes about your baby"
                  />
                </View>

                <View style={styles.actionContainer}>
                  <Button
                    label="Continue"
                    onPress={next}
                    disabled={!canContinueProfile}
                    style={styles.primaryButton}
                  />
                </View>
              </View>
            </Animated2.View>
          ) : null}

          {/* Step 3: Goals */}
          {step === 3 ? (
            <Animated2.View entering={FadeInRight.duration(300)} style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }}>
              <View style={[styles.stepCard, { backgroundColor: theme.bgCard }]}>
                <View style={styles.stepHeader}>
                  <Ionicons name="target-outline" size={24} color={theme.accent} />
                  <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>Daily Goals</Text>
                  <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>Set your tracking goals</Text>
                </View>

                <View style={styles.formContainer}>
                  <View style={styles.formGroup}>
                    <Input
                      label="Daily Feedings"
                      value={goalFeedingsPerDay}
                      onChangeText={setGoalFeedingsPerDay}
                      keyboardType="numeric"
                      inputMode="numeric"
                      hint={`Suggested: ${autoGoals.feedings}`}
                    />
                    <Input
                      label="Sleep Hours"
                      value={goalSleepHoursPerDay}
                      onChangeText={setGoalSleepHoursPerDay}
                      keyboardType="numeric"
                      inputMode="numeric"
                      hint={`Suggested: ${autoGoals.sleep}`}
                    />
                    <Input
                      label="Daily Diapers"
                      value={goalDiapersPerDay}
                      onChangeText={setGoalDiapersPerDay}
                      keyboardType="numeric"
                      inputMode="numeric"
                      hint={`Suggested: ${autoGoals.diapers}`}
                    />
                  </View>

                  {submitError ? (
                    <Text style={[typography.body, { color: theme.red, textAlign: 'center', fontSize: layout.textSm }]}>
                      {submitError}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.actionContainer}>
                  <Button
                    label="Complete Setup"
                    onPress={finishOnboarding}
                    loading={saving}
                    disabled={saving}
                    style={styles.primaryButton}
                  />
                </View>
              </View>
            </Animated2.View>
          ) : null}
        </View>
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  brand: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 8,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  progressContainer: {
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 999,
    width: '100%',
    maxWidth: 200,
    overflow: 'hidden',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  stepCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepHeader: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  stepSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
  languageContainer: {
    marginBottom: 24,
  },
  formContainer: {
    gap: 20,
  },
  requiredNote: {
    alignItems: 'flex-start',
  },
  requiredText: {
    fontSize: 12,
    fontWeight: '500',
  },
  formGroup: {
    gap: 16,
  },
  genderSection: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  genderOptions: {
    gap: 12,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  genderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionContainer: {
    marginTop: 8,
  },
  primaryButton: {
    borderRadius: 12,
  },
});
