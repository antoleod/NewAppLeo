import { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Page, Card, Heading, Input, Button, Segment } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { signInEmail, signInUsernamePin } = useAuth();
  const [mode, setMode] = useState<'email' | 'username'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => {
    return mode === 'email' ? email.trim() && password.trim() : username.trim() && pin.trim();
  }, [email, mode, password, pin, username]);

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      if (mode === 'email') {
        await signInEmail({ email, password });
      } else {
        await signInUsernamePin({ username, pin });
      }
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
      <Heading
        eyebrow="Authentication"
        title="Welcome back"
        subtitle="Use email/password or username/PIN to sign in."
      />
      <Card>
        <Segment
          value={mode}
          onChange={(value) => setMode(value as 'email' | 'username')}
          options={[
            { label: 'Email', value: 'email' },
            { label: 'Username + PIN', value: 'username' },
          ]}
        />

        {mode === 'email' ? (
          <>
            <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" textContentType="emailAddress" />
            <Input label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry textContentType="password" />
          </>
        ) : (
          <>
            <Input label="Username" value={username} onChangeText={setUsername} placeholder="your-username" />
            <Input label="PIN" value={pin} onChangeText={setPin} placeholder="6-digit PIN" secureTextEntry keyboardType="numeric" inputMode="numeric" />
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
              The app resolves your username in Firestore, decrypts the stored credential with your PIN, and then signs into Firebase Auth.
            </Text>
          </>
        )}

        {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
        <Button label="Sign in" onPress={handleSubmit} loading={loading} fullWidth />
        <Button label="Create account" onPress={() => router.push('/register')} variant="ghost" fullWidth />
      </Card>
    </Page>
  );
}
