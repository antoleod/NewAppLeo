import { Redirect, router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Button, Card, Page } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { type ThemeVariant } from '@/lib/storage';
import { useMemo } from 'react';

const THEMES: Array<{
  key: ThemeVariant;
  title: string;
  subtitle: string;
  accent: string;
}> = [
  { key: 'sage', title: 'Sage', subtitle: 'Balanced and calm', accent: '#4d7c6b' },
  { key: 'rose', title: 'Rose', subtitle: 'Warm and caring', accent: '#b95b74' },
  { key: 'navy', title: 'Navy', subtitle: 'Confident and clear', accent: '#1d4e89' },
  { key: 'sand', title: 'Sand', subtitle: 'Soft and editorial', accent: '#8c6b3f' },
];

export default function IndexRoute() {
  const { loading, user, profile, guestMode, signInGuest } = useAuth();
  const { colors, gradients, themeVariant, setThemeVariant } = useTheme();

  const headline = useMemo(() => {
    if (themeVariant === 'rose') return 'A calm dashboard for the people doing the work.';
    if (themeVariant === 'navy') return 'Clear tracking for both parents, day and night.';
    if (themeVariant === 'sand') return 'A warm, professional workspace for family care.';
    return 'A clean, neutral space for baby tracking.';
  }, [themeVariant]);

  if (loading) {
    return (
      <Page scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Preparing App Leo</Text>
        </View>
      </Page>
    );
  }

  if (user || guestMode) {
    if (!profile?.hasCompletedOnboarding) return <Redirect href="/onboarding" />;
    return <Redirect href="/home" />;
  }

  return (
    <Page>
      <Card>
        <View style={{ gap: 14 }}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            App Leo
          </Text>
          <Text style={{ color: colors.text, fontSize: 30, fontWeight: '900', lineHeight: 36 }}>{headline}</Text>
          <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
            Choose a professional look first, then continue as a guest or sign in with your account.
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {THEMES.map((theme) => {
            const selected = themeVariant === theme.key;
            return (
              <Pressable
                key={theme.key}
                onPress={async () => {
                  await setThemeVariant(theme.key);
                }}
                style={{
                  flexBasis: '48%',
                  minWidth: 140,
                  padding: 16,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: selected ? theme.accent : colors.border,
                  backgroundColor: selected ? colors.backgroundAlt : colors.surface,
                  gap: 8,
                }}
              >
                <View style={{ width: 32, height: 32, borderRadius: 999, backgroundColor: theme.accent }} />
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '900' }}>{theme.title}</Text>
                <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>{theme.subtitle}</Text>
              </Pressable>
            );
          })}
        </View>
        <Button label="Continue as guest" onPress={async () => { await signInGuest(); router.replace('/home'); }} variant="secondary" />
        <Button label="Sign in" onPress={() => router.push('/login')} />
        <Pressable onPress={() => router.push('/register')}>
          <Text style={{ color: colors.primary, fontWeight: '800', textAlign: 'center' }}>Create account</Text>
        </Pressable>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
          Guest mode stays local. Account mode adds cloud sync and partner pairing.
        </Text>
      </Card>
      <Card style={{ backgroundColor: gradients.hero[0] }}>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>Built for two parents, one shared view.</Text>
        <Text style={{ color: 'rgba(255,255,255,0.82)', marginTop: 8, lineHeight: 20 }}>
          Track feeds, sleep, diapers, and milestones with a calmer visual language.
        </Text>
      </Card>
    </Page>
  );
}
