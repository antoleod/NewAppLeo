import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const { signInEmail, signInGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);

  const canSubmit = useMemo(() => Boolean(email.trim() && password.trim()), [email, password]);
  const canSubmitToken = useMemo(() => Boolean(token.trim()), [token]);

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      await signInEmail({ email, password });
      router.replace('/home');
    } catch (err: any) {
      const message = err?.message ?? 'Unable to sign in.';
      setError(message);
      Alert.alert('Login failed', message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTokenLogin() {
    setLoading(true);
    setError('');
    try {
      const session = await getLocalPairingSession();
      if (!session || session.code !== token.trim()) {
        throw new Error('Invalid token');
      }
      await joinPairingSession(token.trim(), 'anonymous');
      router.replace('/home');
    } catch (err: any) {
      const message = err?.message ?? 'Unable to sign in.';
      setError(message);
      Alert.alert('Login failed', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page scroll={false}>
      <View style={styles.shell}>
        <View style={styles.ambientA} />
        <View style={styles.ambientB} />

        <View style={styles.hero}>
          <Text style={[styles.kicker, { color: theme.accent }]}>APP LEO</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {language === 'fr' ? 'Un espace serein pour suivre votre bebe.' : 'A calm space to track your baby.'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {language === 'fr'
              ? "Connectez-vous dans une fenetre claire. Le mode invite reste sur l'appareil."
              : 'Sign in in a focused modal. Guest mode stays on-device.'}
          </Text>

          <View style={styles.quickActions}>
            <Button
              label={language === 'fr' ? 'Continuer invite' : 'Continue as guest'}
              onPress={async () => {
                await signInGuest();
                router.replace('/home');
              }}
              variant="secondary"
            />
            <Button
              label={language === 'fr' ? 'Iniciar sesion' : 'Sign in'}
              onPress={() => setShowLoginModal(true)}
            />
            <Button
              label={language === 'fr' ? 'Vincular dispositivo' : 'Pair device'}
              onPress={() => router.push('/pair')}
              variant="ghost"
            />
            <Button
              label={language === 'fr' ? 'Crear cuenta' : 'Create account'}
              onPress={() => router.push('/register')}
              variant="ghost"
            />
          </View>

          <View style={styles.featureRow}>
            <Feature icon="lock-closed-outline" title={language === 'fr' ? 'Privado' : 'Private'} body={language === 'fr' ? 'Sesion simple y segura.' : 'Simple and secure sign-in.'} />
            <Feature icon="phone-portrait-outline" title={language === 'fr' ? 'Rapide' : 'Fast'} body={language === 'fr' ? 'Un modal centrad y fluido.' : 'Centered modal, less clutter.'} />
            <Feature icon="people-outline" title={language === 'fr' ? 'Partage' : 'Shared'} body={language === 'fr' ? 'Liaison d appareil en un clic.' : 'Pairing flows stay nearby.'} />
          </View>
        </View>
      </View>

      <Modal visible={showLoginModal} transparent animationType="fade" onRequestClose={() => setShowLoginModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowLoginModal(false)} />
          <View style={[styles.modalCard, { borderColor: theme.border, backgroundColor: theme.bgCard }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{language === 'fr' ? 'Iniciar sesion' : 'Sign in'}</Text>
                <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
                  {language === 'fr' ? 'Elige correo o codigo de enlace.' : 'Choose email or pairing code.'}
                </Text>
              </View>
              <Pressable onPress={() => setShowLoginModal(false)} style={({ pressed }) => [styles.closeButton, { borderColor: theme.border, opacity: pressed ? 0.8 : 1 }]}>
                <Ionicons name="close" size={18} color={theme.textPrimary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              <Card style={styles.sectionCard}>
                <Input
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
                <Input
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  secureTextEntry
                  textContentType="password"
                />
                {error ? <Text style={[styles.errorText, { color: theme.red }]}>{error}</Text> : null}
                <Button label={language === 'fr' ? 'Iniciar sesion' : 'Sign in'} onPress={handleSubmit} loading={loading} disabled={!canSubmit} />
              </Card>

              <Card style={styles.sectionCard}>
                <Input
                  label={language === 'fr' ? 'Code de liaison' : 'Pairing code'}
                  value={token}
                  onChangeText={setToken}
                  placeholder="123456"
                  keyboardType="numeric"
                  inputMode="numeric"
                />
                <Button
                  label={language === 'fr' ? 'Usar codigo' : 'Use code'}
                  onPress={() => void handleTokenLogin()}
                  variant="secondary"
                  loading={loading}
                  disabled={!canSubmitToken}
                />
              </Card>

              <Button
                label={language === 'fr' ? 'Continuer comme invite' : 'Continue as guest'}
                onPress={async () => {
                  await signInGuest();
                  router.replace('/home');
                }}
                variant="ghost"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Page>
  );
}

function Feature({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.featureCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
      <View style={[styles.featureIcon, { backgroundColor: `${theme.accent}18`, borderColor: `${theme.accent}30` }]}>
        <Ionicons name={icon} size={18} color={theme.accent} />
      </View>
      <Text style={[styles.featureTitle, { color: theme.textPrimary }]}>{title}</Text>
      <Text style={[styles.featureBody, { color: theme.textMuted }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 24,
    overflow: 'hidden',
  },
  hero: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    gap: 18,
    padding: 26,
    borderRadius: 28,
    backgroundColor: 'rgba(15, 19, 26, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 6,
  },
  ambientA: {
    position: 'absolute',
    top: -90,
    right: -90,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(89, 141, 125, 0.25)',
  },
  ambientB: {
    position: 'absolute',
    bottom: -110,
    left: -100,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: 'rgba(201, 162, 39, 0.14)',
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 620,
  },
  quickActions: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  featureCard: {
    flexBasis: '31%',
    minWidth: 180,
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    gap: 8,
  },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  featureBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    maxHeight: '88%',
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    gap: 12,
    paddingBottom: 8,
  },
  sectionCard: {
    gap: 12,
    borderRadius: 22,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
