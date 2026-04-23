import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight, useAnimatedStyle } from 'react-native-reanimated';
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
        <ResponsiveContentWrapper maxWidth="compact">
          {/* Header - More compact */}
          <View style={{ gap: layout.gapXs, marginBottom: layout.gapSm }}>
            <ResponsiveHeroSection
              title={t('app.name', 'App Leo')}
              subtitle="Suivez chaque moment de Leo."
            />

            {/* Progress Bar - Compact */}
            <View style={{ height: 6, borderRadius: 999, backgroundColor: theme.progressBg, overflow: 'hidden' }}>
              <Animated.View style={[{ height: '100%', backgroundColor: theme.progressFill, borderRadius: 999 }, progressStyle]} />
            </View>
          </View>

          {/* Back Button */}
          {step > 1 ? <Button label={t('common.back', 'Back')} onPress={back} variant="ghost" /> : null}

          {/* Step 1: Language */}
          {step === 1 ? (
            <Card>
              <Animated.View entering={FadeInRight.duration(220)} style={{ gap: layout.gapMd }}>
                <Text style={[typography.sectionTitle, { color: theme.textPrimary, fontSize: layout.h3Size }]}>
                  {t('common.language', 'Language')}
                </Text>
                <Segment value={language} onChange={(value) => setLanguage(value as AppLanguage)} options={languageOptions} />
                <Button label={t('common.continue', 'Continue')} onPress={next} />
              </Animated.View>
            </Card>
          ) : null}

          {/* Step 2: Profile */}
          {step === 2 ? (
            <Card>
              <Animated.View entering={FadeInRight.duration(220)} style={{ gap: layout.gapMd }}>
                <Text style={[typography.body, { color: theme.textMuted, fontSize: layout.textSm }]}>
                  Les champs avec * sont importants.
                </Text>

                <ResponsiveFormGroup>
                  <Input label="Parent *" value={caregiverName} onChangeText={setCaregiverName} placeholder="Andrea" autoCapitalize="words" />
                  <Input label="Prenom de bebe *" value={babyName} onChangeText={setBabyName} placeholder="Leo" autoCapitalize="words" />
                  <DateTimeField label="Date de naissance *" value={babyBirthDate} onChange={setBabyBirthDate} />
                </ResponsiveFormGroup>

                {/* Baby Sex Options - Larger touch targets on mobile */}
                <View style={{ gap: layout.gapMd }}>
                  <Text style={[typography.sectionLabel, { color: theme.accent, fontSize: layout.textXxs }]}>SEXE</Text>
                  <View style={{ gap: layout.gapSm }}>
                    {[
                      { value: 'unspecified' as const, label: 'Non precise', icon: 'help-circle-outline' as const },
                      { value: 'female' as const, label: 'Fille', icon: 'female-outline' as const },
                      { value: 'male' as const, label: 'Garcon', icon: 'male-outline' as const },
                    ].map((item) => {
                      const active = babySex === item.value;
                      return (
                        <Pressable
                          key={item.value}
                          onPress={() => setBabySex(item.value)}
                          style={({ pressed }: any) => ({
                            minHeight: layout.minTouchTarget,
                            borderRadius: layout.buttonBorderRadius,
                            borderWidth: 1.5,
                            borderColor: active ? theme.accent : theme.border,
                            backgroundColor: active ? `${theme.accent}22` : theme.pillBg,
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'row',
                            gap: layout.gapSm,
                            opacity: pressed ? 0.88 : 1,
                            paddingVertical: layout.gapMd,
                          })}
                        >
                          <Ionicons name={item.icon} size={18} color={active ? theme.accent : theme.textMuted} />
                          <Text style={{ color: active ? theme.accent : theme.textMuted, fontWeight: '700', fontSize: layout.textBase }}>
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <ResponsiveFormGroup>
                  <Input label="Poids de naissance (kg)" value={birthWeightKg} onChangeText={setBirthWeightKg} keyboardType="decimal-pad" inputMode="decimal" />
                  <Input label="Poids actuel (kg)" value={currentWeightKg} onChangeText={setCurrentWeightKg} keyboardType="decimal-pad" inputMode="decimal" />
                </ResponsiveFormGroup>

                <ResponsiveFormGroup>
                  <Input label="Taille actuelle (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" inputMode="decimal" />
                  <Input label="Perimetre cranien (cm)" value={headCircCm} onChangeText={setHeadCircCm} keyboardType="decimal-pad" inputMode="decimal" />
                </ResponsiveFormGroup>

                <Input label="Notes" value={babyNotes} onChangeText={setBabyNotes} multiline placeholder="Optionnel" />
                <Button label={t('common.continue', 'Continue')} onPress={next} disabled={!canContinueProfile} />
              </Animated.View>
            </Card>
          ) : null}

          {/* Step 3: Goals */}
          {step === 3 ? (
            <Card>
              <Animated.View entering={FadeInRight.duration(220)} style={{ gap: layout.gapMd }}>
                <Text style={[typography.sectionTitle, { color: theme.textPrimary, fontSize: layout.h3Size }]}>
                  Objectifs personnalisés
                </Text>

                <ResponsiveFormGroup>
                  <Input
                    label="Objectif prises / jour"
                    value={goalFeedingsPerDay}
                    onChangeText={setGoalFeedingsPerDay}
                    keyboardType="numeric"
                    inputMode="numeric"
                    hint={`Suggestion auto: ${autoGoals.feedings}`}
                  />
                  <Input
                    label="Objectif sommeil / jour"
                    value={goalSleepHoursPerDay}
                    onChangeText={setGoalSleepHoursPerDay}
                    keyboardType="numeric"
                    inputMode="numeric"
                    hint={`Suggestion auto: ${autoGoals.sleep}`}
                  />
                  <Input
                    label="Objectif couches / jour"
                    value={goalDiapersPerDay}
                    onChangeText={setGoalDiapersPerDay}
                    keyboardType="numeric"
                    inputMode="numeric"
                    hint={`Suggestion auto: ${autoGoals.diapers}`}
                  />
                </ResponsiveFormGroup>

                {submitError ? (
                  <Text style={[typography.body, { color: theme.red, textAlign: 'center', fontSize: layout.textSm }]}>
                    {submitError}
                  </Text>
                ) : null}

                <Button label={t('common.done', 'Done')} onPress={finishOnboarding} loading={saving} disabled={saving} />
              </Animated.View>
            </Card>
          ) : null}
        </ResponsiveContentWrapper>
      </ScrollView>
    </Page>
  );
}
