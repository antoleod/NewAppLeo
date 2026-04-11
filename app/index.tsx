import { Redirect, router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, LayoutAnimation, UIManager, Animated } from 'react-native';
import { Button, Card, Page } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLocale } from '@/context/LocaleContext';
import { useMemo, useState, useEffect, useRef } from 'react';
import { translate } from '@/lib/translations';
import * as Localization from 'expo-localization';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

// Habilitar LayoutAnimation en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type AuthView = 'landing' | 'login' | 'signup' | 'forgot' | 'walkthrough';

export default function IndexRoute() {
  const { loading, user, profile, guestMode, signInGuest, signInEmail, signUpEmail, resetPassword } = useAuth();
  const { colors, gradients, themeVariant } = useTheme();
  const { language, setLanguage } = useLocale();
  
  const [view, setView] = useState<AuthView>('landing');
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Animación de entrada (Fade In)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // Animación de fondo sutil
  const bgAnim = useRef(new Animated.Value(0)).current;

  // Animaciones de rebote (escala) para cada bandera
  const flagScales = useRef([
    new Animated.Value(1), // fr
    new Animated.Value(1), // es
    new Animated.Value(1), // en
    new Animated.Value(1), // nl
  ]).current;

  // Detección de Día/Noche
  const isNight = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 6 || hour >= 19;
  }, []);

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

  const supportedLangs = useMemo(() => [
    { code: 'fr', flag: '🇫🇷' },
    { code: 'es', flag: '🇪🇸' },
    { code: 'en', flag: '🇬🇧' },
    { code: 'nl', flag: '🇳🇱' },
  ] as const, []);

  // Interpolación de colores para el fondo
  const backgroundColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: isNight 
      ? ['#121416', '#1A1C1E']
      : ['#FDFCFB', '#F5F7FF']
  });

  // Efecto inicial: Carga de Onboarding y Animación de entrada
  useEffect(() => {
    AsyncStorage.getItem('appleo.has_seen_walkthrough').then(val => {
      if (!val) {
        setView('walkthrough');
        const systemLang = Localization.getLocales()[0]?.languageCode || 'fr';
        const detected = supportedLangs.some(l => l.code === systemLang) ? systemLang : 'fr';
        setLanguage(detected as any);
      }
    });

    Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }).start();
  }, []);

  // Limpiar mensajes y resetear animaciones al cambiar de vista
  useEffect(() => {
    setMessage(''); 
    setConnectionError(false); 
    setPassword('');
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    // Loop de pulsación de fondo
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnim, { toValue: 1, duration: 8000, useNativeDriver: false }),
        Animated.timing(bgAnim, { toValue: 0, duration: 8000, useNativeDriver: false }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [view]);

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

      {message ? <Text style={styles.infoText}>{message}</Text> : null}

      <Button
        label={authLoading ? '...' : translate(language, view === 'login' ? 'tabs.profile' : view === 'signup' ? 'auth.register' : 'auth.send_recovery')}
        onPress={async () => {
          setAuthLoading(true);
          try {
            if (view === 'login') {
              await signInEmail(email, password);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            else if (view === 'signup') {
              await signUpEmail(email, password);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            else {
              await resetPassword(email);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setMessage(translate(language, 'auth.recovery_sent'));
            }
          } catch (e: any) {
            setConnectionError(true);
            setMessage(e.message);
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

  const renderWalkthrough = () => (
    <View style={styles.walkthroughContainer}>
      {/* Barra de Progreso */}
      <View style={styles.progressContainer}>
        {[0, 1].map((step) => (
          <View 
            key={step} 
            style={[
              styles.progressBar, 
              { backgroundColor: walkthroughStep >= step ? colors.primary : colors.border + '40' }
            ]} 
          />
        ))}
      </View>

      {walkthroughStep === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', gap: 32 }}>
          <Text style={[styles.formTitle, { color: colors.text }]}>Choisissez votre langue</Text>
          <View style={styles.languageSelector}>
            {supportedLangs.map((lang, index) => (
              <Pressable
                key={lang.code}
                onPress={() => {
                  setLanguage(lang.code);
                  playPopSound();
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  // Animación de rebote
                  Animated.sequence([
                    Animated.spring(flagScales[index], { toValue: 1.4, useNativeDriver: true, friction: 3, tension: 40 }),
                    Animated.spring(flagScales[index], { toValue: 1, useNativeDriver: true, friction: 3, tension: 40 }),
                  ]).start();
                }}
                style={[
                  styles.langButton,
                  language === lang.code && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                ]}
              >
                <Animated.View style={{ transform: [{ scale: flagScales[index] }] }}>
                  <Text style={{ fontSize: 32 }}>{lang.flag}</Text>
                </Animated.View>
                <Text style={[styles.langCode, { color: language === lang.code ? colors.primary : colors.muted }]}>
                  {lang.code.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
          <Button label="Suivant" onPress={() => { LayoutAnimation.easeInEaseOut(); setWalkthroughStep(1); }} />
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', gap: 40 }}>
          <View style={styles.walkthroughHeader}>
            <Text style={styles.walkthroughEmoji}>✨</Text>
            <Text style={[styles.formTitle, { color: colors.text }]}>{translate(language, 'login.walkthrough_title')}</Text>
            <Text style={[styles.landingTagline, { color: colors.muted }]}>{translate(language, 'login.walkthrough_desc')}</Text>
          </View>
          
          <View style={styles.walkthroughFeatures}>
            <Text style={[styles.featureItem, { color: colors.text }]}>{translate(language, 'login.walkthrough_feature_1')}</Text>
            <Text style={[styles.featureItem, { color: colors.text }]}>{translate(language, 'login.walkthrough_feature_2')}</Text>
          </View>

          <Button 
            label={translate(language, 'login.walkthrough_btn')} 
            onPress={async () => {
              await AsyncStorage.setItem('appleo.has_seen_walkthrough', 'true');
              transitionView('landing');
            }} 
          />
        </View>
      )}
    </View>
  );

  return (
    <Page>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor, zIndex: -1 }]} />
      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        {view === 'walkthrough' ? renderWalkthrough() : 
         view === 'landing' ? (
          <>
            <View style={styles.landingHeader}>
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' }}>
                  App Leo
              </Text>
              <Text style={[styles.landingTitle, { color: colors.text }]}>{headline}</Text>
              <Text style={[styles.landingTagline, { color: colors.muted }]}>
                  {translate(language, 'login.tagline')}
              </Text>
            </View>

            <View style={styles.featuresGrid}>
              {['⚡️ Rápida', '🔒 Privada', '👨‍👩‍👧 Compartida', '🚫 Sin anuncios'].map((item) => (
                  <View
                    key={item}
                    style={[styles.featureChip, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}
                  >
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{item}</Text>
                  </View>
                ))}
            </View>

            <Card style={{ gap: 20, padding: 24, borderRadius: 32, borderAlpha: 0.05 }}>

              <Button
                label={translate(language, 'login.guest_btn')}
                onPress={async () => {
                  try {
                    await signInGuest();
                    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
  landingHeader: { alignItems: 'center', marginTop: 60, marginBottom: 32, gap: 8 },
  landingTitle: { fontSize: 36, fontWeight: '900', textAlign: 'center', lineHeight: 42 },
  landingTagline: { fontSize: 17, textAlign: 'center', paddingHorizontal: 40, lineHeight: 24 },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 32 },
  featureChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  formContainer: { gap: 20, paddingTop: 40 },
  formTitle: { fontSize: 28, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
  input: { height: 60, borderRadius: 18, paddingHorizontal: 20, fontSize: 16, borderWidth: 1.5 },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center' },
  eyeIcon: { position: 'absolute', right: 16, padding: 8 },
  strengthWrapper: { marginTop: -8, marginBottom: 8, gap: 4 },
  strengthBarContainer: { height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, overflow: 'hidden' },
  strengthBar: { height: '100%' },
  strengthText: { fontSize: 11, fontWeight: '700', textAlign: 'right' },
  infoText: { textAlign: 'center', fontSize: 14, color: '#FF3B30', paddingHorizontal: 20 },
  backButton: { alignItems: 'center', padding: 16 },
  authLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 15, marginTop: 10 },
  link: { paddingVertical: 8 },
  linkText: { fontWeight: '700', fontSize: 14 },
  proBadge: { marginTop: 32, padding: 12, borderRadius: 12, alignSelf: 'center' },
  walkthroughContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 40 },
  walkthroughHeader: { alignItems: 'center', gap: 12 },
  walkthroughEmoji: { fontSize: 64, marginBottom: 10 },
  walkthroughFeatures: { gap: 16, backgroundColor: 'rgba(255,255,255,0.05)', padding: 20, borderRadius: 24 },
  featureItem: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  languageSelector: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },
  langButton: { alignItems: 'center', gap: 8, padding: 16, borderRadius: 20, borderWidth: 2, borderColor: 'transparent', minWidth: 80 },
  langCode: { fontSize: 12, fontWeight: '800' },
  progressContainer: { flexDirection: 'row', gap: 8, position: 'absolute', top: 20, left: 24, right: 24 },
  progressBar: { flex: 1, height: 4, borderRadius: 2 },
});
