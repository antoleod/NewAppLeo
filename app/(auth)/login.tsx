import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Input, Page } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { AppLanguage } from '@/types';

const LANGS: Array<{ code: AppLanguage; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Francais' },
  { code: 'es', label: 'Espanol' },
  { code: 'nl', label: 'Nederlands' },
];

export default function LoginScreen() {
  const { colors } = useTheme();
  const { language, setLanguage, t } = useLocale();
  const { loading, user, profile, guestMode, signInGuest, signInEmail, signInEmailPin, signInGoogle, resetPassword } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;
  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage>(language);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');
  const [authSecret, setAuthSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => setSelectedLanguage(language), [language]);

  const isPinMode = /^\d{0,6}$/.test(authSecret) && authSecret.length > 0;
  const canSubmit = useMemo(() => email.trim().length > 4 && (isPinMode ? /^\d{6}$/.test(authSecret) : authSecret.length >= 6), [email, isPinMode, authSecret]);

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
    // Allow access to home/app even if onboarding is incomplete.
    // Profile shows pending state and allows completion from there.
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
    if (!canSubmit) return;
    setBusy(true);
    setErrorMessage('');
    try {
      if (isPinMode) {
        await signInEmailPin({ email: email.trim(), pin: authSecret });
      } else {
        await signInEmail({ email: email.trim(), password: authSecret });
      }
    } catch (error: any) {
      setErrorMessage(error?.message ?? t('auth.login_failed'));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    setErrorMessage('');
    try {
      await signInGoogle();
    } catch (error: any) {
      setErrorMessage(error?.message ?? 'Google sign-in is not available right now.');
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setErrorMessage('Enter your email first to recover access.');
      return;
    }
    setBusy(true);
    setErrorMessage('');
    try {
      await resetPassword(email.trim());
      Alert.alert('Recovery request received', 'If this email is registered, a recovery email has been sent.');
    } catch (error: any) {
      setErrorMessage(error?.message ?? 'Could not send the recovery email.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#0A1A15', '#122A20', '#0A1A15']} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={styles.gradient}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <ScrollView contentContainerStyle={[styles.shell, isDesktop && styles.shellDesktop]} showsVerticalScrollIndicator={false}>
            <View style={[styles.authShell, isDesktop ? styles.authShellDesktop : isTablet ? styles.authShellTablet : null]}>
              <View style={[styles.hero, isDesktop ? styles.heroDesktop : isTablet ? styles.heroTablet : null]}>
                <Text style={[styles.heroTitle, isDesktop && styles.heroTitleDesktop]}>{t('app.tagline')}</Text>
                <Text style={[styles.heroSubtitle, isDesktop && styles.heroSubtitleDesktop]}>{t('auth.privacy', 'Guest mode stays on-device and uses local storage only.')}</Text>
              </View>

              <View style={[styles.sheet, isDesktop ? styles.sheetDesktop : isTablet ? styles.sheetTablet : null]}>
                <Text style={styles.brand}>APP LEO</Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.languageRail}>
                  {LANGS.map((item) => {
                    const active = item.code === selectedLanguage;
                    return (
                      <Pressable key={item.code} onPress={() => void commitLanguage(item.code)} style={[styles.languageCard, active ? styles.languageCardActive : styles.languageCardIdle]}>
                        <Text style={[styles.languageText, active ? styles.languageTextActive : styles.languageTextIdle]}>{item.label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Input label={t('auth.email')} value={email} onChangeText={setEmail} placeholder="name@email.com" autoCapitalize="none" keyboardType="email-address" />

                <Input
                  label="Password or 6-digit PIN"
                  value={authSecret}
                  onChangeText={setAuthSecret}
                  placeholder="Enter your password or 123456"
                  secureTextEntry={!showSecret}
                  autoCapitalize="none"
                  keyboardType={isPinMode ? 'number-pad' : 'default'}
                  inputMode={isPinMode ? 'numeric' : 'text'}
                  error={authSecret.length > 0 && isPinMode && !/^\d{6}$/.test(authSecret) ? 'PIN must be exactly 6 digits.' : undefined}
                  rightAccessory={
                    <Pressable onPress={() => setShowSecret((value) => !value)} hitSlop={8}>
                      <Ionicons name={showSecret ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(212,231,222,0.72)" />
                    </Pressable>
                  }
                />

                {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

                <View style={styles.actions}>
                  <Button label={t('auth.sign_in')} onPress={() => void handleLogin()} style={styles.actionButton} size="sm" disabled={busy || !canSubmit} />
                  <Button label="Continue with Google" onPress={() => void handleGoogle()} variant="ghost" style={styles.actionButton} size="sm" disabled={busy} />
                  <Button label={t('auth.create_account')} variant="ghost" onPress={() => router.push('/register')} style={styles.createButton} size="sm" />
                </View>

                <View style={styles.utilityRow}>
                  <Pressable onPress={() => void handleForgotPassword()} style={styles.utilityAction} disabled={busy}>
                    <Ionicons name="help-circle-outline" size={15} color="rgba(212,231,222,0.72)" />
                    <Text style={styles.utilityText}>Forgot password?</Text>
                  </Pressable>
                  <Pressable onPress={() => void handleGuest()} style={styles.utilityAction} disabled={busy}>
                    <Ionicons name="person-outline" size={15} color="rgba(212,231,222,0.72)" />
                    <Text style={styles.utilityText}>{t('auth.guest')}</Text>
                  </Pressable>
                </View>

                <Pressable onPress={() => router.push('/pair')} style={styles.pairCard}>
                  <View style={styles.pairIconWrap}>
                    <Ionicons name="people-outline" size={18} color="#F1BD7E" />
                  </View>
                  <View style={styles.pairTextBlock}>
                    <Text style={styles.pairTitle}>{t('auth.pair', 'Pair device')}</Text>
                    <Text style={styles.pairHintText}>{t('pair.subtitle', 'Use a code to sync baby data and session between devices.')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.35)" />
                </Pressable>
              </View>
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
  loadingText: { fontSize: 19, fontWeight: '700' },
  shell: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 20 },
  shellDesktop: { paddingVertical: 28 },
  authShell: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 10 },
  authShellTablet: { maxWidth: 520 },
  authShellDesktop: { maxWidth: 460, gap: 8 },
  hero: { minHeight: 112, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 4, gap: 8 },
  heroTablet: { minHeight: 100, gap: 6 },
  heroDesktop: { minHeight: 90, gap: 6 },
  heroTitle: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', letterSpacing: -0.6, textAlign: 'center', lineHeight: 34, maxWidth: 420 },
  heroTitleDesktop: { fontSize: 25, lineHeight: 30, maxWidth: 400 },
  heroSubtitle: { color: 'rgba(212,231,222,0.72)', fontSize: 13, lineHeight: 18, textAlign: 'center', maxWidth: 360 },
  heroSubtitleDesktop: { fontSize: 12, lineHeight: 17 },
  sheet: {
    backgroundColor: 'rgba(15, 35, 25, 0.92)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 20,
  },
  sheetTablet: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18 },
  sheetDesktop: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16, gap: 8 },
  brand: { fontSize: 14, letterSpacing: 4, textTransform: 'uppercase', textAlign: 'center', fontWeight: '900', color: 'rgba(241,189,126,0.92)' },
  languageRail: { gap: 8, paddingTop: 2, paddingBottom: 2, paddingRight: 6 },
  languageCard: { minWidth: 96, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  languageCardActive: { borderColor: 'rgba(192, 237, 204, 0.35)', backgroundColor: 'rgba(62, 103, 77, 0.28)' },
  languageCardIdle: { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' },
  languageText: { fontSize: 13, fontWeight: '700' },
  languageTextActive: { color: '#C0EDCC' },
  languageTextIdle: { color: 'rgba(255,255,255,0.65)' },
  actions: { gap: 8, paddingTop: 2 },
  actionButton: { minHeight: 46 },
  createButton: { borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'transparent', minHeight: 42 },
  utilityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: -2 },
  utilityAction: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  utilityText: { color: 'rgba(212,231,222,0.72)', fontSize: 12, fontWeight: '700' },
  pairCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginTop: 2 },
  pairIconWrap: { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(192,237,204,0.08)' },
  pairTextBlock: { flex: 1, gap: 2 },
  pairTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  pairHintText: { fontSize: 13, lineHeight: 18, color: 'rgba(212,231,222,0.58)' },
  error: { color: '#E74C3C', textAlign: 'center', fontWeight: '700', fontSize: 12 },
});
