import { Stack, Redirect, useSegments } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { View, ActivityIndicator, Text } from 'react-native';
import { Page } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';

export default function AppLayout() {
  const { loading, user, profile, guestMode, profileLoading } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const segments = useSegments();
  const onOnboardingRoute = segments.includes('onboarding');

  if (loading || profileLoading) {
    return (
      <Page scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{t('common.loading')}</Text>
        </View>
      </Page>
    );
  }

  if (!user && !guestMode) {
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
