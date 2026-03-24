import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
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

export default function OnboardingScreen() {
  const { theme } = useTheme();
  const { profile, guestMode, signInGuest, completeUserOnboarding } = useAuth();
  const { path, setPath, step, next, back, progress } = useOnboarding(0);
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
  const [goalFeedingsPerDay, setGoalFeedingsPerDay] = useState(String(profile?.goalFeedingsPerDay ?? 8));
  const [goalSleepHoursPerDay, setGoalSleepHoursPerDay] = useState(String(profile?.goalSleepHoursPerDay ?? 14));
  const [goalDiapersPerDay, setGoalDiapersPerDay] = useState(String(profile?.goalDiapersPerDay ?? 6));
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const shake = useSharedValue(0);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress}%`,
  }));

  const canContinueProfile = useMemo(() => {
    return Boolean(babyName.trim() && caregiverName.trim() && birthWeightKg.trim() && currentWeightKg.trim() && heightCm.trim() && headCircCm.trim());
  }, [babyName, caregiverName, birthWeightKg, currentWeightKg, heightCm, headCircCm]);

  async function finishOnboarding() {
    try {
      if (!profile && !guestMode) {
        await signInGuest();
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
        goalFeedingsPerDay: Number(goalFeedingsPerDay) || 8,
        goalSleepHoursPerDay: Number(goalSleepHoursPerDay) || 14,
        goalDiapersPerDay: Number(goalDiapersPerDay) || 6,
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
      Alert.alert('Configuration impossible', error?.message ?? 'Verifie les champs et recommence.');
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
          {step > 0 ? <Button label="Retour" onPress={back} variant="ghost" /> : null}
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
            <Input label="Parent" value={caregiverName} onChangeText={setCaregiverName} placeholder="Andrea" autoCapitalize="words" />
            <Input label="Prenom de bebe" value={babyName} onChangeText={setBabyName} placeholder="Leo" autoCapitalize="words" />
            <DateTimeField label="Date de naissance" value={babyBirthDate} onChange={setBabyBirthDate} />
            <Segment
              value={babySex}
              onChange={(value) => setBabySex(value as BabySex)}
              options={[
                { label: 'Non precise', value: 'unspecified' },
                { label: 'Fille', value: 'female' },
                { label: 'Garcon', value: 'male' },
              ]}
            />
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
            <Input label="Objectif prises / jour" value={goalFeedingsPerDay} onChangeText={setGoalFeedingsPerDay} keyboardType="numeric" inputMode="numeric" />
            <Input label="Objectif sommeil / jour" value={goalSleepHoursPerDay} onChangeText={setGoalSleepHoursPerDay} keyboardType="numeric" inputMode="numeric" />
            <Input label="Objectif couches / jour" value={goalDiapersPerDay} onChangeText={setGoalDiapersPerDay} keyboardType="numeric" inputMode="numeric" />
            <Button label="Tout est pret" onPress={finishOnboarding} />
          </Animated.View>
        </Card>
      ) : null}
    </Page>
  );
}
