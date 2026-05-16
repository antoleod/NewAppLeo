import { useEffect, useRef, useState } from 'react';
import { Stack, Redirect, useSegments } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { View, ActivityIndicator, Text, Platform, Pressable } from 'react-native';
import { Page } from '@/components/shared';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppData } from '@/context/AppDataContext';

export default function AppLayout() {
  const { loading, user, profile, guestMode, profileLoading, retryProfile } = useAuth();
  const { forceReconnect } = useAppData();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const segments = useSegments();
  const onOnboardingRoute = segments.includes('onboarding');

  const handleRetry = () => {
    retryProfile();
    forceReconnect();
    if (Platform.OS === 'web') {
      (globalThis as any).location?.reload?.();
    }
  };

  // After 10 s of unresolved loading, show a recovery screen instead of
  // spinning forever. The 8 s timeouts in AuthContext and AppDataContext mean
  // this fires only when something truly unexpected goes wrong.
  const [loadingTooLong, setLoadingTooLong] = useState(false);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Block only on auth resolution. Profile loading blocks only when we have
  // no cached profile at all (rare on returning sessions).
  const isBlocking = loading || (profileLoading && !profile && !guestMode);

  useEffect(() => {
    if (!isBlocking) {
      setLoadingTooLong(false);
      if (loadingTimerRef.current) { clearTimeout(loadingTimerRef.current); loadingTimerRef.current = null; }
      return;
    }
    loadingTimerRef.current = setTimeout(() => setLoadingTooLong(true), 10000);
    return () => {
      if (loadingTimerRef.current) { clearTimeout(loadingTimerRef.current); loadingTimerRef.current = null; }
    };
  }, [isBlocking]);

  if (isBlocking) {
    if (loadingTooLong) {
      return (
        <Page scroll={false}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 44 }}>{'⏳'}</Text>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' }}>
              {t('errors.loadingTimeout')}
            </Text>
            <Text style={{ color: colors.muted ?? colors.text, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              {t('errors.loadingTimeoutMessage')}
            </Text>
            <Pressable
              onPress={handleRetry}
              style={({ pressed }) => ({
                marginTop: 8,
                paddingHorizontal: 28,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: colors.primary,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                {t('errors.retryConnection')}
              </Text>
            </Pressable>
          </View>
        </Page>
      );
    }

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
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="entry/[type]" options={{ presentation: 'modal', title: 'Entry' }} />
      </Stack>
    </View>
  );
}
