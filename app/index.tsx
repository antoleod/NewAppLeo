import { Redirect, router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Button, Card, Page } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLocale } from '@/context/LocaleContext';
import { useMemo } from 'react';

export default function IndexRoute() {
  const { loading, user, profile, guestMode, signInGuest } = useAuth();
  const { colors, gradients, themeVariant } = useTheme();
  const { language } = useLocale();

  const headline = useMemo(() => {
    if (themeVariant === 'rose') return "Bonjour, on s'occupe de la famille ensemble.";
    if (themeVariant === 'navy') return 'Bonjour, tout est pret pour suivre bebe.';
    if (themeVariant === 'sand') return 'Bonjour, votre espace famille vous attend.';
    return 'Bonjour, on veille sur bebe ensemble.';
  }, [themeVariant]);

  if (loading) {
    return (
      <Page scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' }}>Preparing App Leo</Text>
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
      <Card style={{ gap: 18, padding: 20 }}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase', textAlign: 'center' }}>
            App Leo
          </Text>
          <Text style={{ color: colors.text, fontSize: 30, fontWeight: '900', lineHeight: 36, textAlign: 'center' }}>{headline}</Text>
          <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' }}>
            Una experiencia familiar simple, visual y rapida para registrar tomas, sueno, medidas y momentos importantes.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {['Modo invitado', 'Datos locales', 'UI React Native', 'Sincronizacion futura'].map((item) => (
            <View
              key={item}
              style={{
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.backgroundAlt,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{item}</Text>
            </View>
          ))}
        </View>

        <Button
          label="Continuar"
          onPress={async () => {
            await signInGuest();
            router.replace('/home');
          }}
        />
        <Pressable onPress={() => router.push('/login')} style={{ alignItems: 'center', paddingVertical: 4 }}>
          <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13, textAlign: 'center' }}>Sign in</Text>
        </Pressable>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>
          {language === 'fr' ? "Le choix du theme se trouve dans l'onglet profil." : 'Theme controls live in the profile tab.'}
        </Text>
      </Card>
      <Card
        style={{
          backgroundColor: gradients.hero[0],
          borderColor: 'transparent',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'center' }}>Built for two parents, one shared view.</Text>
        <Text style={{ color: 'rgba(255,255,255,0.82)', marginTop: 8, lineHeight: 20, textAlign: 'center' }}>
          Track feeds, sleep, diapers, and milestones with a calmer visual language.
        </Text>
      </Card>
    </Page>
  );
}
