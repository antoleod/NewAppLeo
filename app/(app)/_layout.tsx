import { Stack, Redirect, useSegments } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { View, ActivityIndicator, Text } from 'react-native';
import { Page } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';

export default function AppLayout() {
  const { loading, user, profile, guestMode } = useAuth();
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

  if (!user && !guestMode) {
    return <Redirect href="/login" />;
  }

  // Allow app access even if onboarding is incomplete.
  // Users can complete or edit onboarding later from Profile tab.
  // Only force onboarding if explicitly navigating there.

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="entry/[type]" options={{ presentation: 'modal', title: 'Entry' }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
    </Stack>
  );
}
