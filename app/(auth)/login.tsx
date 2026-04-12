import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Input, Page } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { getLocalPairingSession, joinPairingSession } from '@/services/pairingService';

export default function LoginScreen() {
  const { theme } = useTheme();
  const { language } = useLocale();
  const { signInEmail, signInGuest, signInGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => Boolean(email.trim() && password.trim()), [email, password]);
  const canSubmitPairing = useMemo(() => Boolean(pairingCode.trim()), [pairingCode]);

  async function handleSignIn() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError('');
    try {
      await signInEmail({ email: email.trim(), password });
      router.replace('/home');
    } catch (err: any) {
      const message = err?.message ?? 'Unable to sign in.';
      setError(message);
      Alert.alert('Login failed', message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePairing() {
    if (!canSubmitPairing || loading) return;
    setLoading(true);
    setError('');
    try {
      const session = await getLocalPairingSession();
      if (!session || session.code !== pairingCode.trim()) {
        await joinPairingSession(pairingCode.trim(), 'anonymous');
      } else {
        await joinPairingSession(session.code, 'anonymous');
      }
      router.push('/pair');
    } catch (err: any) {
      const message = err?.message ?? 'Unable to open pairing.';
      setError(message);
      Alert.alert('Pairing failed', message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        void handleSignIn();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canSubmit, email, password, loading]);

  return (
    <Page scroll={false}>
      <View style={styles.shell}>
        <View style={styles.glowA} />
        <View style={styles.glowB} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Text style={[styles.kicker, { color: theme.accent }]}>APP LEO</Text>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {language === 'fr' ? 'Un espace calme pour suivre votre bebe.' : 'A calm space to track your baby.'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              {language === 'fr'
                ? 'Connectez-vous avec votre compte Firebase. Le pairing va aparte.'
                : 'Sign in with your Firebase account. Pairing stays separate.'}
            </Text>
          </View>

          <View style={styles.grid}>
            <Card style={styles.loginCard}>
              <View style={styles.sectionHead}>
                <View style={[styles.badge, { backgroundColor: `${theme.accent}18` }]}>
                  <Ionicons name="log-in-outline" size={16} color={theme.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Sign in</Text>
                  <Text style={[styles.sectionBody, { color: theme.textMuted }]}>Use your email and password.</Text>
                </View>
              </View>

              <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" textContentType="emailAddress" />
              <Input label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry textContentType="password" />
              {error ? <Text style={[styles.error, { color: theme.red }]}>{error}</Text> : null}
              <Button label={loading ? '...' : 'Sign in'} onPress={() => void handleSignIn()} loading={loading} disabled={!canSubmit} fullWidth />
              {Platform.OS === 'web' ? (
                <Button
                  label="Sign in with Google"
                  onPress={async () => {
                    setLoading(true);
                    setError('');
                    try {
                      await signInGoogle();
                      router.replace('/home');
                    } catch (err: any) {
                      const message = err?.message ?? 'Unable to sign in with Google.';
                      setError(message);
                      Alert.alert('Google sign-in failed', message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  variant="secondary"
                  fullWidth
                />
              ) : null}
              <Text style={[styles.hint, { color: theme.textMuted }]}>Tip: press `Ctrl + Enter` to sign in.</Text>
            </Card>

            <Card style={styles.sideCard}>
              <View style={styles.sectionHead}>
              <View style={[styles.badge, { backgroundColor: `${theme.accent}18` }]}>
                  <Ionicons name="people-outline" size={16} color={theme.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Pairing</Text>
                  <Text style={[styles.sectionBody, { color: theme.textMuted }]}>Open pairing in its own flow.</Text>
                </View>
              </View>

              <Input label="Pairing code" value={pairingCode} onChangeText={setPairingCode} placeholder="123456" keyboardType="numeric" inputMode="numeric" />
              <Button label={loading ? '...' : 'Use code'} onPress={() => void handlePairing()} variant="secondary" disabled={!canSubmitPairing} fullWidth />
              <View style={styles.divider} />
              <Button label={language === 'fr' ? 'Continuer invite' : 'Continue as guest'} onPress={async () => { await signInGuest(); router.replace('/home'); }} variant="ghost" fullWidth />
              <Button label="Create account" onPress={() => router.push('/register')} variant="ghost" fullWidth />
            </Card>
          </View>

          <View style={styles.footerRow}>
            <Pressable onPress={() => router.push('/pair')} style={[styles.pairLink, { borderColor: theme.border, backgroundColor: theme.bgCard }]}>
              <Ionicons name="link-outline" size={16} color={theme.accent} />
              <Text style={{ color: theme.textPrimary, fontWeight: '800' }}>Open pairing</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, overflow: 'hidden' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 18, gap: 16 },
  hero: { maxWidth: 760, alignSelf: 'center', gap: 10, marginBottom: 4 },
  kicker: { fontSize: 11, fontWeight: '900', letterSpacing: 2.6, textTransform: 'uppercase' },
  title: { fontSize: 36, lineHeight: 42, fontWeight: '900', letterSpacing: -0.6 },
  subtitle: { fontSize: 16, lineHeight: 24, maxWidth: 620 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' },
  loginCard: { flex: 1, minWidth: 320, maxWidth: 560, gap: 12, borderRadius: 28, padding: 20 },
  sideCard: { flex: 1, minWidth: 290, maxWidth: 420, gap: 12, borderRadius: 28, padding: 20 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '900' },
  sectionBody: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  hint: { fontSize: 12, textAlign: 'center' },
  error: { fontSize: 13, textAlign: 'center', fontWeight: '700' },
  divider: { height: 1, opacity: 0.14, backgroundColor: '#fff' },
  footerRow: { alignItems: 'center', paddingTop: 4 },
  pairLink: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12 },
  glowA: { position: 'absolute', top: -90, right: -90, width: 260, height: 260, borderRadius: 999, backgroundColor: 'rgba(89, 141, 125, 0.22)' },
  glowB: { position: 'absolute', bottom: -110, left: -100, width: 280, height: 280, borderRadius: 999, backgroundColor: 'rgba(201, 162, 39, 0.14)' },
});
