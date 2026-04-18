import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Heading, Input, Page } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { isValidPin, normalizeUsername } from '@/utils/crypto';

export default function RegisterScreen() {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { language } = useLocale();
  const { register } = useAuth();
  const isDesktop = width >= 1200;
  const isTablet = width >= 768;
  const cardMaxWidth = isDesktop ? 560 : isTablet ? 600 : 680;
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizedUsername = useMemo(() => normalizeUsername(username), [username]);
  const usernameError = username && !normalizedUsername ? 'Use letters, numbers, dots, dashes, or underscores.' : '';
  const pinError = pin && !isValidPin(pin) ? 'PIN must be 6 to 12 digits.' : '';
  const canSubmit =
    displayName.trim() &&
    normalizedUsername &&
    email.trim() &&
    password.trim().length >= 6 &&
    isValidPin(pin) &&
    !usernameError &&
    !pinError;

  function mapRegisterError(err: any) {
    const code = String(err?.code ?? '');
    if (code === 'auth/email-already-in-use') {
      return {
        title: 'Email already in use',
        message: 'This email is already registered. Use Sign in with your password.',
        emailInUse: true,
      };
    }
    if (code === 'auth/invalid-email') {
      return {
        title: 'Invalid email',
        message: 'Please enter a valid email address.',
        emailInUse: false,
      };
    }
    if (code === 'auth/weak-password') {
      return {
        title: 'Weak password',
        message: 'Use a stronger password (minimum 6 characters).',
        emailInUse: false,
      };
    }
    return {
      title: 'Registration failed',
      message: err?.message ?? 'Unable to register.',
      emailInUse: false,
    };
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      await register({
        displayName,
        username: normalizedUsername,
        email,
        password,
        pin,
      });
      router.replace('/onboarding');
    } catch (err: any) {
      const mapped = mapRegisterError(err);
      setError(mapped.message);
      if (mapped.emailInUse) {
        Alert.alert(
          mapped.title,
          mapped.message,
          [
            { text: 'Go to sign in', onPress: () => router.replace('/login') },
            { text: 'Close', style: 'cancel' },
          ],
        );
      } else {
        Alert.alert(mapped.title, mapped.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <View style={[styles.shell, { maxWidth: cardMaxWidth }]}>
        <Heading eyebrow="Get started" title={language === 'fr' ? 'Creer un compte' : 'Create an account'} subtitle={language === 'fr' ? 'Un seul compte suffit pour le foyer.' : 'One account supports both login modes.'} />
        <Card style={isTablet ? styles.cardCompact : undefined}>
          <View style={styles.formStack}>
            <Input label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="Andrea" textContentType="name" />
            <Input
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="andrea.leo"
              error={usernameError || undefined}
            />
            <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" textContentType="emailAddress" />
            <Input label="Password" value={password} onChangeText={setPassword} placeholder="Create a password" secureTextEntry textContentType="newPassword" />
            <Input
              label="6-digit PIN"
              value={pin}
              onChangeText={setPin}
              placeholder="6-digit PIN"
              secureTextEntry
              keyboardType="numeric"
              inputMode="numeric"
              error={pinError || undefined}
            />
          </View>
          <Text style={[styles.helper, { color: colors.muted }]}>
            PIN sign-in remains available, but email and password are the default path.
          </Text>
          {error ? <Text style={{ color: colors.danger, fontSize: 13, textAlign: 'center' }}>{error}</Text> : null}
          <View style={styles.actionStack}>
            <Button label="Create account" onPress={handleSubmit} loading={loading} disabled={!canSubmit} fullWidth />
            <Button label="Pair device" onPress={() => router.push('/pair')} variant="ghost" fullWidth />
            <Button label="Back to sign in" onPress={() => router.back()} variant="ghost" fullWidth />
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
});
