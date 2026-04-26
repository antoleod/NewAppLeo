import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { Layout } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Input, Page } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { isValidPin, normalizeEmail, normalizeUsername } from '@/utils/crypto';

const PASSWORD_PARTS_A = ['Sun', 'Leaf', 'Calm', 'Milk', 'Soft', 'River', 'Golden', 'Quiet', 'Little', 'Silver', 'Warm', 'Ocean'];
const PASSWORD_PARTS_B = ['Blue', 'Moon', 'Nest', 'Stars', 'Cloud', 'Bloom', 'Light', 'Forest', 'Honey', 'Pebble', 'Breeze', 'Cedar'];
const PASSWORD_PARTS_C = ['Beach', 'Dream', 'Home', 'Night', 'Rest', 'Garden', 'Story', 'Meadow', 'Harbor', 'Morning', 'Willow', 'Echo'];

function randomIndex(max: number) {
  if (max <= 0) return 0;
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint32Array(1);
    globalThis.crypto.getRandomValues(bytes);
    return bytes[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function buildFallbackIdentity(email: string) {
  const normalized = normalizeEmail(email);
  const [localPart, domainPart = 'app'] = normalized.split('@');
  const baseUsername = normalizeUsername(`${localPart}.${domainPart.split('.')[0]}`) || 'parent';
  const local = baseUsername.slice(0, 24);
  const displayName = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return {
    username: local,
    displayName: displayName || 'Parent',
  };
}

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { register, signInGoogle, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [authSecret, setAuthSecret] = useState('');
  const [confirmSecret, setConfirmSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const isPinMode = /^\d{0,6}$/.test(authSecret) && authSecret.length > 0;
  const isValidPinMode = /^\d{6}$/.test(authSecret);
  const isPasswordMode = !isPinMode;
  const secretMismatch = confirmSecret.length > 0 && authSecret !== confirmSecret ? (isPinMode ? t('auth.pin_mismatch', 'PINs do not match.') : t('auth.password_mismatch', 'Passwords do not match.')) : '';
  const secretFormatError =
    authSecret.length > 0
      ? isPinMode
        ? !isValidPinMode
          ? t('auth.pin_exact', 'PIN must be exactly 6 digits.')
          : ''
        : authSecret.trim().length < 6
          ? t('auth.password_min', 'Use at least 6 characters.')
          : ''
      : '';
  const canSubmit =
    normalizedEmail.length > 4 &&
    ((isPinMode && isValidPinMode) || (isPasswordMode && authSecret.trim().length >= 6)) &&
    confirmSecret === authSecret;

  function mapRegisterError(err: any) {
    const code = String(err?.code ?? '');
    if (code === 'auth/email-already-in-use') {
      return {
        title: 'Email already in use',
        message: t('auth.email_in_use_body', 'This email already has an account. Sign in instead.'),
        emailInUse: true,
      };
    }
    if (code === 'auth/invalid-email') {
      return {
        title: t('auth.invalid_email_title', 'Invalid email'),
        message: t('auth.invalid_email', 'Please enter a valid email address.'),
        emailInUse: false,
      };
    }
    if (code === 'auth/weak-password') {
      return {
        title: t('auth.weak_password_title', 'Weak password'),
        message: t('auth.weak_password_body', 'Use a stronger password with at least 6 characters.'),
        emailInUse: false,
      };
    }
    return {
      title: t('auth.register_failed', 'Registration failed'),
      message: err?.message ?? t('auth.register_failed_body', 'Unable to create your account.'),
      emailInUse: false,
    };
  }

  function generateEasyPassword() {
    const first = PASSWORD_PARTS_A[randomIndex(PASSWORD_PARTS_A.length)];
    const second = PASSWORD_PARTS_B[randomIndex(PASSWORD_PARTS_B.length)];
    const third = PASSWORD_PARTS_C[randomIndex(PASSWORD_PARTS_C.length)];
    const suffix = String(randomIndex(9000) + 1000);
    const next = `${first}+${second}=${third}${suffix}`;
    setAuthSecret(next);
    setConfirmSecret(next);
    setShowSecret(true);
  }

  async function handleGoogle() {
    setLoading(true);
    setError('');
    try {
      await signInGoogle();
      router.replace('/onboarding');
    } catch (err: any) {
      setError(err?.message ?? t('auth.google_unavailable', 'Google sign-in is not available right now.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    const identity = buildFallbackIdentity(normalizedEmail);
    const effectivePassword = isPinMode ? `leo:${authSecret}:${normalizedEmail}` : authSecret;
    const effectivePin = isPinMode ? authSecret : `9${String(authSecret.length).padStart(5, '0')}`;

    try {
      await register({
        displayName: identity.displayName,
        username: identity.username,
        email: normalizedEmail,
        password: effectivePassword,
        pin: isValidPin(effectivePin) ? effectivePin : `8${String(Date.now()).slice(-5)}`,
      });
      router.replace('/onboarding');
    } catch (err: any) {
      const mapped = mapRegisterError(err);
      setError(mapped.message);
      if (mapped.emailInUse) {
        Alert.alert(mapped.title, mapped.message, [
          { text: t('auth.sign_in', 'Sign in'), onPress: () => router.replace('/login') },
          {
            text: t('auth.forgot_password', 'Forgot password?'),
            onPress: async () => {
              try {
                await resetPassword(normalizedEmail);
                Alert.alert(t('auth.reset_sent_title', 'Reset email sent'), t('auth.reset_sent_body', 'Check your inbox to reset your password.'));
              } catch (resetError: any) {
                Alert.alert(t('auth.reset_failed_title', 'Reset failed'), resetError?.message ?? t('auth.recovery_failed', 'Could not send the recovery email.'));
              }
            },
          },
          { text: t('common.close', 'Close'), style: 'cancel' },
        ]);
      } else {
        Alert.alert(mapped.title, mapped.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <Card style={styles.card}>
            <View style={styles.headerBlock}>
              <Text style={[styles.brand, { color: colors.accent }]}>BABYFLOW</Text>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('auth.register_title', 'Create your account in one step')}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>{t('auth.register_subtitle', 'Secure, simple and designed for parents')}</Text>
              <Text style={[styles.cardNote, { color: colors.textMuted }]}>{t('auth.register_note', 'Your data stays private on your device')}</Text>
            </View>

            <Input
              label={t('auth.email', 'Email')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.email_register_placeholder', 'you@example.com')}
              keyboardType="email-address"
              textContentType="emailAddress"
            />

            <View style={[styles.authBlock, { borderColor: colors.border, backgroundColor: colors.bgCardAlt }]}>
              <View style={styles.authBlockHeader}>
                <View style={styles.authTitleWrap}>
                  <Text style={[styles.authBlockLabel, { color: colors.textMuted }]}>{t('auth.access_key', 'ACCESS KEY')}</Text>
                  <Text style={[styles.authBlockTitle, { color: colors.textPrimary }]}>{t('auth.access_key_body', 'Use a password or enter a 6-digit PIN')}</Text>
                </View>
              </View>

              <Animated.View layout={Layout.springify()} style={{ gap: 10 }}>
                <Input
                  label={t('auth.password_or_pin_register', 'Password or 6-digit PIN')}
                  value={authSecret}
                  onChangeText={(value) => setAuthSecret(value)}
                  placeholder={t('auth.password_or_pin_placeholder', 'Type a password or 123456')}
                  secureTextEntry={!showSecret}
                  textContentType="newPassword"
                  keyboardType={isPinMode ? 'number-pad' : 'default'}
                  inputMode={isPinMode ? 'numeric' : 'text'}
                  error={secretFormatError || undefined}
                  rightAccessory={
                    <Pressable onPress={() => setShowSecret((value) => !value)} hitSlop={8}>
                      <Ionicons name={showSecret ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                    </Pressable>
                  }
                />
                <Input
                  label={isPinMode ? t('auth.confirm_pin', 'Confirm PIN') : t('auth.confirm_password', 'Confirm password')}
                  value={confirmSecret}
                  onChangeText={(value) => setConfirmSecret(value)}
                  placeholder={isPinMode ? t('auth.repeat_pin', 'Repeat your PIN') : t('auth.repeat_password', 'Repeat your password')}
                  secureTextEntry={!showSecret}
                  textContentType="password"
                  keyboardType={isPinMode ? 'number-pad' : 'default'}
                  inputMode={isPinMode ? 'numeric' : 'text'}
                  error={secretMismatch || undefined}
                  rightAccessory={
                    <Pressable onPress={() => setShowSecret((value) => !value)} hitSlop={8}>
                      <Ionicons name={showSecret ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                    </Pressable>
                  }
                />
                <View style={styles.inlineRow}>
                  {!isPinMode ? (
                    <Pressable onPress={generateEasyPassword} style={styles.inlineAction}>
                      <Ionicons name="sparkles-outline" size={15} color={colors.accent} />
                      <Text style={[styles.inlineText, { color: colors.accent }]}>{t('auth.generate_password', 'Generate easy password')}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </Animated.View>
            </View>

            {error ? <Text style={{ color: colors.danger, fontSize: 12, textAlign: 'center' }}>{error}</Text> : null}

            <Button
              label={t('auth.create_account', 'Create account')}
              onPress={handleSubmit}
              loading={loading}
              disabled={!canSubmit || loading}
              size="sm"
              style={styles.ctaButton}
            />

            <View style={styles.dividerRow}>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>{t('common.or', 'or')}</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </View>

            <Button label={t('auth.continue_google', 'Continue with Google')} onPress={handleGoogle} variant="ghost" size="sm" style={styles.googleButton} />
            <Button label="Back to sign in" onPress={() => router.replace('/login')} variant="ghost" size="sm" style={styles.secondaryButton} />
          </Card>
        </View>
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingTop: 36, paddingBottom: 28, paddingHorizontal: 14 },
  container: { width: '100%', maxWidth: 430, alignSelf: 'center' },
  card: { gap: 12, paddingTop: 18, paddingBottom: 18 },
  headerBlock: { gap: 3, alignItems: 'center' },
  brand: { fontSize: 12, fontWeight: '900', letterSpacing: 3.2, textTransform: 'uppercase' },
  cardTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  cardSubtitle: { fontSize: 13, textAlign: 'center' },
  cardNote: { fontSize: 11, textAlign: 'center' },
  authBlock: {
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  authBlockHeader: { gap: 10 },
  authTitleWrap: { gap: 2 },
  authBlockLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  authBlockTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  inlineRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  inlineAction: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  inlineText: { fontSize: 12, fontWeight: '700' },
  ctaButton: { minHeight: 48 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  divider: { flex: 1, height: 1 },
  googleButton: { minHeight: 46 },
  secondaryButton: { minHeight: 42 },
});
