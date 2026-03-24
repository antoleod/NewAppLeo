import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Page, Card, Heading, Input, Button } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { language } = useLocale();
  const { signInEmail, signInGuest } = useAuth();
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
      <Heading eyebrow="Authentication" title={language === 'fr' ? 'Bon retour' : 'Welcome back'} subtitle={language === 'fr' ? "Connectez-vous ou continuez en invite." : 'Sign in with email or continue as a guest.'} />
      <Card>
        <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" textContentType="emailAddress" />
        <Input label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry textContentType="password" />

        {error ? <Text style={{ color: colors.danger, fontSize: 13, textAlign: 'center' }}>{error}</Text> : null}
        <Button label={language === 'fr' ? 'Se connecter' : 'Sign in'} onPress={handleSubmit} loading={loading} disabled={!canSubmit} fullWidth />
        <Button label={language === 'fr' ? 'Continuer en invite' : 'Continue as guest'} onPress={async () => { await signInGuest(); router.replace('/home'); }} variant="secondary" loading={loading} fullWidth />
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>
          {language === 'fr' ? "Le mode invite reste sur l'appareil et utilise uniquement le stockage local." : 'Guest mode stays on-device and uses the local dashboard only.'}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 20 }}>
          <Pressable onPress={() => router.push('/register')}>
            <Text style={{ color: colors.primary, fontWeight: '800', textAlign: 'center' }}>{language === 'fr' ? 'Creer un compte' : 'Create account'}</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/pair')}>
            <Text style={{ color: colors.primary, fontWeight: '800', textAlign: 'center' }}>{language === 'fr' ? 'Associer un appareil' : 'Pair device'}</Text>
          </Pressable>
        </View>
      </Card>
    </Page>
  );
}
