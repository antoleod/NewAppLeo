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
import { getLocalPairingSession } from '@/services/pairingService';

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

  return (
    <Page contentStyle={styles.pageContent}>
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: gradients.hero[0], opacity: 0.08 }]} />
      <View pointerEvents="none" style={styles.haloTop} />
      <View pointerEvents="none" style={styles.haloBottom} />
      <ScrollView contentContainerStyle={styles.shell} showsVerticalScrollIndicator={false}>
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.heroCopy}>
            <Text style={[styles.brand, { color: colors.primary }]}>{t('app.name', 'App Leo')}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{view === 'walkthrough' ? t('language.select.title') : t('app.tagline')}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{view === 'walkthrough' ? t('language.select.subtitle') : t('auth.privacy')}</Text>
          </View>
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
            <Button
              label={t('auth.pair', 'Pair device')}
              variant="ghost"
              onPress={() => router.push('/pair')}
              style={{ borderStyle: 'dashed' }}
            />
          </View>
          <View style={styles.pairHint}>
            <Ionicons name="people-outline" size={16} color={colors.primary} />
            <Text style={[styles.pairHintText, { color: colors.muted }]}>{t('pair.subtitle', 'Use a code to sync baby data and session between devices.')}</Text>
          </View>
          {view !== 'landing' ? (
            <View style={styles.formBlock}>
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
            <Text style={[styles.walkthroughText, { color: colors.primary }]}>{t('language.select.primary')}</Text>
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
  card: { width: '100%', maxWidth: 540, borderRadius: 28, paddingVertical: 22, paddingHorizontal: 16, gap: 14, borderWidth: 1 },
  heroCopy: { gap: 8, alignItems: 'center', paddingHorizontal: 10 },
  brand: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', textAlign: 'center', fontWeight: '900' },
  title: { fontSize: 28, textAlign: 'center', fontWeight: '900', lineHeight: 32 },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 420 },
  languageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', paddingTop: 4 },
  languageCard: { minWidth: 100, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, alignItems: 'center' },
  actions: { gap: 10, paddingTop: 4 },
  pairHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 2 },
  pairHintText: { fontSize: 12, lineHeight: 17, textAlign: 'center', maxWidth: 360 },
  formBlock: { gap: 10, paddingTop: 4 },
  walkthroughLink: { alignSelf: 'center', paddingVertical: 8 },
  walkthroughText: { fontWeight: '800', letterSpacing: 0.2 },
  error: { color: '#E74C3C', textAlign: 'center', fontWeight: '700' },
  tokenPanel: { gap: 8, padding: 14, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' },
  haloTop: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(201,162,39,0.14)',
    filter: 'blur(12px)' as any,
  },
  haloBottom: {
    position: 'absolute',
    bottom: -120,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(63,185,80,0.12)',
    filter: 'blur(16px)' as any,
  },
});
