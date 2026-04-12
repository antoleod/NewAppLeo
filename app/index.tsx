import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Input, Page } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { AppLanguage } from '@/types';
import { getLocalPairingSession, joinPairingSession } from '@/services/pairingService';

type AuthView = 'landing' | 'login' | 'signup' | 'walkthrough';

const LANGS: Array<{ code: AppLanguage; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'nl', label: 'Nederlands' },
];

function languageLabel(language: AppLanguage) {
  return LANGS.find((item) => item.code === language)?.label ?? 'English';
}

export default function IndexRoute() {
  const { colors, gradients } = useTheme();
  const { language, setLanguage, t } = useLocale();
  const { loading, user, profile, guestMode, signInGuest, signInEmail, signInGoogle, register } = useAuth();
  const [view, setView] = useState<AuthView>('landing');
  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage>(language);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');

  useEffect(() => setSelectedLanguage(language), [language]);

  const canSubmitLogin = useMemo(() => email.trim().length > 4 && password.length >= 6, [email, password]);
  const canSubmitSignup = useMemo(() => displayName.trim().length >= 2 && username.trim().length >= 3 && email.trim().length > 4 && password.length >= 6 && pin.length >= 4, [displayName, username, email, password, pin]);

  if (loading) {
    return (
      <Page scroll={false}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.text }]}>{t('common.loading', 'Loading...')}</Text>
        </View>
      </Page>
    );
  }

  if (user || guestMode) {
    if (!profile?.hasCompletedOnboarding) return <Redirect href="/onboarding" />;
    return <Redirect href="/home" />;
  }

  async function commitLanguage(next: AppLanguage) {
    setSelectedLanguage(next);
    await setLanguage(next);
  }

  async function handleGuest() {
    setBusy(true);
    setErrorMessage('');
    try {
      await signInGuest();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      setErrorMessage(error?.message ?? t('auth.guest', 'Continue as guest'));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin() {
    if (!canSubmitLogin) return;
    setBusy(true);
    setErrorMessage('');
    try {
      await signInEmail({ email: email.trim(), password });
    } catch (error: any) {
      setErrorMessage(error?.message ?? t('auth.login_failed'));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup() {
    if (!canSubmitSignup) return;
    setBusy(true);
    setErrorMessage('');
    try {
      await register({ displayName: displayName.trim(), username: username.trim(), email: email.trim(), password, pin: pin.trim(), language: selectedLanguage } as any);
    } catch (error: any) {
      setErrorMessage(error?.message ?? t('auth.register_failed'));
    } finally {
      setBusy(false);
    }
  }

  async function handleTokenLogin() {
    setBusy(true);
    setErrorMessage('');
    try {
      const session = await getLocalPairingSession();
      if (session?.code === token.trim()) {
        await joinPairingSession(token.trim(), profile?.uid ?? 'guest');
        await signInGuest();
        router.replace('/home');
        return;
      }
      setErrorMessage('Invalid token');
    } catch (error: any) {
      setErrorMessage(error?.message ?? 'Invalid token');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page contentStyle={styles.pageContent}>
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: gradients.hero[0], opacity: 0.08 }]} />
      <ScrollView contentContainerStyle={styles.shell} showsVerticalScrollIndicator={false}>
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.brand, { color: colors.primary }]}>{t('app.name', 'App Leo')}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{view === 'walkthrough' ? t('language.select.title') : t('app.tagline')}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{view === 'walkthrough' ? t('language.select.subtitle') : t('auth.privacy')}</Text>
          <View style={styles.languageGrid}>
            {LANGS.map((item) => {
              const active = item.code === selectedLanguage;
              return (
                <Pressable
                  key={item.code}
                  onPress={() => void commitLanguage(item.code)}
                  style={[styles.languageCard, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : colors.backgroundAlt }]}
                >
                  <Text style={{ color: active ? colors.primary : colors.text, fontWeight: '900' }}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.actions}>
            <Button label={busy ? '...' : t('auth.guest')} onPress={() => void handleGuest()} />
            <Button label={t('auth.sign_in')} variant="secondary" onPress={() => setView('login')} />
            <Button label={t('auth.create_account')} variant="ghost" onPress={() => setView('signup')} />
          </View>
          <View style={styles.tokenPanel}>
            <Text style={[styles.tokenTitle, { color: colors.text }]}>Login with Token</Text>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, textAlign: 'center' }}>
              Use the pairing token from the other device to sync sessions.
            </Text>
            <Input label="Token" value={token} onChangeText={setToken} placeholder="123456" keyboardType="numeric" inputMode="numeric" />
            <Button label="Use token" onPress={() => void handleTokenLogin()} variant="secondary" />
          </View>
          {view !== 'landing' ? (
            <View style={{ gap: 10 }}>
              {view === 'signup' ? (
                <>
                  <Input label={t('auth.display_name')} value={displayName} onChangeText={setDisplayName} placeholder="Andrea" autoCapitalize="words" />
                  <Input label={t('auth.username')} value={username} onChangeText={setUsername} placeholder="andrea.leo" autoCapitalize="none" />
                </>
              ) : null}
              <Input label={t('auth.email')} value={email} onChangeText={setEmail} placeholder="name@email.com" autoCapitalize="none" keyboardType="email-address" />
              <Input label={t('auth.password')} value={password} onChangeText={setPassword} placeholder="******" secureTextEntry autoCapitalize="none" />
              {view === 'signup' ? <Input label={t('auth.pin')} value={pin} onChangeText={setPin} placeholder="1234" autoCapitalize="none" keyboardType="number-pad" /> : null}
              {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
              <Button label={view === 'login' ? t('auth.sign_in') : t('auth.create_account')} onPress={view === 'login' ? () => void handleLogin() : () => void handleSignup()} disabled={busy} />
              <Button label={t('common.back')} variant="ghost" onPress={() => setView('landing')} />
            </View>
          ) : null}
          <Pressable onPress={() => setView('walkthrough')} style={styles.walkthroughLink}>
            <Text style={{ color: colors.primary, fontWeight: '800' }}>{t('language.select.primary')}</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  pageContent: { flex: 1, width: '100%', maxWidth: 1100, alignSelf: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 15, fontWeight: '700' },
  shell: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 14 },
  card: { width: '100%', maxWidth: 520, borderRadius: 24, paddingVertical: 18, gap: 12 },
  brand: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', textAlign: 'center', fontWeight: '900' },
  title: { fontSize: 24, textAlign: 'center', fontWeight: '900' },
  subtitle: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  languageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  languageCard: { minWidth: 96, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  actions: { gap: 10 },
  walkthroughLink: { alignSelf: 'center', paddingVertical: 6 },
  error: { color: '#E74C3C', textAlign: 'center', fontWeight: '700' },
  tokenPanel: { gap: 8, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  tokenTitle: { fontSize: 14, fontWeight: '900', textAlign: 'center' },
});
