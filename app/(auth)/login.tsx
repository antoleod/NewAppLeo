import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Input, Page } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { useResponsiveLayout } from '@/lib/responsiveLayout';
import { AppLanguage } from '@/types';
import { typography } from '@/typography';
import { BabyFlowGoogleGlyph, BabyFlowIcon } from '@/components/BabyFlowIcon';

const LANGS: Array<{ code: AppLanguage; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Francais' },
  { code: 'es', label: 'Espanol' },
  { code: 'nl', label: 'Nederlands' },
];

export default function LoginScreen() {
  const { colors, theme } = useTheme();
  const { language, setLanguage, t } = useLocale();
  const { loading, user, guestMode, signInGuest, signInEmail, signInEmailPin, signInGoogle, resetPassword } = useAuth();
  const layout = useResponsiveLayout();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1080;
  const isTablet = width >= 768;
  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage>(language);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');
  const [authSecret, setAuthSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const featureItems = [
    {
      icon: 'time-outline',
      title: t('auth.feature_track_title', 'Track daily routines'),
      body: t('auth.feature_track_body', 'Sleep, feeding and care events stay in one calm timeline.'),
    },
    {
      icon: 'analytics-outline',
      title: t('auth.feature_patterns_title', 'Understand patterns'),
      body: t('auth.feature_patterns_body', 'Spot rhythms and changes before the day starts feeling noisy.'),
    },
    {
      icon: 'shield-checkmark-outline',
      title: t('auth.feature_safe_title', 'Safe & private'),
      body: t('auth.feature_safe_body', 'Designed to feel secure, quiet, and family-first by default.'),
    },
  ];

  useEffect(() => {
    setSelectedLanguage(language);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [fadeAnim, language, slideAnim]);

  const isPinMode = /^\d{0,6}$/.test(authSecret) && authSecret.length > 0;

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  };

  const validatePassword = (value: string): { isValid: boolean; message?: string } => {
    if (isPinMode) {
      if (value.length !== 6) return { isValid: false, message: t('auth.pin_exact', 'PIN must be exactly 6 digits.') };
      if (!/^\d{6}$/.test(value)) return { isValid: false, message: t('auth.pin_numbers', 'PIN must contain only numbers.') };
      return { isValid: true };
    }

    if (value.length < 6) return { isValid: false, message: t('auth.password_short', 'Password must be at least 6 characters long.') };
    return { isValid: true };
  };

  const canSubmit = useMemo(() => {
    const validEmail = validateEmail(email);
    const validPassword = validatePassword(authSecret);
    return validEmail && validPassword.isValid;
  }, [authSecret, email, isPinMode]);

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
    return <Redirect href="/home" />;
  }

  async function commitLanguage(next: AppLanguage) {
    setSelectedLanguage(next);
    await setLanguage(next);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function handleGuest() {
    setBusy(true);
    setErrorMessage('');
    try {
      await signInGuest();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      setErrorMessage(error?.message ?? t('auth.guest', 'Continue as guest'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  }

  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailError('');
    setErrorMessage('');
  };

  const handlePasswordChange = (text: string) => {
    setAuthSecret(text);
    setPasswordError('');
    setErrorMessage('');
  };

  const handleTogglePasswordVisibility = () => {
    setShowSecret((value) => !value);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  async function handleLogin() {
    if (!canSubmit) return;

    setEmailError('');
    setPasswordError('');
    setErrorMessage('');

    if (!validateEmail(email)) {
      setEmailError(t('auth.invalid_email', 'Please enter a valid email address.'));
      return;
    }

    const passwordValidation = validatePassword(authSecret);
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.message ?? t('auth.invalid_password', 'Please enter a valid password.'));
      return;
    }

    setBusy(true);
    try {
      if (isPinMode) {
        await signInEmailPin({ email: email.trim(), pin: authSecret });
      } else {
        await signInEmail({ email: email.trim(), password: authSecret });
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      setErrorMessage(error?.message ?? t('auth.login_failed'));
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
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      setErrorMessage(error?.message ?? t('auth.google_unavailable', 'Google sign-in is not available right now.'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setEmailError(t('auth.enter_email_recovery', 'Enter your email first to recover access.'));
      return;
    }

    setBusy(true);
    setErrorMessage('');
    try {
      await resetPassword(email.trim());
      Alert.alert(t('auth.recovery_title', 'Recovery request received'), t('auth.recovery_body', 'If this email is registered, a recovery email has been sent.'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      setErrorMessage(error?.message ?? t('auth.recovery_failed', 'Could not send the recovery email.'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#07111F', '#0B1630', '#101C39']} style={StyleSheet.absoluteFill} />
      <View style={styles.backdrop}>
        <LinearGradient colors={['rgba(100, 221, 192, 0.18)', 'rgba(100, 221, 192, 0)']} style={styles.glowTopLeft} />
        <LinearGradient colors={['rgba(141, 126, 224, 0.16)', 'rgba(141, 126, 224, 0)']} style={styles.glowRight} />
        <LinearGradient colors={['rgba(234, 206, 145, 0.12)', 'rgba(234, 206, 145, 0)']} style={styles.glowBottom} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: isDesktop ? 34 : 18 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.shell,
              {
                flexDirection: isDesktop ? 'row' : 'column',
                gap: isDesktop ? 28 : 18,
                padding: isDesktop ? 20 : 10,
              },
            ]}
          >
            {isTablet ? (
              <Animated.View
                style={[
                  styles.heroPanel,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                    minHeight: isDesktop ? 760 : undefined,
                    padding: isDesktop ? 34 : 28,
                  },
                ]}
              >
                <View style={styles.heroTop}>
                  <View style={styles.brandBadge}>
                    <View style={styles.brandMark}>
                      <LinearGradient colors={['#96D4BF', '#5AA89A']} style={StyleSheet.absoluteFill} />
                      <BabyFlowIcon name="hydration" size={18} active bare />
                    </View>
                    <View style={{ gap: 2 }}>
                      <Text style={styles.brand}>BabyFlow</Text>
                      <Text style={styles.brandSubline}>{t('auth.brand_subline', 'Because every moment flows into a memory.')}</Text>
                    </View>
                  </View>

                  <View style={{ gap: 12, maxWidth: 560 }}>
                    <Text style={[styles.heroTitle, { fontSize: isDesktop ? 44 : 38, lineHeight: isDesktop ? 50 : 44 }]}>
                      {t('auth.hero_title', 'Calm tracking for sleep, feeding, and every soft in-between.')}
                    </Text>
                    <Text style={styles.heroDescription}>
                      {t('auth.hero_body', 'BabyFlow helps you follow routines, understand growth patterns, and keep each day feeling organized, private, and gentle.')}
                    </Text>
                  </View>
                </View>

                <View style={[styles.illustrationWrap, { minHeight: isDesktop ? 390 : 320 }]}>
                  <View style={styles.particleOne} />
                  <View style={styles.particleTwo} />
                  <View style={styles.particleThree} />
                  <View style={styles.starOne}>
                    <Ionicons name="star" size={14} color="#F0D99C" />
                  </View>
                  <View style={styles.starTwo}>
                    <Ionicons name="star" size={10} color="#F0D99C" />
                  </View>
                  <View style={styles.starThree}>
                    <Ionicons name="star" size={12} color="#9FD9D0" />
                  </View>
                  <View style={styles.moonGlow} />
                  <View style={styles.moon}>
                    <View style={styles.moonCut} />
                  </View>
                  <View style={styles.flowRibbon}>
                    <LinearGradient
                      colors={['rgba(146, 220, 205, 0.00)', 'rgba(146, 220, 205, 0.35)', 'rgba(146, 220, 205, 0.00)']}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                  <View style={styles.cloudBase}>
                    <LinearGradient colors={['rgba(168, 204, 214, 0.42)', 'rgba(90, 124, 155, 0.20)']} style={StyleSheet.absoluteFill} />
                  </View>
                  <View style={styles.cloudPuffLeft} />
                  <View style={styles.cloudPuffMiddle} />
                  <View style={styles.cloudPuffRight} />
                  <View style={styles.babyGlow} />
                  <View style={styles.babyWrap}>
                    <View style={styles.babyHead} />
                    <View style={styles.babyBody} />
                    <View style={styles.babyArm} />
                    <View style={styles.babyBlanket} />
                  </View>
                </View>

                <View style={styles.featureRow}>
                  {featureItems.map((item) => (
                    <View key={item.title} style={styles.featureCard}>
                      <View style={styles.featureIcon}>
                        <LinearGradient colors={['rgba(136, 214, 198, 0.32)', 'rgba(87, 138, 159, 0.18)']} style={StyleSheet.absoluteFill} />
                        <BabyFlowIcon
                          name={item.title === 'Track daily routines' ? 'routines' : item.title === 'Understand patterns' ? 'patterns' : 'privacy'}
                          size={18}
                          bare
                        />
                      </View>
                      <View style={{ gap: 5, flex: 1 }}>
                        <Text style={styles.featureTitle}>{item.title}</Text>
                        <Text style={styles.featureBody}>{item.body}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </Animated.View>
            ) : null}

            <Animated.View
              style={[
                styles.loginPanel,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                  padding: isDesktop ? 30 : isTablet ? 26 : 22,
                },
              ]}
            >
              <View style={styles.loginCard}>
                <View style={styles.loginCardGlow} />

                <View style={{ gap: 8 }}>
                  <Text style={styles.loginTitle}>{t('auth.welcome_back', 'Welcome back')}</Text>
                  <Text style={styles.loginSubtitle}>{t('auth.login_subtitle', 'Sign in to continue your BabyFlow journey')}</Text>
                </View>

                <View style={styles.loginSection}>
                  <Input
                    label={t('auth.email', 'Email')}
                    value={email}
                    onChangeText={handleEmailChange}
                    placeholder={t('auth.email_placeholder', 'name@email.com')}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    error={emailError}
                    textContentType="emailAddress"
                    rightAccessory={<BabyFlowIcon name="mail" size={18} bare />}
                  />

                  <Input
                    label={isPinMode ? t('auth.password_or_pin_label', 'Password or PIN') : t('auth.password', 'Password')}
                    value={authSecret}
                    onChangeText={handlePasswordChange}
                    placeholder={isPinMode ? '123456' : t('auth.password_placeholder', 'Enter password')}
                    secureTextEntry={!showSecret}
                    autoCapitalize="none"
                    keyboardType={isPinMode ? 'number-pad' : 'default'}
                    inputMode={isPinMode ? 'numeric' : 'text'}
                    error={passwordError}
                    textContentType={isPinMode ? 'none' : 'password'}
                    rightAccessory={
                      <Pressable onPress={handleTogglePasswordVisibility} hitSlop={8}>
                        <BabyFlowIcon name={showSecret ? 'eye-off' : 'eye'} size={18} bare />
                      </Pressable>
                    }
                  />
                </View>

                {errorMessage ? <Text style={[typography.body, styles.errorText]}>{errorMessage}</Text> : null}

                <View style={styles.buttonWrap}>
                  <LinearGradient
                    colors={busy || !canSubmit ? ['#4F6C67', '#48635F'] : ['#91D7C0', '#5FA89D', '#76B7D2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.ctaGlow}
                  />
                  <Button label={t('auth.sign_in', 'Sign in')} onPress={() => void handleLogin()} disabled={busy || !canSubmit} loading={busy} style={styles.primaryButton} />
                </View>

                <View style={styles.secondaryActions}>
                  <Pressable onPress={() => void handleForgotPassword()} disabled={busy}>
                    <Text style={styles.linkText}>{t('auth.forgot_password', 'Forgot password?')}</Text>
                  </Pressable>
                  <Pressable onPress={() => void handleGuest()} disabled={busy}>
                    <Text style={styles.linkText}>{t('auth.guest', 'Continue as guest')}</Text>
                  </Pressable>
                </View>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{t('common.or', 'or')}</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Pressable onPress={() => void handleGoogle()} disabled={busy} style={({ pressed }) => [styles.googleButton, pressed && !busy ? { opacity: 0.88 } : null]}>
                  <BabyFlowGoogleGlyph />
                  <Text style={styles.googleText}>{t('auth.continue_google', 'Continue with Google')}</Text>
                </Pressable>

                <View style={styles.signupPrompt}>
                  <Text style={styles.signupText}>{t('auth.new_to_babyflow', 'New to BabyFlow?')}</Text>
                  <Pressable onPress={() => router.push('/register')} disabled={busy}>
                    <Text style={styles.signupLink}>{t('auth.create_account', 'Create account')}</Text>
                  </Pressable>
                </View>

                <View style={styles.languageSelector}>
                  {LANGS.map((item) => {
                    const active = item.code === selectedLanguage;
                    return (
                      <Pressable
                        key={item.code}
                        onPress={() => void commitLanguage(item.code)}
                        style={[styles.languageButton, active ? styles.languageButtonActive : styles.languageButtonIdle]}
                        accessibilityLabel={`Language: ${item.label}`}
                        accessibilityHint={`Switch to ${item.label}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                      >
                        <Text style={[styles.languageButtonText, active ? styles.languageButtonTextActive : null]}>{item.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#07111F' },
  keyboard: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  glowTopLeft: {
    position: 'absolute',
    top: -140,
    left: -100,
    width: 420,
    height: 420,
    borderRadius: 999,
  },
  glowRight: {
    position: 'absolute',
    top: 120,
    right: -120,
    width: 340,
    height: 420,
    borderRadius: 999,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -120,
    left: '20%',
    width: 420,
    height: 240,
    borderRadius: 999,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 18,
  },
  shell: {
    width: '100%',
    maxWidth: 1420,
    alignSelf: 'center',
    alignItems: 'stretch',
  },
  heroPanel: {
    flex: 1.08,
    justifyContent: 'space-between',
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  heroTop: { gap: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 16, fontWeight: '600' },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brand: {
    color: '#ECF2F7',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  brandSubline: {
    color: 'rgba(236,242,247,0.62)',
    fontSize: 13,
    lineHeight: 18,
  },
  heroTitle: {
    color: '#F4F7FB',
    fontWeight: '900',
    letterSpacing: -1.4,
  },
  heroDescription: {
    color: 'rgba(230,239,245,0.72)',
    fontSize: 16,
    lineHeight: 26,
    maxWidth: 560,
  },
  illustrationWrap: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 30,
    marginTop: 12,
    marginBottom: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  moonGlow: {
    position: 'absolute',
    top: 54,
    left: 58,
    width: 96,
    height: 96,
    borderRadius: 999,
    backgroundColor: 'rgba(240,216,150,0.18)',
  },
  moon: {
    position: 'absolute',
    top: 68,
    left: 72,
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: '#F3D89A',
  },
  moonCut: {
    position: 'absolute',
    right: -6,
    top: 6,
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(18,28,52,0.98)',
  },
  flowRibbon: {
    position: 'absolute',
    top: 128,
    left: 20,
    right: 20,
    height: 120,
    borderRadius: 999,
    transform: [{ rotate: '-7deg' }],
    overflow: 'hidden',
  },
  cloudBase: {
    position: 'absolute',
    bottom: 62,
    left: '17%',
    right: '17%',
    height: 88,
    borderRadius: 999,
    overflow: 'hidden',
  },
  cloudPuffLeft: {
    position: 'absolute',
    bottom: 82,
    left: '18%',
    width: 104,
    height: 104,
    borderRadius: 999,
    backgroundColor: 'rgba(191,220,231,0.26)',
  },
  cloudPuffMiddle: {
    position: 'absolute',
    bottom: 66,
    left: '36%',
    width: 144,
    height: 144,
    borderRadius: 999,
    backgroundColor: 'rgba(191,220,231,0.28)',
  },
  cloudPuffRight: {
    position: 'absolute',
    bottom: 80,
    right: '20%',
    width: 114,
    height: 114,
    borderRadius: 999,
    backgroundColor: 'rgba(191,220,231,0.24)',
  },
  babyGlow: {
    position: 'absolute',
    bottom: 88,
    left: '28%',
    width: 260,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(111,220,191,0.18)',
  },
  babyWrap: {
    position: 'absolute',
    bottom: 114,
    left: '34%',
    width: 220,
    height: 170,
  },
  babyHead: {
    position: 'absolute',
    top: 6,
    left: 70,
    width: 76,
    height: 76,
    borderRadius: 999,
    backgroundColor: '#F0C8AA',
  },
  babyBody: {
    position: 'absolute',
    top: 54,
    left: 30,
    width: 166,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#6EA49A',
    transform: [{ rotate: '-14deg' }],
  },
  babyArm: {
    position: 'absolute',
    top: 88,
    left: 88,
    width: 70,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#87B8AD',
    transform: [{ rotate: '18deg' }],
  },
  babyBlanket: {
    position: 'absolute',
    top: 82,
    left: 18,
    width: 182,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(130,173,183,0.48)',
    transform: [{ rotate: '-11deg' }],
  },
  particleOne: {
    position: 'absolute',
    top: 58,
    right: 82,
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.54)',
  },
  particleTwo: {
    position: 'absolute',
    top: 130,
    right: 148,
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(159,217,208,0.72)',
  },
  particleThree: {
    position: 'absolute',
    bottom: 120,
    left: 110,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
  starOne: { position: 'absolute', top: 72, right: 116 },
  starTwo: { position: 'absolute', top: 144, left: 112 },
  starThree: { position: 'absolute', bottom: 138, right: 132 },
  featureRow: {
    gap: 14,
    justifyContent: 'space-between',
  },
  featureCard: {
    flex: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    color: '#ECF2F7',
    fontSize: 15,
    fontWeight: '700',
  },
  featureBody: {
    color: 'rgba(236,242,247,0.66)',
    fontSize: 13,
    lineHeight: 19,
  },
  loginPanel: {
    flex: 0.92,
    justifyContent: 'center',
  },
  loginCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(9,16,28,0.52)',
    padding: 24,
    gap: 18,
  },
  loginCardGlow: {
    position: 'absolute',
    top: -90,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(128,224,207,0.10)',
  },
  loginTitle: {
    color: '#F7FAFC',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  loginSubtitle: {
    color: 'rgba(235,242,247,0.64)',
    fontSize: 15,
    lineHeight: 22,
  },
  loginSection: {
    gap: 14,
  },
  errorText: {
    color: '#F0959C',
    textAlign: 'center',
    fontSize: 13,
  },
  buttonWrap: {
    position: 'relative',
    marginTop: 4,
  },
  ctaGlow: {
    position: 'absolute',
    top: -8,
    left: 12,
    right: 12,
    bottom: -8,
    borderRadius: 999,
    opacity: 0.34,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.01)',
    shadowOpacity: 0,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  linkText: {
    color: '#9FCFC6',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  dividerText: {
    color: 'rgba(235,242,247,0.48)',
    fontSize: 12,
    fontWeight: '600',
  },
  googleButton: {
    minHeight: 58,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  googleText: {
    color: '#F6FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  signupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  signupText: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(235,242,247,0.58)',
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A6E2D0',
  },
  languageSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  languageButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageButtonIdle: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.10)',
  },
  languageButtonActive: {
    backgroundColor: 'rgba(145,215,192,0.18)',
    borderColor: 'rgba(145,215,192,0.48)',
  },
  languageButtonText: {
    color: 'rgba(235,242,247,0.74)',
    fontSize: 13,
    fontWeight: '600',
  },
  languageButtonTextActive: {
    color: '#E8F8F3',
  },
});
