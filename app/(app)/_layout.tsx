import { Stack, Redirect, useSegments } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { View, ActivityIndicator, Text } from 'react-native';
import { Page } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';

export default function AppLayout() {
  const { loading, user, profile } = useAuth();
  const { colors } = useTheme();
  const segments = useSegments();
  const onOnboardingRoute = segments.includes('onboarding');

  if (loading) {
    return (
      <Page scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Loading App Leo</Text>
        </View>
      </Page>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (!profile?.hasCompletedOnboarding && !onOnboardingRoute) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="entry/[type]" options={{ presentation: 'modal', title: 'Entry' }} />
    </Stack>
  );
}
