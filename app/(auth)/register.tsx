import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View, useWindowDimensions, Modal, FlatList, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Heading, Input, Page } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { isValidPin, normalizeUsername } from '@/utils/crypto';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Localization from 'expo-localization';

const COUNTRY_CALLING_CODES: Record<string, string> = {
  BE: '+32', ES: '+34', US: '+1', FR: '+33', NL: '+31',
  MX: '+52', AR: '+54', CO: '+57', CL: '+56', PE: '+51',
  BR: '+55', IT: '+39', DE: '+49', GB: '+44', CA: '+1',
  UY: '+598', PY: '+595', BO: '+591', EC: '+593', VE: '+58'
};

const generatePassphrase = () => {
  const words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const idx1 = Math.floor(Math.random() * words.length);
  const idx2 = Math.floor(Math.random() * words.length);
  const sum = (idx1 + 1) + (idx2 + 1);
  const sumWord = words[sum - 1] || sum.toString();
  return `${words[idx1]}+${words[idx2]}=${sumWord}`;
};

const getPasswordStrength = (pwd: string) => {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (pwd.includes('+') && pwd.includes('=')) score = Math.max(score, 3);
  return Math.min(score, 4);
};

const STRENGTH_COLORS = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759'];

export default function RegisterScreen() {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { language } = useLocale();
  const { register } = useAuth();
  const isDesktop = width >= 1280;
  const uiScale = isDesktop ? 0.8 : 1.0;
  const isTablet = width >= 768;
  const cardMaxWidth = isDesktop ? 420 : isTablet ? 500 : '100%';
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEmailOrPhone = /\S+@\S+\.\S+/.test(email.trim()) || /^\+?[0-9]{7,15}$/.test(email.trim());

  const [selectedRegion, setSelectedRegion] = useState(Localization.getLocales()[0]?.regionCode || 'BE');
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const { phonePlaceholder, countryFlag } = useMemo(() => {
    const code = COUNTRY_CALLING_CODES[selectedRegion] || '+32';
    const flag = selectedRegion.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
    return {
      phonePlaceholder: `you@example.com or ${code}12345678`,
      countryFlag: flag
    };
  }, [selectedRegion]);

  const canSubmit =
    displayName.trim().length >= 2 &&
    isEmailOrPhone &&
    password.trim().length >= 6;

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
        username: normalizeUsername(email.split('@')[0]),
        email,
        password,
        pin: '000000',
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
            { text: 'Go to sign in', onPress: () => router.replace('/') },
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
      <View style={[styles.shell, { maxWidth: cardMaxWidth, gap: 10 * uiScale }]}>
        <Heading eyebrow="Get started" title={language === 'fr' ? 'Creer un compte' : 'Create an account'} subtitle={language === 'fr' ? 'Un seul compte suffit pour le foyer.' : 'One account supports both login modes.'} />
        <Card style={isTablet ? [styles.cardCompact, { gap: 10 * uiScale }] : undefined}>
          <View style={[styles.formStack, { gap: 8 * uiScale }]}>
            <Input label="Name" value={displayName} onChangeText={setDisplayName} placeholder="Your full name" textContentType="name" />
            <Input 
              label="Email or Phone" 
              value={email} 
              onChangeText={setEmail} 
              placeholder={phonePlaceholder} 
              iconName={countryFlag}
              isPulsing={showCountryPicker}
              onIconPress={() => setShowCountryPicker(true)}
            />
            <Input 
              label="Password or PIN" 
              value={password} 
              onChangeText={setPassword} 
              placeholder="Create a password" 
              secureTextEntry 
              onRightAction={() => {
                setPassword(generatePassphrase());
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
              rightActionIcon="sparkles"
            />
          </View>
          {password.length > 0 && (
            <View style={{ height: 4 * uiScale, backgroundColor: colors.backgroundAlt, borderRadius: 2 * uiScale, marginTop: -4 * uiScale, overflow: 'hidden' }}>
              <View 
                style={{ 
                  height: '100%', 
                  width: `${(getPasswordStrength(password) / 4) * 100}%`, 
                  backgroundColor: STRENGTH_COLORS[getPasswordStrength(password) - 1] || 'transparent' 
                }} 
              />
            </View>
          )}
          {password.length > 0 && password.length < 6 && (
            <Text style={{ color: colors.danger, fontSize: 11 * uiScale, marginLeft: 4 * uiScale, marginTop: -4 * uiScale }}>
              {language === 'es' ? 'Mínimo 6 caracteres o números' : 'Minimum 6 characters or numbers'}
            </Text>
          )}
          <Text style={[styles.helper, { color: colors.muted, fontSize: 12 * uiScale, lineHeight: 17 * uiScale }]}>
            PIN sign-in remains available, but email and password are the default path.
          </Text>
          {error ? <Text style={{ color: colors.danger, fontSize: 13 * uiScale, textAlign: 'center' }}>{error}</Text> : null}
          <View style={[styles.actionStack, { gap: 8 * uiScale }]}>
            <Button label="Create account" onPress={handleSubmit} loading={loading} disabled={!canSubmit} fullWidth />
            <Button label="Pair device" onPress={() => router.push('/pair')} variant="ghost" fullWidth />
            <Button label="Back to sign in" onPress={() => router.back()} variant="ghost" fullWidth />
          </View>
        </Card>
      </View>

      <Modal visible={showCountryPicker} animationType="slide" transparent={true} onRequestClose={() => setShowCountryPicker(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Select Country</Text>
              <Pressable onPress={() => setShowCountryPicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            <FlatList
              data={Object.keys(COUNTRY_CALLING_CODES)}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const flag = item.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
                return (
                  <Pressable 
                    onPress={() => {
                      setSelectedRegion(item);
                      setShowCountryPicker(false);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
                  >
                    <Text style={{ fontSize: 24, marginRight: 15 }}>{flag}</Text>
                    <Text style={{ fontSize: 16, color: colors.text, flex: 1 }}>{item}</Text>
                    <Text style={{ fontSize: 16, color: colors.muted }}>{COUNTRY_CALLING_CODES[item]}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
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
