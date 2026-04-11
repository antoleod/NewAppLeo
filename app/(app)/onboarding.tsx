import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInRight, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Card, Input, Page, Segment } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { buildBabyFromProfile } from '@/lib/storage';
import { DateTimeField } from '@/components/DateTimeField';
import { useOnboarding, type OnboardingPath } from '@/hooks/useOnboarding';
import { useTheme } from '@/context/ThemeContext';
import { typography } from '@/typography';

type BabySex = 'female' | 'male' | 'unspecified';
type AppLanguage = 'fr' | 'es' | 'en' | 'nl';

const languageOptions = [
  { label: 'Francais', value: 'fr' },
  { label: 'Espanol', value: 'es' },
  { label: 'English', value: 'en' },
  { label: 'Nederlands', value: 'nl' },
];

const pathCards: Array<{ key: OnboardingPath; title: string; body: string }> = [
  { key: 'guest', title: 'Guest', body: 'Commencer vite et tout garder en local.' },
  { key: 'pin', title: 'PIN', body: 'Acces rapide au foyer avec un code local.' },
  { key: 'account', title: 'Compte', body: 'Profil plus classique avec donnees locales.' },
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
  const { user, profile, guestMode, signInGuest, completeUserOnboarding } = useAuth();
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
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const shake = useSharedValue(0);
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
    <Page>
      <Card>
        <View style={{ gap: 12 }}>
          <View style={{ gap: 8 }}>
            <Text style={[typography.heroName, { color: theme.textPrimary, textAlign: 'center' }]}>Bienvenue</Text>
            <Text style={[typography.body, { color: theme.textMuted, textAlign: 'center' }]}>Suivez chaque moment de Leo.</Text>
          </View>
          <View style={{ height: 8, borderRadius: 999, backgroundColor: theme.progressBg, overflow: 'hidden' }}>
            <Animated.View style={[{ height: '100%', backgroundColor: theme.progressFill, borderRadius: 999 }, progressStyle]} />
          </View>
          {step > 1 ? <Button label="Retour" onPress={back} variant="ghost" /> : null}
        </View>
      </Card>

      {step === 0 ? (
        <Card>
          <Animated.View entering={FadeIn.duration(220)} style={{ gap: 12 }}>
            {pathCards.map((item) => {
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
                    borderRadius: 12,
                    borderWidth: 1,
                    padding: 14,
                    borderColor: active ? theme.borderActive : theme.border,
                    backgroundColor: active ? `${theme.accent}16` : theme.bgCardAlt,
                    gap: 4,
                  }}
                >
                  <Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>{item.title}</Text>
                  <Text style={[typography.body, { color: theme.textMuted }]}>{item.body}</Text>
                </Pressable>
              );
            })}
            <Button label={path === 'guest' ? 'Continuer en invite' : 'Continuer'} onPress={next} />
          </Animated.View>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <Animated.View entering={FadeInRight.duration(220)} style={{ gap: 12 }}>
            <Text style={[typography.sectionTitle, { color: theme.textPrimary, textAlign: 'center' }]}>Langue</Text>
            <Segment value={language} onChange={(value) => setLanguage(value as AppLanguage)} options={languageOptions} />
            <Button label="Continuer" onPress={next} />
          </Animated.View>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <Animated.View entering={FadeInRight.duration(220)} style={{ gap: 12 }}>
            <Text style={[typography.body, { color: theme.textMuted, textAlign: 'center' }]}>Les champs avec * sont importants.</Text>
            <Input label="Parent *" value={caregiverName} onChangeText={setCaregiverName} placeholder="Andrea" autoCapitalize="words" />
            <Input label="Prenom de bebe *" value={babyName} onChangeText={setBabyName} placeholder="Leo" autoCapitalize="words" />
            <DateTimeField label="Date de naissance *" value={babyBirthDate} onChange={setBabyBirthDate} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
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
                    style={({ pressed }) => ({
                      flex: 1,
                      minHeight: 44,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? theme.borderActive : theme.border,
                      backgroundColor: active ? `${theme.accent}22` : theme.pillBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                      opacity: pressed ? 0.88 : 1,
                    })}
                  >
                    <Ionicons name={item.icon} size={16} color={active ? theme.accent : theme.textMuted} />
                    <Text style={{ color: active ? theme.accent : theme.textMuted, fontWeight: '700' }}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Input label="Poids de naissance (kg)" value={birthWeightKg} onChangeText={setBirthWeightKg} keyboardType="decimal-pad" inputMode="decimal" />
            <Input label="Poids actuel (kg)" value={currentWeightKg} onChangeText={setCurrentWeightKg} keyboardType="decimal-pad" inputMode="decimal" />
            <Input label="Taille actuelle (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" inputMode="decimal" />
            <Input label="Perimetre cranien (cm)" value={headCircCm} onChangeText={setHeadCircCm} keyboardType="decimal-pad" inputMode="decimal" />
            <Input label="Notes" value={babyNotes} onChangeText={setBabyNotes} multiline placeholder="Optionnel" />
            <Button label="Continuer" onPress={next} disabled={!canContinueProfile} />
          </Animated.View>
        </Card>
      ) : null}

      {step === 3 && path === 'pin' ? (
        <Card>
          <Animated.View entering={FadeInRight.duration(220)} style={{ gap: 12 }}>
            <Animated.View style={{ transform: [{ translateX: shake }] }}>
              <Input label="PIN 4 chiffres" value={pin} onChangeText={setPin} keyboardType="number-pad" inputMode="numeric" />
              <Input label="Confirmer le PIN" value={confirmPin} onChangeText={setConfirmPin} keyboardType="number-pad" inputMode="numeric" />
            </Animated.View>
            <Button label="Continuer" onPress={next} disabled={pin.length < 4 || confirmPin.length < 4} />
          </Animated.View>
        </Card>
      ) : null}

      {((step === 3 && path !== 'pin') || (step === 4 && path === 'pin')) ? (
        <Card>
          <Animated.View entering={FadeInRight.duration(220)} style={{ gap: 12 }}>
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
            {submitError ? <Text style={[typography.body, { color: theme.red, textAlign: 'center' }]}>{submitError}</Text> : null}
            <Button label="Tout est pret" onPress={finishOnboarding} loading={saving} disabled={saving} />
          </Animated.View>
        </Card>
      ) : null}
    </Page>
  );
}
