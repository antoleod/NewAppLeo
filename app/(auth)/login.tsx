import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputProps,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Page , useToast } from '@/components/shared';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { AppLanguage } from '@/types';
import { shadow } from '@/utils/shadow';

// ─── Constants ────────────────────────────────────────────────────────────────

const APP_ICON = require('../../assets/branding/app-icon/babyflow-app-icon-512.png');

const LANGS: { code: AppLanguage; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'es', label: 'ES' },
  { code: 'nl', label: 'NL' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ACCENT = '#34C77B';        // Apple-style vibrant green
const ACCENT_GLOW = '#34C77B';
const TEXT_PRIMARY = '#F2F2F7';  // iOS white
const TEXT_SECONDARY = 'rgba(235,235,245,0.60)';
const TEXT_TERTIARY = 'rgba(235,235,245,0.30)';
const HAIRLINE = 'rgba(255,255,255,0.08)';
const FIELD_BG = 'rgba(118,118,128,0.18)'; // iOS material fill
const DESTRUCTIVE = '#FF453A';

// ─── AppleField (single row) ──────────────────────────────────────────────────

interface AppleFieldProps extends TextInputProps {
  icon: keyof typeof Ionicons.glyphMap;
  inputRef?: React.RefObject<TextInput | null>;
  rightElement?: React.ReactNode;
  showHairline?: boolean;
  hasError?: boolean;
}

function AppleField({
  icon,
  inputRef,
  rightElement,
  showHairline,
  hasError,
  style,
  ...rest
}: AppleFieldProps) {
  const internalRef = useRef<TextInput>(null);
  const ref = inputRef ?? internalRef;
  const [focused, setFocused] = useState(false);

  const iconColor = hasError
    ? DESTRUCTIVE
    : focused
    ? ACCENT
    : TEXT_TERTIARY;

  return (
    <View>
      <Pressable onPress={() => ref.current?.focus()} style={styles.fieldRow}>
        <View style={styles.fieldIcon}>
          <Ionicons name={icon} size={19} color={iconColor} />
        </View>
        <TextInput
          ref={ref}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={TEXT_TERTIARY}
          style={[styles.fieldInput, style]}
        />
        {rightElement}
      </Pressable>
      {showHairline ? <View style={styles.hairline} /> : null}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { language, setLanguage, t } = useLocale();
  const { loading, user, guestMode, signInGuest, signInEmail, signInGoogle, resetPassword } = useAuth();
  const toast = useToast();
  const { width, height } = useWindowDimensions();
  const isCompact = height < 740 || width < 360;

  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage>(language);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const trimmedEmail = email.trim();
  const emailValid = EMAIL_RE.test(trimmedEmail);
  const passwordValid = password.length >= 6;

  const emailError = emailTouched && email.length > 0 && !emailValid
    ? t('auth.email_invalid', 'Invalid email')
    : undefined;

  const passwordError = passwordTouched && password.length > 0 && !passwordValid
    ? t('auth.password_short', 'Password must be at least 6 characters')
    : undefined;

  const inlineError = emailError ?? passwordError;
  const canSubmit = useMemo(() => emailValid && passwordValid, [emailValid, passwordValid]);
  const anyBusy = busy || googleBusy || resetBusy;

  // Clear global error when user starts editing again
  useEffect(() => {
    if (errorMessage) setErrorMessage('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password]);

  async function commitLanguage(next: AppLanguage) {
    setSelectedLanguage(next);
    await setLanguage(next);
  }

  const handleLogin = useCallback(async () => {
    setEmailTouched(true);
    setPasswordTouched(true);
    if (!canSubmit || anyBusy) return;
    setBusy(true);
    setErrorMessage('');
    try {
      await signInEmail({ email: trimmedEmail, password });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      setErrorMessage(error?.message ?? t('auth.login_failed', 'Login failed'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  }, [canSubmit, anyBusy, trimmedEmail, password, signInEmail, t]);

  const handleGoogle = useCallback(async () => {
    if (anyBusy) return;
    setGoogleBusy(true);
    setErrorMessage('');
    try {
      await signInGoogle();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      setErrorMessage(error?.message ?? t('auth.google_unavailable', 'Google sign-in unavailable'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setGoogleBusy(false);
    }
  }, [anyBusy, signInGoogle, t]);

  const handleGuest = useCallback(async () => {
    if (anyBusy) return;
    setBusy(true);
    setErrorMessage('');
    try {
      await signInGuest();
    } catch (error: any) {
      setErrorMessage(error?.message ?? t('auth.guest_failed', 'Could not continue as guest'));
    } finally {
      setBusy(false);
    }
  }, [anyBusy, signInGuest, t]);

  const handleForgotPassword = useCallback(async () => {
    if (anyBusy) return;
    if (!emailValid) {
      setEmailTouched(true);
      toast.warning(t('auth.reset_need_email', 'Enter your email first'));
      emailRef.current?.focus();
      return;
    }
    setResetBusy(true);
    try {
      await resetPassword(trimmedEmail);
      toast.success(t('auth.reset_sent', 'Password reset email sent'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      toast.error(error?.message ?? t('auth.reset_failed', 'Could not send reset email'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setResetBusy(false);
    }
  }, [anyBusy, emailValid, trimmedEmail, resetPassword, toast, t]);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <LinearGradient colors={['#000000', '#0A0A0F']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (user || guestMode) return <Redirect href="/home" />;

  const greeting =
    language === 'fr' ? 'Bon retour' :
    language === 'es' ? 'Bienvenido' :
    language === 'nl' ? 'Welkom terug' :
    'Welcome back';

  const subline =
    language === 'fr' ? 'Connectez-vous pour continuer' :
    language === 'es' ? 'Inicia sesión para continuar' :
    language === 'nl' ? 'Meld je aan om door te gaan' :
    'Sign in to continue';

  return (
    <Page scroll={false} contentStyle={styles.page}>
      {/* ── Background: deep black with subtle accent glow ── */}
      <LinearGradient colors={['#000000', '#0A0A0F', '#0F0F1A']} style={StyleSheet.absoluteFill} />
      <View style={[styles.glowTop, { pointerEvents: 'none' } as any]} />
      <View style={[styles.glowBottom, { pointerEvents: 'none' } as any]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kbAvoider}
      >
        <Animated.View entering={FadeIn.duration(500)} style={styles.container}>
          {/* ── Hero ── */}
          <Animated.View entering={FadeInDown.duration(500).delay(80)} style={styles.hero}>
            <View style={styles.iconWrap}>
              <Image
                source={APP_ICON}
                style={[styles.appIcon, isCompact && styles.appIconCompact]}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.brandWordmark, isCompact && styles.brandWordmarkCompact]}>
              BabyFlow
            </Text>
            <Text style={styles.greeting}>{greeting}</Text>
            {!isCompact ? <Text style={styles.subline}>{subline}</Text> : null}
          </Animated.View>

          {/* ── Form group (Apple-style stacked rows with hairlines) ── */}
          <Animated.View entering={FadeInDown.duration(500).delay(160)} style={styles.formGroup}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 40 : 0}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <View style={[StyleSheet.absoluteFill, styles.formGroupBg]} />

            <AppleField
              icon="mail-outline"
              inputRef={emailRef}
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.email_placeholder', 'Email')}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
              onBlur={() => setEmailTouched(true)}
              hasError={!!emailError}
              showHairline
            />

            <AppleField
              icon="lock-closed-outline"
              inputRef={passwordRef}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.password_placeholder', 'Password')}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              textContentType="password"
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={() => void handleLogin()}
              onBlur={() => setPasswordTouched(true)}
              hasError={!!passwordError}
              rightElement={
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={12}
                  accessibilityLabel={
                    showPassword
                      ? t('auth.hide_password', 'Hide password')
                      : t('auth.show_password', 'Show password')
                  }
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye-outline'}
                    size={18}
                    color={TEXT_TERTIARY}
                  />
                </Pressable>
              }
            />
          </Animated.View>

          {/* ── Inline error ── */}
          {(inlineError || errorMessage) ? (
            <Animated.View entering={FadeIn.duration(180)} style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color={DESTRUCTIVE} />
              <Text style={styles.errorText}>{inlineError ?? errorMessage}</Text>
            </Animated.View>
          ) : null}

          {/* ── Forgot password ── */}
          <Pressable
            onPress={() => void handleForgotPassword()}
            disabled={anyBusy}
            accessibilityRole="link"
            style={styles.forgotRow}
            hitSlop={6}
          >
            {resetBusy ? (
              <ActivityIndicator size="small" color={ACCENT} />
            ) : (
              <Text style={styles.forgotText}>
                {t('auth.forgot_password', 'Forgot password?')}
              </Text>
            )}
          </Pressable>

          {/* ── Primary action: Sign in ── */}
          <Animated.View entering={FadeInDown.duration(500).delay(240)}>
            <Pressable
              onPress={() => void handleLogin()}
              disabled={anyBusy}
              accessibilityRole="button"
              accessibilityLabel={t('auth.sign_in', 'Sign in')}
              style={({ pressed }) => [
                styles.primaryButton,
                !canSubmit && styles.primaryButtonDim,
                pressed && canSubmit && !anyBusy && styles.primaryButtonPressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>{t('auth.sign_in', 'Sign in')}</Text>
              )}
            </Pressable>
          </Animated.View>

          {/* ── Divider ── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.or', 'or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Google ── */}
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
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <View style={styles.googleIconBox}>
                  <Text style={styles.googleGlyph}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>
                  {t('auth.continue_google', 'Continue with Google')}
                </Text>
              </>
            )}
          </Pressable>

          {/* ── Guest ── */}
          <Pressable
            onPress={() => void handleGuest()}
            disabled={anyBusy}
            accessibilityRole="button"
            accessibilityLabel={t('auth.guest', 'Continue as guest')}
            style={({ pressed }) => [
              styles.ghostButton,
              pressed && !anyBusy && styles.ghostButtonPressed,
            ]}
          >
            <Text style={styles.ghostButtonText}>{t('auth.guest', 'Continue as guest')}</Text>
          </Pressable>

          {/* ── Footer: Create account + language ── */}
          <View style={styles.footer}>
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>
                {t('auth.no_account', "Don't have an account?")}{' '}
              </Text>
              <Pressable
                onPress={() => router.push('/register')}
                disabled={anyBusy}
                accessibilityRole="link"
                hitSlop={6}
              >
                <Text style={styles.footerLink}>
                  {t('auth.create_account', 'Sign up')}
                </Text>
              </Pressable>
            </View>

            <View style={styles.languageSelector}>
              {LANGS.map((item, i) => {
                const active = item.code === selectedLanguage;
                return (
                  <View key={item.code} style={styles.languageItemWrap}>
                    {i > 0 ? <View style={styles.languageSeparator} /> : null}
                    <Pressable
                      onPress={() => void commitLanguage(item.code)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      hitSlop={4}
                      style={styles.languageButton}
                    >
                      <Text style={[styles.languageText, active && styles.languageTextActive]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Page>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // No-scroll: fill screen, center content vertically
  page: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12 },
  kbAvoider: { width: '100%', alignItems: 'center', justifyContent: 'center', flex: 1 },

  // Background glows
  glowTop: {
    position: 'absolute',
    top: -160,
    width: 420,
    height: 420,
    borderRadius: 420,
    backgroundColor: ACCENT_GLOW,
    opacity: 0.10,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -200,
    right: -100,
    width: 360,
    height: 360,
    borderRadius: 360,
    backgroundColor: '#5E5CE6',
    opacity: 0.08,
  },

  container: { width: '100%', maxWidth: 420, gap: 10 },

  // Hero — compact, mobile-first
  hero: { alignItems: 'center', gap: 4, marginBottom: 4 },
  iconWrap: {
    ...shadow(ACCENT_GLOW, 0.30, 20, 0, 10),
    elevation: 8,
    marginBottom: 6,
  },
  appIcon: { width: 76, height: 76, borderRadius: 18 },
  appIconCompact: { width: 60, height: 60, borderRadius: 14 },
  brandWordmark: {
    color: TEXT_PRIMARY,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  brandWordmarkCompact: { fontSize: 24 },
  greeting: {
    color: TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
    textAlign: 'center',
    marginTop: 2,
  },
  subline: {
    color: TEXT_TERTIARY,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '400',
  },

  // Form group (iOS-style grouped rows)
  formGroup: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
  },
  formGroupBg: { backgroundColor: FIELD_BG },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    minHeight: 50,
  },
  fieldIcon: { marginRight: 10, width: 20, alignItems: 'center' },
  fieldInput: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 16,
    paddingVertical: 14,
    fontWeight: '400',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: HAIRLINE, marginLeft: 44 },
  eyeButton: { padding: 4, marginLeft: 4 },

  // Inline error
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, marginTop: -2 },
  errorText: { color: DESTRUCTIVE, fontSize: 12, fontWeight: '500', flex: 1 },

  // Forgot
  forgotRow: { alignSelf: 'flex-end', paddingVertical: 2, paddingHorizontal: 2, marginTop: -4 },
  forgotText: { color: ACCENT, fontSize: 13, fontWeight: '600' },

  // Primary button (Apple-style filled)
  primaryButton: {
    minHeight: 50,
    borderRadius: 13,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(ACCENT_GLOW, 0.40, 14, 0, 6),
    elevation: 5,
  },
  primaryButtonDim: { opacity: 0.5, ...Platform.select({ web: { boxShadow: 'none' } as any, default: { shadowOpacity: 0 } }) },
  primaryButtonPressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 0 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.14)' },
  dividerText: {
    color: TEXT_TERTIARY,
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  // Google (Apple-style: white-fill secondary)
  googleButton: {
    minHeight: 50,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleButtonDisabled: { opacity: 0.5 },
  googleButtonPressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  googleIconBox: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleGlyph: { color: '#1A73E8', fontSize: 17, fontWeight: '900' },
  googleButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // Ghost (guest)
  ghostButton: {
    minHeight: 50,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
  },
  ghostButtonPressed: { backgroundColor: 'rgba(255,255,255,0.10)' },
  ghostButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  // Footer
  footer: { gap: 10, alignItems: 'center', marginTop: 4 },
  footerRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  footerText: { color: TEXT_SECONDARY, fontSize: 13 },
  footerLink: { color: ACCENT, fontSize: 13, fontWeight: '700' },

  // Language selector — tight inline pill
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(118,118,128,0.18)',
    borderRadius: 999,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  languageItemWrap: { flexDirection: 'row', alignItems: 'center' },
  languageSeparator: { width: StyleSheet.hairlineWidth, height: 14, backgroundColor: 'rgba(255,255,255,0.10)' },
  languageButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  languageText: { color: TEXT_SECONDARY, fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },
  languageTextActive: { color: ACCENT },
});
