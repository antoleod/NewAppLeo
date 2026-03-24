import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Heading, Input, Page, Segment } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { profile, completeUserOnboarding, saveProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [caregiverName, setCaregiverName] = useState(profile?.caregiverName ?? '');
  const [babyName, setBabyName] = useState(profile?.babyName ?? 'Leo');
  const [babyBirthDate, setBabyBirthDate] = useState(profile?.babyBirthDate ?? '2025-10-21');
  const [goalFeedingsPerDay, setGoalFeedingsPerDay] = useState(String(profile?.goalFeedingsPerDay ?? 8));
  const [goalSleepHoursPerDay, setGoalSleepHoursPerDay] = useState(String(profile?.goalSleepHoursPerDay ?? 14));
  const [goalDiapersPerDay, setGoalDiapersPerDay] = useState(String(profile?.goalDiapersPerDay ?? 6));
  const [themeMode, setThemeMode] = useState(profile?.themeMode ?? 'system');

  useEffect(() => {
    if (!profile) return;
    setCaregiverName(profile.caregiverName);
    setBabyName(profile.babyName);
    setBabyBirthDate(profile.babyBirthDate);
    setGoalFeedingsPerDay(String(profile.goalFeedingsPerDay));
    setGoalSleepHoursPerDay(String(profile.goalSleepHoursPerDay));
    setGoalDiapersPerDay(String(profile.goalDiapersPerDay));
    setThemeMode(profile.themeMode);
  }, [profile]);

  async function handleFinish() {
    try {
      await completeUserOnboarding({
        caregiverName: caregiverName.trim(),
        babyName: babyName.trim() || 'Leo',
        babyBirthDate: babyBirthDate.trim(),
        goalFeedingsPerDay: Number(goalFeedingsPerDay) || 8,
        goalSleepHoursPerDay: Number(goalSleepHoursPerDay) || 14,
        goalDiapersPerDay: Number(goalDiapersPerDay) || 6,
      });
      await saveProfile({ themeMode });
      router.replace('/home');
    } catch (error: any) {
      Alert.alert('Could not finish setup', error?.message ?? 'Check the inputs and try again.');
    }
  }

  return (
    <Page>
      <Heading eyebrow="Setup" title="Finish your workspace" subtitle="This creates the product profile that powers the dashboard and insights." />
      <Card>
        {step === 0 ? (
          <>
            <Input label="Caregiver name" value={caregiverName} onChangeText={setCaregiverName} placeholder="Andrea" />
            <Input label="Baby name" value={babyName} onChangeText={setBabyName} placeholder="Leo" />
            <Input label="Baby birth date" value={babyBirthDate} onChangeText={setBabyBirthDate} placeholder="2025-10-21" />
            <Button label="Continue" onPress={() => setStep(1)} />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Input label="Goal feedings / day" value={goalFeedingsPerDay} onChangeText={setGoalFeedingsPerDay} keyboardType="numeric" inputMode="numeric" />
            <Input label="Goal sleep hours / day" value={goalSleepHoursPerDay} onChangeText={setGoalSleepHoursPerDay} keyboardType="numeric" inputMode="numeric" />
            <Input label="Goal diapers / day" value={goalDiapersPerDay} onChangeText={setGoalDiapersPerDay} keyboardType="numeric" inputMode="numeric" />
            <Button label="Back" onPress={() => setStep(0)} variant="ghost" />
            <Button label="Continue" onPress={() => setStep(2)} />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Theme mode</Text>
            <Segment
              value={themeMode}
              onChange={(value) => setThemeMode(value as any)}
              options={[
                { label: 'System', value: 'system' },
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
              ]}
            />
            <View style={{ gap: 10 }}>
              <Button label="Enter app" onPress={handleFinish} />
              <Button label="Back" onPress={() => setStep(1)} variant="ghost" />
            </View>
          </>
        ) : null}
      </Card>
    </Page>
  );
}
