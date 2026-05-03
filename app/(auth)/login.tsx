import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Input, Page } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { AppLanguage } from '@/types';
import { BabyFlowGoogleGlyph, BabyFlowIcon } from '@/components/BabyFlowIcon';

const LANGS: Array<{ code: AppLanguage; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Francais' },
  { code: 'es', label: 'Espanol' },
  { code: 'nl', label: 'Nederlands' },
];

export default function LoginScreen() {
  const { language, setLanguage, t } = useLocale();
  const { loading, user, guestMode, signInGuest, signInEmail, signInGoogle } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage>(language);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = useMemo(() => {
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    return validEmail && password.length >= 6;
  }, [email, password]);

  if (loading) {
    return (
      <Page scroll={false}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8FD7C0" />
          <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
        </View>
      </Page>
    );
  }

  if (user || guestMode) return <Redirect href="/home" />;

  async function commitLanguage(next: AppLanguage) {
    setSelectedLanguage(next);
    await setLanguage(next);
  }

  async function handleLogin() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setErrorMessage('');
    try {
      await signInEmail({ email: email.trim(), password });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      setErrorMessage(error?.message ?? t('auth.login_failed', 'Login failed'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
      setErrorMessage(error?.message ?? t('auth.google_unavailable', 'Google sign-in is not available right now.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleGuest() {
    setBusy(true);
    setErrorMessage('');
    try {
      await signInGuest();
    } catch (error: any) {
      setErrorMessage(error?.message ?? t('auth.guest', 'Continue as guest'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page scroll={false} contentStyle={styles.page}>
      <LinearGradient colors={['#07111F', '#0B1630', '#101C39']} style={StyleSheet.absoluteFill} />
      <View style={styles.card}>
        <View style={styles.brandRow}>
          <BabyFlowIcon name="hydration" active />
          <View>
            <Text style={styles.brand}>BabyFlow</Text>
            <Text style={styles.brandSub}>Because every moment flows into a memory.</Text>
          </View>
        </View>

        <Input
          label={t('auth.email', 'Email')}
          value={email}
          onChangeText={setEmail}
          placeholder={t('auth.email_placeholder', 'name@email.com')}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        <Input
          label={t('auth.password', 'Password')}
          value={password}
          onChangeText={setPassword}
          placeholder={t('auth.password_placeholder', 'Enter password')}
          secureTextEntry
          autoCapitalize="none"
          textContentType="password"
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Button label={t('auth.sign_in', 'Sign in')} onPress={() => void handleLogin()} disabled={!canSubmit || busy} loading={busy} />

        <Pressable onPress={() => void handleGoogle()} disabled={busy} style={styles.googleButton}>
          <BabyFlowGoogleGlyph />
          <Text style={styles.googleText}>{t('auth.continue_google', 'Continue with Google')}</Text>
        </Pressable>

        <Pressable onPress={() => void handleGuest()} disabled={busy}>
          <Text style={styles.linkText}>{t('auth.guest', 'Continue as guest')}</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/register')} disabled={busy}>
          <Text style={styles.linkText}>{t('auth.create_account', 'Create account')}</Text>
        </Pressable>

        <View style={styles.languageSelector}>
          {LANGS.map((item) => {
            const active = item.code === selectedLanguage;
            return (
              <Pressable key={item.code} onPress={() => void commitLanguage(item.code)} style={[styles.languageButton, active && styles.languageButtonActive]}>
                <Text style={styles.languageButtonText}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#E8F8F3' },
  card: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(9,16,28,0.6)',
    padding: 20,
    gap: 12,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  brand: { color: '#ECF2F7', fontSize: 24, fontWeight: '800' },
  brandSub: { color: 'rgba(236,242,247,0.62)', fontSize: 12 },
  errorText: { color: '#F0959C', textAlign: 'center', fontSize: 13 },
  googleButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  googleText: { color: '#F6FAFC', fontSize: 15, fontWeight: '700' },
  linkText: { color: '#9FCFC6', textAlign: 'center', fontWeight: '600' },
  languageSelector: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  languageButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  languageButtonActive: { backgroundColor: 'rgba(145,215,192,0.18)', borderColor: 'rgba(145,215,192,0.48)' },
  languageButtonText: { color: '#E8F8F3', fontSize: 12, fontWeight: '600' },
});
