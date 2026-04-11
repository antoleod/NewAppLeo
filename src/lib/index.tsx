import { Redirect, router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, LayoutAnimation, UIManager, Animated, Vibration, Alert } from 'react-native';
import { Button, Card, Page } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLocale } from '@/context/LocaleContext';
import { useMemo, useState, useEffect, useRef } from 'react';
import { translate } from '@/lib/translations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

// Habilitar LayoutAnimation en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type AuthView = 'landing' | 'login' | 'signup' | 'forgot';

export default function IndexRoute() {
  const { loading, user, profile, guestMode, signInGuest, signInEmail, signUpEmail, resetPassword, signOut } = useAuth();
  const { colors, gradients, themeVariant } = useTheme();
  const { language } = useLocale();
  
  const [view, setView] = useState<AuthView>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

  // Animación de entrada (Fade In)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // Animación de sacudida (Shake)
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const headline = useMemo(() => {
    return translate(language, 'login.welcome');
  }, [language]);

  // Lógica de fortaleza de contraseña
  const passwordStrength = useMemo(() => {
    if (password.length === 0) return 0;
    if (password.length < 6) return 1;
    const hasNumbers = /\d/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    if (hasNumbers && hasUpper && password.length >= 8) return 3;
    return 2;
  }, [password]);

  const strengthColor = ['#E0E0E0', '#FF3B30', '#FF9500', '#4CD964'][passwordStrength];
  const strengthLabel = ['', 'auth.password_weak', 'auth.password_fair', 'auth.password_strong'][passwordStrength];

  // Verificar biometría al montar
  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsBiometricAvailable(compatible);
    })();
  }, []);

  // Cargar email recordado al montar
  useEffect(() => {
    const loadSavedEmail = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem('saved_email');
        if (savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
        }
      } catch (e) {}
    };
    loadSavedEmail();
  }, []);

  const triggerShake = () => {
    Vibration.vibrate(100);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
    setMessage(''); setConnectionError(false); setPassword('');
  }, [view]);

  const getErrorMessage = (error: any) => {
    const code = error.code?.replace('auth/', '').replace(/-/g, '_');
    const translationKey = `auth.error_${code}`;
    const translated = translate(language, translationKey);
    
    // Si no hay traducción específica, devolver el mensaje original o uno genérico
    return translated === translationKey ? error.message : translated;
  };

  const handleBiometricAuth = async () => {
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      setMessage('No se encontraron datos biométricos registrados.');
      return;
    }

    setBiometricLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: translate(language, 'auth.biometrics_button'),
        fallbackLabel: translate(language, 'auth.password'),
      });

      if (result.success) {
        const savedPassword = await SecureStore.getItemAsync('saved_password');
        if (email && savedPassword) {
          await signInEmail(email, savedPassword);
        } else {
          setMessage('No se encontró información de acceso segura.');
        }
      }
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleFullSignOut = async () => {
    Alert.alert(
      translate(language, 'auth.sign_out_all'),
      translate(language, 'auth.sign_out_confirm'),
      [
        { text: translate(language, 'history.cancel'), style: 'cancel' },
        { 
          text: translate(language, 'history.delete'), 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            await AsyncStorage.removeItem('saved_email');
            await SecureStore.deleteItemAsync('saved_password');
            setView('landing');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <Page scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>{translate(language, 'login.connection_checking')}</Text>
        </View>
      </Page>
    );
  }

  if (user || guestMode) {
    if (!profile?.hasCompletedOnboarding) return <Redirect href="/onboarding" />;
    return <Redirect href="/home" />;
  }

  const transitionView = (nextView: AuthView) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setView(nextView);
  };

  const renderForm = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.formContainer}>
      <Text style={[styles.formTitle, { color: colors.text }]}>
        {translate(language, view === 'login' ? 'login.has_account' : view === 'signup' ? 'auth.sign_up' : 'auth.forgot_password')}
      </Text>
      
      <TextInput
        style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.text, borderColor: colors.border }]}
        placeholder={translate(language, 'auth.email')}
        placeholderTextColor={colors.muted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      {(view === 'login' || view === 'signup') && (
        <View style={styles.passwordWrapper}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundAlt, color: colors.text, borderColor: colors.border, flex: 1 }]}
            placeholder={translate(language, 'auth.password')}
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <Text style={{ fontSize: 18 }}>{showPassword ? '👁️' : '🔒'}</Text>
          </Pressable>
        </View>
      )}

      {view === 'login' && (
        <Pressable 
          onPress={() => setRememberMe(!rememberMe)} 
          style={styles.rememberMeRow}
        >
          <View style={[styles.checkbox, { borderColor: colors.border, backgroundColor: rememberMe ? colors.primary : 'transparent' }]} />
          <Text style={{ color: colors.muted, fontSize: 14 }}>{translate(language, 'auth.remember_me')}</Text>
        </Pressable>
      )}

      {view === 'signup' && password.length > 0 && (
        <View style={styles.strengthWrapper}>
          <View style={styles.strengthBarContainer}>
            <Animated.View style={[styles.strengthBar, { width: `${(passwordStrength / 3) * 100}%`, backgroundColor: strengthColor }]} />
          </View>
          <Text style={[styles.strengthText, { color: strengthColor }]}>
            {translate(language, strengthLabel)}
          </Text>
        </View>
      )}

      {view === 'login' && isBiometricAvailable && email.length > 0 && (
        <Pressable 
          onPress={handleBiometricAuth}
          disabled={biometricLoading || authLoading}
          style={[styles.biometricBtn, { borderColor: colors.primary + '40' }]}
        >
          {biometricLoading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={{ fontSize: 24 }}>{Platform.OS === 'ios' ? '👤' : '🖐️'}</Text>
          )}
          <Text style={[styles.biometricText, { color: colors.primary }]}>
            {biometricLoading ? '...' : translate(language, 'auth.biometrics_button')}
          </Text>
        </Pressable>
      )}

      {message ? <Text style={styles.infoText}>{message}</Text> : null}

      <Button
        label={authLoading ? '...' : translate(language, view === 'login' ? 'tabs.profile' : view === 'signup' ? 'auth.register' : 'auth.send_recovery')}
        onPress={async () => {
          setAuthLoading(true);
          try {
            if (view === 'login') {
              await signInEmail(email, password);
              if (rememberMe) {
                await AsyncStorage.setItem('saved_email', email);
                await SecureStore.setItemAsync('saved_password', password);
              } else {
                await AsyncStorage.removeItem('saved_email');
                await SecureStore.deleteItemAsync('saved_password');
              }
            } else if (view === 'signup') {
              await signUpEmail(email, password);
            } else {
              await resetPassword(email);
              setMessage(translate(language, 'auth.recovery_sent'));
            }
          } catch (e: any) {
            triggerShake();
            setConnectionError(true);
            setMessage(getErrorMessage(e));
          } finally {
            setAuthLoading(false);
          }
        }}
        style={{ borderRadius: 24, marginTop: 10 }}
      />

      <Pressable onPress={() => transitionView('landing')} style={styles.backButton}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>{translate(language, 'auth.back')}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );

  return (
    <Page>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: shakeAnim }], flex: 1 }}>
        {view === 'landing' ? (
          <>
            <Card style={{ gap: 24, padding: 24, borderRadius: 32 }}>
              <View style={{ alignItems: 'center', gap: 10 }}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase', textAlign: 'center' }}>
                  App Leo
                </Text>
                <Text style={{ color: colors.text, fontSize: 32, fontWeight: '900', lineHeight: 38, textAlign: 'center' }}>{headline}</Text>
                <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 24, textAlign: 'center', paddingHorizontal: 10 }}>
                  {translate(language, 'login.tagline')}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                {['Simple', 'Privado', 'Compartido', 'Sin anuncios'].map((item) => (
                  <View
                    key={item}
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderWidth: 1,
                      borderColor: colors.primary + '20',
                      backgroundColor: colors.primary + '08',
                    }}
                  >
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>{item}</Text>
                  </View>
                ))}
              </View>

              <Button
                label={translate(language, 'login.guest_btn')}
                onPress={async () => {
                  try {
                    await signInGuest();
                    router.replace('/home');
                  } catch (e) {
                    setConnectionError(true);
                  }
                }}
                style={{ height: 64, borderRadius: 24 }}
              />
              
              <View style={styles.authLinks}>
                <Pressable onPress={() => transitionView('login')} style={styles.link}>
                  <Text style={[styles.linkText, { color: colors.primary }]}>{translate(language, 'login.has_account')}</Text>
                </Pressable>
                <View style={{ width: 1, height: 14, backgroundColor: colors.border }} />
                <Pressable onPress={() => transitionView('signup')} style={styles.link}>
                  <Text style={[styles.linkText, { color: colors.primary }]}>{translate(language, 'auth.sign_up')}</Text>
                </Pressable>
              </View>

              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>
                {translate(language, 'login.privacy_note')}
              </Text>
            </Card>
            <Card
              style={{
                backgroundColor: gradients.hero[0],
                borderColor: 'transparent',
                marginTop: 20,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'center' }}>Built for families, shared with love.</Text>
            </Card>
          </>
        ) : renderForm()}
      </Animated.View>
    </Page>
  );
}

const styles = StyleSheet.create({
  formContainer: { gap: 16, paddingTop: 40 },
  formTitle: { fontSize: 24, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  input: { height: 56, borderRadius: 16, paddingHorizontal: 16, fontSize: 16, borderWidth: 1 },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center' },
  eyeIcon: { position: 'absolute', right: 16, padding: 8 },
  strengthWrapper: { marginTop: -8, marginBottom: 8, gap: 4 },
  strengthBarContainer: { height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, overflow: 'hidden' },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  biometricText: { fontWeight: '700', fontSize: 14 },
  rememberMeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  strengthBar: { height: '100%' },
  strengthText: { fontSize: 11, fontWeight: '700', textAlign: 'right' },
  infoText: { textAlign: 'center', fontSize: 14, color: '#FF3B30', paddingHorizontal: 20 },
  backButton: { alignItems: 'center', padding: 16 },
  authLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 15, marginTop: 10 },
  link: { paddingVertical: 8 },
  linkText: { fontWeight: '700', fontSize: 14 },
});
