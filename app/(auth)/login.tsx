import { Redirect, router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Page } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { AppLanguage } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const APP_ICON = require('../../assets/branding/app-icon/babyflow-app-icon-512.png');

const LANGS: Array<{ code: AppLanguage; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Francais' },
  { code: 'es', label: 'Espanol' },
  { code: 'nl', label: 'Nederlands' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── LoginInput ───────────────────────────────────────────────────────────────

interface LoginInputProps extends TextInputProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  error?: string;
  rightElement?: React.ReactNode;
}

function LoginInput({ icon, label, error, rightElement, style, ...rest }: LoginInputProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const borderColor = error
    ? 'rgba(240,100,110,0.80)'
    : focused
    ? 'rgba(100,210,175,0.70)'
    : 'rgba(255,255,255,0.14)';

  const bgColor = focused ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)';

  return (
    <View style={styles.field} accessibilityLabel={label}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={[styles.inputRow, { borderColor, backgroundColor: bgColor }]}
      >
        <View style={styles.inputIconWrap}>
          <Ionicons
            name={icon}
            size={18}
            color={focused ? '#64D2AF' : 'rgba(255,255,255,0.40)'}
          />
        </View>
        <TextInput
          ref={inputRef}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor="rgba(255,255,255,0.30)"
          style={[styles.inputText, style]}
          accessibilityLabel={label}
        />
        {rightElement}
      </Pressable>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color="#F0646E" />
          <Text style={styles.fieldError}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { language, setLanguage, t } = useLocale();
  const { loading, user, guestMode, signInGuest, signInEmail, signInGoogle } = useAuth();

  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage>(language);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const emailError = emailTouched && email.length > 0 && !EMAIL_RE.test(email.trim())
    ? t('auth.email_invalid', 'Invalid email address')
    : undefined;

  const passwordError = passwordTouched && password.length > 0 && password.length < 6
    ? t('auth.password_short', 'At least 6 characters required')
    : undefined;

  const canSubmit = useMemo(
    () => EMAIL_RE.test(email.trim()) && password.length >= 6,
    [email, password],
  );

  async function commitLanguage(next: AppLanguage) {
    setSelectedLanguage(next);
    await setLanguage(next);
  }

  const handleLogin = useCallback(async () => {
    if (!canSubmit || busy) return;
    setEmailTouched(true);
    setPasswordTouched(true);
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
  }, [canSubmit, busy, email, password, signInEmail, t]);

  const handleGoogle = useCallback(async () => {
    if (googleBusy) return;
    setGoogleBusy(true);
    setErrorMessage('');
    try {
      await signInGoogle();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      setErrorMessage(error?.message ?? t('auth.google_unavailable', 'Google sign-in is not available right now.'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setGoogleBusy(false);
    }
  }, [googleBusy, signInGoogle, t]);

  const handleGuest = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setErrorMessage('');
    try {
      await signInGuest();
    } catch (error: any) {
      setErrorMessage(error?.message ?? t('auth.guest_failed', 'Could not continue as guest'));
    } finally {
      setBusy(false);
    }
  }, [busy, signInGuest, t]);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <LinearGradient colors={['#07111F', '#0B1630', '#101C39']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#64D2AF" />
        <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  if (user || guestMode) return <Redirect href="/home" />;

  const anyBusy = busy || googleBusy;

  return (
    <Page scroll contentStyle={styles.page}>
      <LinearGradient colors={['#07111F', '#0B1630', '#101C39']} style={StyleSheet.absoluteFill} />

      <View style={styles.card}>
        {/* ── Brand header ── */}
        <View style={styles.brandSection}>
          <Image source={APP_ICON} style={styles.appIcon} resizeMode="contain" />
          <Text style={styles.brandName}>BabyFlow</Text>
          <Text style={styles.brandTagline}>Because every moment flows into a memory.</Text>
        </View>

        {/* ── Fields ── */}
        <LoginInput
          icon="mail-outline"
          label={t('auth.email', 'Email')}
          value={email}
          onChangeText={setEmail}
          placeholder="name@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          returnKeyType="next"
          error={emailError}
          onBlur={() => setEmailTouched(true)}
        />

        <LoginInput
          icon="lock-closed-outline"
          label={t('auth.password', 'Password')}
          value={password}
          onChangeText={setPassword}
          placeholder={t('auth.password_placeholder', 'Enter password')}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          textContentType="password"
          autoComplete="password"
          returnKeyType="done"
          onSubmitEditing={() => void handleLogin()}
          error={passwordError}
          onBlur={() => setPasswordTouched(true)}
          rightElement={
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={10}
              accessibilityLabel={showPassword ? t('auth.hide_password', 'Hide password') : t('auth.show_password', 'Show password')}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color="rgba(255,255,255,0.40)"
              />
            </Pressable>
          }
        />

        {/* ── Global error ── */}
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={15} color="#F0646E" />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* ── Sign in button ── */}
        <Pressable
          onPress={() => void handleLogin()}
          disabled={!canSubmit || anyBusy}
          accessibilityRole="button"
          accessibilityLabel={t('auth.sign_in', 'Sign in')}
          style={({ pressed }) => [
            styles.signInButton,
            (!canSubmit || anyBusy) && styles.signInButtonDisabled,
            pressed && canSubmit && styles.signInButtonPressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="log-in-outline" size={18} color="#fff" />
              <Text style={styles.signInText}>{t('auth.sign_in', 'Sign in')}</Text>
            </>
          )}
        </Pressable>

        {/* ── Google button ── */}
        <Pressable
          onPress={() => void handleGoogle()}
          disabled={anyBusy}
          accessibilityRole="button"
          accessibilityLabel={t('auth.continue_google', 'Continue with Google')}
          style={({ pressed }) => [
            styles.googleButton,
            anyBusy && styles.googleButtonDisabled,
            pressed && !anyBusy && styles.googleButtonPressed,
          ]}
        >
          {googleBusy ? (
            <ActivityIndicator color="#4285F4" />
          ) : (
            <>
              <View style={styles.googleIconBox}>
                {/* Google "G" coloured glyph */}
                <Text style={styles.googleGlyph}>G</Text>
              </View>
              <Text style={styles.googleText}>{t('auth.continue_google', 'Continue with Google')}</Text>
            </>
          )}
        </Pressable>

        {/* ── Divider ── */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.or', 'or')}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ── Secondary actions ── */}
        <View style={styles.secondaryRow}>
          <Pressable
            onPress={() => void handleGuest()}
            disabled={anyBusy}
            accessibilityRole="button"
            accessibilityLabel={t('auth.guest', 'Continue as guest')}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
          >
            <Ionicons name="person-outline" size={14} color="#9FCFC6" />
            <Text style={styles.secondaryText}>{t('auth.guest', 'Continue as guest')}</Text>
          </Pressable>

          <View style={styles.dot} />

          <Pressable
            onPress={() => router.push('/register')}
            disabled={anyBusy}
            accessibilityRole="button"
            accessibilityLabel={t('auth.create_account', 'Create account')}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
          >
            <Ionicons name="person-add-outline" size={14} color="#9FCFC6" />
            <Text style={styles.secondaryText}>{t('auth.create_account', 'Create account')}</Text>
          </Pressable>
        </View>

        {/* ── Language selector ── */}
        <View style={styles.languageSelector}>
          {LANGS.map((item) => {
            const active = item.code === selectedLanguage;
            return (
              <Pressable
                key={item.code}
                onPress={() => void commitLanguage(item.code)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                style={[styles.languageButton, active && styles.languageButtonActive]}
              >
                <Text style={[styles.languageButtonText, active && styles.languageButtonTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Page>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#E8F8F3', fontSize: 14 },

  page: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, paddingVertical: 32 },

  card: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(9,16,28,0.72)',
    padding: 24,
    gap: 14,
  },

  // Brand
  brandSection: { alignItems: 'center', gap: 10, paddingBottom: 6 },
  appIcon: { width: 88, height: 88, borderRadius: 22 },
  brandName: { color: '#ECF2F7', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  brandTagline: { color: 'rgba(236,242,247,0.55)', fontSize: 13, textAlign: 'center' },

  // Field
  field: { gap: 6 },
  fieldLabel: { color: 'rgba(236,242,247,0.80)', fontSize: 13, fontWeight: '600', paddingLeft: 2 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputIconWrap: { marginRight: 10 },
  inputText: { flex: 1, color: '#ECF2F7', fontSize: 15, paddingVertical: 14 },
  eyeButton: { padding: 4 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 2 },
  fieldError: { color: '#F0646E', fontSize: 12, fontWeight: '500' },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(240,100,110,0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(240,100,110,0.30)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorBannerText: { color: '#F0A0A6', fontSize: 13, fontWeight: '500', flex: 1 },

  // Sign in button
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#1DB87A',
    shadowColor: '#1DB87A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  signInButtonDisabled: { opacity: 0.45, shadowOpacity: 0 },
  signInButtonPressed: { opacity: 0.88 },
  signInText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Google button
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  googleButtonDisabled: { opacity: 0.45 },
  googleButtonPressed: { backgroundColor: 'rgba(255,255,255,0.10)' },
  googleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleGlyph: { color: '#1A73E8', fontSize: 16, fontWeight: '800' },
  googleText: { color: '#F6FAFC', fontSize: 15, fontWeight: '700' },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.10)' },
  dividerText: { color: 'rgba(255,255,255,0.30)', fontSize: 12, fontWeight: '600' },

  // Secondary actions
  secondaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 6, borderRadius: 8 },
  secondaryButtonPressed: { backgroundColor: 'rgba(255,255,255,0.07)' },
  secondaryText: { color: '#9FCFC6', fontSize: 13, fontWeight: '600' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.20)' },

  // Language selector
  languageSelector: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8, paddingTop: 2 },
  languageButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  languageButtonActive: { backgroundColor: 'rgba(100,210,175,0.16)', borderColor: 'rgba(100,210,175,0.50)' },
  languageButtonText: { color: 'rgba(236,242,247,0.60)', fontSize: 12, fontWeight: '600' },
  languageButtonTextActive: { color: '#9FCFC6' },
});
