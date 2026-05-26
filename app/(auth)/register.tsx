import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { alertInfo } from '@/lib/confirm';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Input, Page } from '@/components/shared';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { AppLanguage } from '@/types';
import { normalizeUsername } from '@/utils/crypto';
import { BabyFlowIcon } from '@/components/system';

const LANGS: { code: AppLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Francais' },
  { code: 'es', label: 'Espanol' },
  { code: 'nl', label: 'Nederlands' },
];

export default function RegisterScreen() {
  const { language, setLanguage, t } = useLocale();
  const { register } = useAuth();

  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage>(language);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => {
    const isEmail = /\S+@\S+\.\S+/.test(email.trim());
    return displayName.trim().length >= 2 && isEmail && password.trim().length >= 6;
  }, [displayName, email, password]);

  async function commitLanguage(next: AppLanguage) {
    setSelectedLanguage(next);
    await setLanguage(next);
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      await register({
        displayName: displayName.trim(),
        username: normalizeUsername(email.split('@')[0] || displayName),
        email: email.trim(),
        password,
        pin: '000000',
      });
      router.replace('/onboarding');
    } catch (err: any) {
      const message = err?.message ?? 'Unable to register.';
      setError(message);
      alertInfo(t('auth.register_failed', 'Registration failed'), message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page scroll={false} contentStyle={styles.page}>
      <LinearGradient colors={['#07111F', '#0B1630', '#101C39']} style={StyleSheet.absoluteFill} />
      <View style={styles.card}>
        <View style={styles.brandRow}>
          <BabyFlowIcon name="people" active />
          <View>
            <Text style={styles.brand}>BabyFlow</Text>
            <Text style={styles.brandSub}>{t('auth.register_subtitle', 'Create your family account')}</Text>
          </View>
        </View>

        <Input label={t('auth.name', 'Name')} value={displayName} onChangeText={setDisplayName} placeholder={t('auth.name_placeholder', 'Your full name')} textContentType="name" autoCapitalize="words" />

        <Input label={t('auth.email', 'Email')} value={email} onChangeText={setEmail} placeholder={t('auth.email_placeholder', 'name@email.com')} textContentType="emailAddress" keyboardType="email-address" autoCapitalize="none" />

        <Input label={t('auth.password', 'Password')} value={password} onChangeText={setPassword} placeholder={t('auth.password_placeholder', 'Create a password')} secureTextEntry autoCapitalize="none" textContentType="password" hint={t('auth.password_hint', 'At least 6 characters.')} />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button label={t('auth.create_account', 'Create account')} onPress={handleSubmit} loading={loading} disabled={!canSubmit} fullWidth />
        <Button label={t('auth.back_to_signin', 'Back to sign in')} onPress={() => router.back()} variant="ghost" fullWidth />

        <View style={styles.languageSelector}>
          {LANGS.map((item) => {
            const active = item.code === selectedLanguage;
            return (
              <Pressable key={item.code} onPress={() => void commitLanguage(item.code)} style={[styles.languageButton, active && styles.languageButtonActive]}>
                <Text style={styles.languageButtonText}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(9,16,28,0.6)',
    padding: 20,
    gap: 12,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  brand: { color: '#ECF2F7', fontSize: 24, fontWeight: '800' },
  brandSub: { color: 'rgba(236,242,247,0.62)', fontSize: 12 },
  errorText: { color: '#F0959C', textAlign: 'center', fontSize: 13 },
  languageSelector: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  languageButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  languageButtonActive: { backgroundColor: 'rgba(145,215,192,0.18)', borderColor: 'rgba(145,215,192,0.48)' },
  languageButtonText: { color: '#E8F8F3', fontSize: 12, fontWeight: '600' },
});
