import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Page, Card, Heading, Input, Button } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { language } = useLocale();
  const { signInEmail, signInGuest } = useAuth();
  const isDesktop = width >= 1200;
  const isTablet = width >= 768;
  const cardMaxWidth = isDesktop ? 520 : isTablet ? 560 : 640;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => Boolean(email.trim() && password.trim()), [email, password]);

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

  return (
    <Page>
      <View style={[styles.shell, { maxWidth: cardMaxWidth }]}>
        <Heading eyebrow="Authentication" title={language === 'fr' ? 'Bon retour' : 'Welcome back'} subtitle={language === 'fr' ? "Connectez-vous ou continuez en invite." : 'Sign in with email or continue as a guest.'} />
        <Card style={isTablet ? styles.cardCompact : undefined}>
          <View style={styles.formStack}>
            <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" textContentType="emailAddress" />
            <Input label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry textContentType="password" />
          </View>

          {error ? <Text style={{ color: colors.danger, fontSize: 13, textAlign: 'center' }}>{error}</Text> : null}
          <View style={styles.actionStack}>
            <Button label={language === 'fr' ? 'Se connecter' : 'Sign in'} onPress={handleSubmit} loading={loading} disabled={!canSubmit} fullWidth />
            <Button label={language === 'fr' ? 'Continuer en invite' : 'Continue as guest'} onPress={async () => { await signInGuest(); router.replace('/home'); }} variant="secondary" loading={loading} fullWidth />
          </View>
          <Text style={[styles.helper, { color: colors.muted }]}>
            {language === 'fr' ? "Le mode invite reste sur l'appareil et utilise uniquement le stockage local." : 'Guest mode stays on-device and uses the local dashboard only.'}
          </Text>
          <View style={styles.linkRow}>
            <Pressable onPress={() => router.push('/register')}>
              <Text style={{ color: colors.primary, fontWeight: '800', textAlign: 'center' }}>{language === 'fr' ? 'Creer un compte' : 'Create account'}</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/pair')}>
              <Text style={{ color: colors.primary, fontWeight: '800', textAlign: 'center' }}>{language === 'fr' ? 'Associer un appareil' : 'Pair device'}</Text>
            </Pressable>
          </View>
        </Card>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  cardCompact: {
    gap: 10,
  },
  formStack: {
    gap: 8,
  },
  actionStack: {
    gap: 8,
  },
  helper: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
});
