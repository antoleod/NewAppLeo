import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Heading, Input, Page, Segment } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { buildBabyFromProfile } from '@/lib/storage';
import { DateTimeField } from '@/components/DateTimeField';
import { useLocale } from '@/context/LocaleContext';

type BabySex = 'female' | 'male' | 'unspecified';
type AppLanguage = 'fr' | 'es' | 'en' | 'nl';

const languageOptions = [
  { label: 'Francais', value: 'fr' },
  { label: 'Espanol', value: 'es' },
  { label: 'English', value: 'en' },
  { label: 'Nederlands', value: 'nl' },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { language: activeLanguage } = useLocale();
  const { profile, guestMode, completeUserOnboarding } = useAuth();
  const [step, setStep] = useState(0);
  const [caregiverName, setCaregiverName] = useState(profile?.caregiverName ?? '');
  const [babyName, setBabyName] = useState(profile?.babyName ?? 'Leo');
  const [babyBirthDate, setBabyBirthDate] = useState(new Date(profile?.babyBirthDate ?? '2025-10-21T08:00:00.000Z'));
  const [babySex, setBabySex] = useState<BabySex>(profile?.babySex ?? 'unspecified');
  const [birthWeightKg, setBirthWeightKg] = useState(profile?.birthWeightKg ? String(profile.birthWeightKg) : '');
  const [currentWeightKg, setCurrentWeightKg] = useState(profile?.currentWeightKg ? String(profile.currentWeightKg) : '');
  const [heightCm, setHeightCm] = useState(profile?.heightCm ? String(profile.heightCm) : '');
  const [babyNotes, setBabyNotes] = useState(profile?.babyNotes ?? '');
  const [language, setLanguage] = useState<AppLanguage>(profile?.language ?? 'fr');
  const [goalFeedingsPerDay, setGoalFeedingsPerDay] = useState(String(profile?.goalFeedingsPerDay ?? 8));
  const [goalSleepHoursPerDay, setGoalSleepHoursPerDay] = useState(String(profile?.goalSleepHoursPerDay ?? 14));
  const [goalDiapersPerDay, setGoalDiapersPerDay] = useState(String(profile?.goalDiapersPerDay ?? 6));

  useEffect(() => {
    if (!profile) return;
    setCaregiverName(profile.caregiverName ?? '');
    setBabyName(profile.babyName ?? 'Leo');
    setBabySex(profile.babySex ?? 'unspecified');
    setBirthWeightKg(profile.birthWeightKg ? String(profile.birthWeightKg) : '');
    setCurrentWeightKg(profile.currentWeightKg ? String(profile.currentWeightKg) : '');
    setHeightCm(profile.heightCm ? String(profile.heightCm) : '');
    setBabyNotes(profile.babyNotes ?? '');
    setLanguage(profile.language ?? 'fr');
  }, [profile]);

  async function handleFinish() {
    try {
      await completeUserOnboarding({
        caregiverName: caregiverName.trim() || (guestMode ? 'Parent' : profile?.displayName ?? 'Parent'),
        babyName: babyName.trim() || 'Leo',
        babyBirthDate: babyBirthDate.toISOString(),
        babySex,
        birthWeightKg: Number(birthWeightKg) || undefined,
        currentWeightKg: Number(currentWeightKg) || undefined,
        heightCm: Number(heightCm) || undefined,
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
            babyNotes: babyNotes.trim() || undefined,
            language,
          },
          babyName.trim(),
          babyBirthDate.toISOString(),
          babySex,
        );
      }
      router.replace('/home');
    } catch (error: any) {
      Alert.alert('Could not finish setup', error?.message ?? 'Check the inputs and try again.');
    }
  }

  return (
    <Page>
      <Heading
        eyebrow="Onboarding"
        title={activeLanguage === 'fr' ? 'Votre espace famille' : 'Family setup'}
        subtitle={activeLanguage === 'fr' ? 'On configure le profil de bebe, la langue et quelques reperes utiles pour le quotidien.' : 'Set up baby profile, language, and daily goals.'}
      />
      <Card>
        {step === 0 ? (
          <View style={{ gap: 14 }}>
            <Input label="Parent" value={caregiverName} onChangeText={setCaregiverName} placeholder="Andrea" />
            <Input label="Prenom de bebe" value={babyName} onChangeText={setBabyName} placeholder="Leo" autoCapitalize="words" />
            <DateTimeField label="Date de naissance" value={babyBirthDate} onChange={setBabyBirthDate} />
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16, textAlign: 'center' }}>Sexe</Text>
            <Segment
              value={babySex}
              onChange={(value) => setBabySex(value as BabySex)}
              options={[
                { label: 'Non precise', value: 'unspecified' },
                { label: 'Fille', value: 'female' },
                { label: 'Garcon', value: 'male' },
              ]}
            />
            <Button label="Continuer" onPress={() => setStep(1)} />
          </View>
        ) : null}

        {step === 1 ? (
          <View style={{ gap: 14 }}>
            <Input label="Poids de naissance (kg)" value={birthWeightKg} onChangeText={setBirthWeightKg} keyboardType="decimal-pad" inputMode="decimal" placeholder="3.4" />
            <Input label="Poids actuel (kg)" value={currentWeightKg} onChangeText={setCurrentWeightKg} keyboardType="decimal-pad" inputMode="decimal" placeholder="5.2" />
            <Input label="Taille actuelle (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" inputMode="decimal" placeholder="57" />
            <Input label="Notes optionnelles" value={babyNotes} onChangeText={setBabyNotes} multiline placeholder="Rythme, preferences, observations..." />
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16, textAlign: 'center' }}>Langue</Text>
            <Segment value={language} onChange={(value) => setLanguage(value as AppLanguage)} options={languageOptions} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button label="Retour" onPress={() => setStep(0)} variant="ghost" />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Continuer" onPress={() => setStep(2)} />
              </View>
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ gap: 14 }}>
            <Input label="Objectif prises / jour" value={goalFeedingsPerDay} onChangeText={setGoalFeedingsPerDay} keyboardType="numeric" inputMode="numeric" />
            <Input label="Objectif sommeil / jour" value={goalSleepHoursPerDay} onChangeText={setGoalSleepHoursPerDay} keyboardType="numeric" inputMode="numeric" />
            <Input label="Objectif couches / jour" value={goalDiapersPerDay} onChangeText={setGoalDiapersPerDay} keyboardType="numeric" inputMode="numeric" />
            <Text style={{ color: colors.muted, lineHeight: 20, textAlign: 'center' }}>
              Vous pourrez modifier la langue, les effets visuels, les cartes du dashboard et les objectifs depuis Profil.
            </Text>
            <View style={{ gap: 10 }}>
              <Button label="Entrer dans l'app" onPress={handleFinish} />
              <Button label="Retour" onPress={() => setStep(1)} variant="ghost" />
            </View>
          </View>
        ) : null}
      </Card>
    </Page>
  );
}
