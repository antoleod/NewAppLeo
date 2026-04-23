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
import { useResponsiveLayout } from '@/lib/responsiveLayout';
import { ResponsiveHeroSection, ResponsiveFormGroup, ResponsiveContentWrapper } from '@/components/ResponsiveLayout';
import { AppLanguage } from '@/types';
import { typography } from '@/typography';

const LANGS: Array<{ code: AppLanguage; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Francais' },
  { code: 'es', label: 'Espanol' },
  { code: 'nl', label: 'Nederlands' },
];

export default function LoginScreen() {
  const { colors, theme } = useTheme();
  const { language, setLanguage, t } = useLocale();
  const { loading, user, profile, guestMode, signInGuest, signInEmail, signInEmailPin, signInGoogle, resetPassword } = useAuth();
  const layout = useResponsiveLayout();
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#0A1A15', '#122A20', '#0A1A15']} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={styles.gradient}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <ResponsiveContentWrapper maxWidth="form" spacing="normal">
              {/* Hero Section - Compact on mobile */}
              <ResponsiveHeroSection
                title={t('app.tagline')}
                subtitle={t('auth.privacy', 'Guest mode stays on-device and uses local storage only.')}
              />

              {/* Brand */}
              <Text style={[styles.brand, { fontSize: layout.textXl, color: theme.accent }]}>APP LEO</Text>

              {/* Language Selector */}
              <View style={{ gap: layout.gapSm }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: layout.gapSm, paddingHorizontal: 0 }}>
                  {LANGS.map((item) => {
                    const active = item.code === selectedLanguage;
                    return (
                      <Pressable
                        key={item.code}
                        onPress={() => void commitLanguage(item.code)}
                        style={[
                          styles.languageButton,
                          {
                            minHeight: layout.minTouchTarget,
                            paddingHorizontal: layout.gapMd,
                            borderRadius: layout.buttonBorderRadius,
                            backgroundColor: active ? theme.accent : theme.pillBg,
                            borderColor: active ? theme.accent : theme.border,
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            typography.body,
                            {
                              fontSize: layout.textSm,
                              fontWeight: '700',
                              color: active ? theme.accentText : theme.textPrimary,
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Form Fields */}
              <ResponsiveFormGroup>
                <Input
                  label={t('auth.email')}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@email.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

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
                      <Ionicons name={showSecret ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textMuted} />
                    </Pressable>
                  }
                />
              </ResponsiveFormGroup>

              {/* Error Message */}
              {errorMessage ? (
                <Text style={[typography.body, { color: theme.red, textAlign: 'center', fontSize: layout.textSm }]}>
                  {errorMessage}
                </Text>
              ) : null}

              {/* Primary Actions */}
              <ResponsiveFormGroup>
                <Button label={t('auth.sign_in')} onPress={() => void handleLogin()} disabled={busy || !canSubmit} loading={busy} />
                <Button label="Continue with Google" onPress={() => void handleGoogle()} variant="ghost" disabled={busy} />
                <Button label={t('auth.create_account')} variant="ghost" onPress={() => router.push('/register')} disabled={busy} />
              </ResponsiveFormGroup>

              {/* Utility Actions */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: layout.gapMd }}>
                <Pressable onPress={() => void handleForgotPassword()} disabled={busy} style={{ flex: 1, minHeight: layout.smallTouchTarget, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: layout.gapSm }}>
                    <Ionicons name="help-circle-outline" size={14} color={theme.textMuted} />
                    <Text style={[typography.body, { fontSize: layout.textXs, color: theme.textMuted, fontWeight: '700' }]}>
                      Forgot password?
                    </Text>
                  </View>
                </Pressable>

                <View style={{ width: 1, backgroundColor: theme.border }} />

                <Pressable onPress={() => void handleGuest()} disabled={busy} style={{ flex: 1, minHeight: layout.smallTouchTarget, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: layout.gapSm }}>
                    <Ionicons name="person-outline" size={14} color={theme.textMuted} />
                    <Text style={[typography.body, { fontSize: layout.textXs, color: theme.textMuted, fontWeight: '700' }]}>
                      {t('auth.guest')}
                    </Text>
                  </View>
                </Pressable>
              </View>

              {/* Pair Device Card */}
              <Pressable
                onPress={() => router.push('/pair')}
                style={[
                  styles.pairCard,
                  {
                    borderRadius: layout.cardBorderRadius,
                    padding: layout.gapMd,
                    borderColor: theme.border,
                    backgroundColor: theme.bgCardAlt,
                    gap: layout.gapMd,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: layout.gapMd, flex: 1 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${theme.accent}22`,
                    }}
                  >
                    <Ionicons name="people-outline" size={16} color={theme.accent} />
                  </View>
                  <View style={{ flex: 1, gap: layout.gapXs }}>
                    <Text style={[typography.sectionTitle, { fontSize: layout.textBase, color: theme.textPrimary }]}>
                      {t('auth.pair', 'Pair device')}
                    </Text>
                    <Text style={[typography.body, { fontSize: layout.textXs, color: theme.textMuted, lineHeight: layout.textXs * 1.4 }]}>
                      {t('pair.subtitle', 'Use a code to sync baby data and session between devices.')}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
              </Pressable>
            </ResponsiveContentWrapper>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  gradient: { flex: 1 },
  keyboard: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 16, fontWeight: '600' },
  brand: { letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center', fontWeight: '900' },
  languageButton: { minWidth: 90, alignItems: 'center', justifyContent: 'center' },
  pairCard: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
});
