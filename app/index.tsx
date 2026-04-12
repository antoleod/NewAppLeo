import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Input, Page } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { AppLanguage } from '@/types';

type AuthView = 'landing' | 'login' | 'signup' | 'walkthrough';

const LANGS: Array<{ code: AppLanguage; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Francais' },
  { code: 'es', label: 'Espanol' },
  { code: 'nl', label: 'Nederlands' },
];

export default function IndexRoute() {
  const { colors } = useTheme();
  const { language, setLanguage, t } = useLocale();
  const { loading, user, profile, guestMode, signInGuest, signInEmail, register } = useAuth();
  const [view, setView] = useState<AuthView>('landing');
  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage>(language);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');

  useEffect(() => setSelectedLanguage(language), [language]);

  const canSubmitLogin = useMemo(() => email.trim().length > 4 && password.length >= 6, [email, password]);
  const canSubmitSignup = useMemo(
    () =>
      displayName.trim().length >= 2 &&
      username.trim().length >= 3 &&
      email.trim().length > 4 &&
      password.length >= 6 &&
      pin.length >= 4,
    [displayName, username, email, password, pin],
  );

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
      await register({
        displayName: displayName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        pin: pin.trim(),
        language: selectedLanguage,
      } as any);
    } catch (error: any) {
      setErrorMessage(error?.message ?? t('auth.register_failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#0A1A15', '#122A20', '#0A1A15']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={styles.gradient}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <ScrollView contentContainerStyle={styles.shell} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>AL</Text>
              </View>
              <Text style={styles.heroTitle}>{view === 'walkthrough' ? t('language.select.title') : t('app.tagline')}</Text>
              <Text style={styles.heroSubtitle}>
                {view === 'walkthrough'
                  ? t('language.select.subtitle')
                  : t('auth.privacy', 'Guest mode stays on-device and uses local storage only.')}
              </Text>
              <View style={styles.heroMoonGlowOuter}>
                <View style={styles.heroMoonGlowInner}>
                  <Text style={styles.heroMoon}>🌙</Text>
                </View>
              </View>
              <View style={styles.heroPillsRow}>
                <View style={styles.heroPill}>
                  <Text style={styles.heroPillText}>🍼 Feeding</Text>
                </View>
                <View style={styles.heroPill}>
                  <Text style={styles.heroPillText}>😴 Sleep</Text>
                </View>
                <View style={styles.heroPill}>
                  <Text style={styles.heroPillText}>📏 Growth</Text>
                </View>
              </View>
            </View>

            <View style={styles.sheet}>
              <Text style={styles.brand}>APP LEO</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.languageRail}>
                {LANGS.map((item) => {
                  const active = item.code === selectedLanguage;
                  return (
                    <Pressable
                      key={item.code}
                      onPress={() => void commitLanguage(item.code)}
                      style={[
                        styles.languageCard,
                        active ? styles.languageCardActive : styles.languageCardIdle,
                      ]}
                    >
                      <Text style={[styles.languageText, active ? styles.languageTextActive : styles.languageTextIdle]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.actions}>
                <Button label={busy ? '...' : t('auth.guest')} onPress={() => void handleGuest()} style={styles.actionButton} />
                <Button label={t('auth.sign_in')} variant="secondary" onPress={() => setView('login')} style={styles.actionButton} />
                <Button label={t('auth.create_account')} variant="ghost" onPress={() => setView('signup')} style={styles.createButton} />
              </View>

              <View style={styles.divider} />

              <Pressable onPress={() => router.push('/pair')} style={styles.pairCard}>
                <View style={styles.pairIconWrap}>
                  <Ionicons name="people-outline" size={18} color="#F1BD7E" />
                </View>
                <View style={styles.pairTextBlock}>
                  <Text style={styles.pairTitle}>{t('auth.pair', 'Pair device')}</Text>
                  <Text style={styles.pairHintText}>
                    {t('pair.subtitle', 'Use a code to sync baby data and session between devices.')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.35)" />
              </Pressable>

              <View style={styles.pairHint}>
                <Text style={styles.continueLabel}>Continue</Text>
              </View>

              {view !== 'landing' ? (
                <View style={styles.formBlock}>
                  {view === 'signup' ? (
                    <>
                      <Input
                        label={t('auth.display_name')}
                        value={displayName}
                        onChangeText={setDisplayName}
                        placeholder="Andrea"
                        autoCapitalize="words"
                      />
                      <Input
                        label={t('auth.username')}
                        value={username}
                        onChangeText={setUsername}
                        placeholder="andrea.leo"
                        autoCapitalize="none"
                      />
                    </>
                  ) : null}
                  <Input
                    label={t('auth.email')}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="name@email.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <Input
                    label={t('auth.password')}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="******"
                    secureTextEntry
                    autoCapitalize="none"
                  />
                  {view === 'signup' ? (
                    <Input
                      label={t('auth.pin')}
                      value={pin}
                      onChangeText={setPin}
                      placeholder="1234"
                      autoCapitalize="none"
                      keyboardType="number-pad"
                    />
                  ) : null}
                  {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
                  <Button
                    label={view === 'login' ? t('auth.sign_in') : t('auth.create_account')}
                    onPress={view === 'login' ? () => void handleLogin() : () => void handleSignup()}
                    disabled={busy}
                  />
                  <Button label={t('common.back')} variant="ghost" onPress={() => setView('landing')} />
                </View>
              ) : null}

              <Pressable onPress={() => setView('walkthrough')} style={styles.walkthroughLink}>
                <Text style={styles.walkthroughText}>{t('language.select.primary')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A1A15' },
  gradient: { flex: 1 },
  keyboard: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 15, fontWeight: '700' },
  shell: { flexGrow: 1, justifyContent: 'space-between' },
  hero: {
    minHeight: 340,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 12,
  },
  heroMoonGlowOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(74,140,101,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: 14,
  },
  heroMoonGlowInner: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(74,140,101,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMoon: { fontSize: 68, lineHeight: 74 },
  heroBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: 'rgba(5, 36, 22, 0.46)',
    borderWidth: 1,
    borderColor: 'rgba(192,237,204,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeText: { color: '#F1BD7E', fontSize: 24, fontWeight: '800', letterSpacing: 1 },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 46,
    fontWeight: '900',
    letterSpacing: -0.6,
    textAlign: 'center',
    lineHeight: 50,
    maxWidth: 480,
  },
  heroSubtitle: {
    color: 'rgba(212,231,222,0.72)',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 360,
    marginBottom: 18,
  },
  heroPillsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  heroPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(168,213,181,0.15)',
  },
  heroPillText: {
    color: 'rgba(168,213,181,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  sheet: {
    backgroundColor: 'rgba(15, 35, 25, 0.92)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 26,
    paddingTop: 30,
    paddingBottom: 44,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  brand: {
    fontSize: 12,
    letterSpacing: 4,
    textTransform: 'uppercase',
    textAlign: 'center',
    fontWeight: '900',
    color: 'rgba(241,189,126,0.92)',
  },
  languageRail: { gap: 12, paddingTop: 8, paddingBottom: 6, paddingRight: 10 },
  languageCard: {
    minWidth: 124,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
  },
  languageCardActive: {
    borderColor: 'rgba(192, 237, 204, 0.35)',
    backgroundColor: 'rgba(62, 103, 77, 0.28)',
  },
  languageCardIdle: {
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  languageText: { fontSize: 14, fontWeight: '700' },
  languageTextActive: { color: '#C0EDCC' },
  languageTextIdle: { color: 'rgba(255,255,255,0.65)' },
  actions: { gap: 12, paddingTop: 10 },
  actionButton: { minHeight: 56 },
  createButton: { borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'transparent' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 10 },
  pairCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  pairIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(192,237,204,0.08)',
  },
  pairTextBlock: { flex: 1, gap: 2 },
  pairTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  pairHintText: { fontSize: 13, lineHeight: 18, color: 'rgba(212,231,222,0.58)' },
  pairHint: { alignItems: 'center', justifyContent: 'center', paddingTop: 6 },
  continueLabel: { color: 'rgba(168,213,181,0.7)', fontWeight: '800', letterSpacing: 0.4, fontSize: 14 },
  formBlock: { gap: 10, paddingTop: 8 },
  walkthroughLink: { alignSelf: 'center', paddingVertical: 8 },
  walkthroughText: { color: 'rgba(241,189,126,0.9)', fontWeight: '800', letterSpacing: 0.2 },
  error: { color: '#E74C3C', textAlign: 'center', fontWeight: '700' },
});
