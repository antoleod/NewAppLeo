import { Redirect } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Localization from 'expo-localization';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Input, Page } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { AppLanguage } from '@/types';

type AuthView = 'landing' | 'login' | 'signup' | 'walkthrough';

const SUPPORTED_LANGUAGES: ReadonlyArray<{ code: AppLanguage; label: string }> = [
  { code: 'fr', label: 'FR' },
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
  { code: 'nl', label: 'NL' },
];

const UI_TEXT: Record<
  AppLanguage,
  {
    welcomeBack: string;
    createFamilySpace: string;
    continueLabel: string;
    getStarted: string;
    selectLanguage: string;
    current: string;
    benefit1: string;
    benefit2: string;
    benefit3: string;
    name: string;
    parentName: string;
    username: string;
    pinLabel: string;
    back: string;
    signIn: string;
    createAccount: string;
    continueGuest: string;
    continueGoogle: string;
    signInCta: string;
    createAccountCta: string;
    defaultAuthError: string;
    guestError: string;
    googleError: string;
    signupError: string;
    enableEmailPasswordHint: string;
  }
> = {
  fr: {
    welcomeBack: 'Bon retour',
    createFamilySpace: 'Creez votre espace famille',
    continueLabel: 'Continuer',
    getStarted: 'Commencer',
    selectLanguage: 'Choisissez votre langue',
    current: 'Actuel',
    benefit1: 'Suivi rapide des repas, sommeil et couches',
    benefit2: 'Timeline partagee entre parents',
    benefit3: 'Donnees privees avec synchro securisee',
    name: 'Nom',
    parentName: 'Nom du parent',
    username: "Nom d'utilisateur",
    pinLabel: 'PIN (4+ chiffres)',
    back: 'Retour',
    signIn: 'Se connecter',
    createAccount: 'Creer un compte',
    continueGuest: 'Continuer en invite',
    continueGoogle: 'Continuer avec Google',
    signInCta: 'Se connecter',
    createAccountCta: 'Creer le compte',
    defaultAuthError: 'Impossible de se connecter.',
    guestError: "Impossible de continuer en mode invite.",
    googleError: 'Impossible de continuer avec Google.',
    signupError: 'Impossible de creer le compte.',
    enableEmailPasswordHint: 'Activez Email/Password dans Firebase Authentication.',
  },
  es: {
    welcomeBack: 'Bienvenida de nuevo',
    createFamilySpace: 'Crea tu espacio familiar',
    continueLabel: 'Continuar',
    getStarted: 'Empezar',
    selectLanguage: 'Elige tu idioma',
    current: 'Actual',
    benefit1: 'Registro rapido de tomas, sueno y panales',
    benefit2: 'Timeline compartido entre padres',
    benefit3: 'Datos privados con sincronizacion segura',
    name: 'Nombre',
    parentName: 'Nombre del padre o madre',
    username: 'Usuario',
    pinLabel: 'PIN (4+ digitos)',
    back: 'Volver',
    signIn: 'Iniciar sesion',
    createAccount: 'Crear cuenta',
    continueGuest: 'Continuar como invitado',
    continueGoogle: 'Continuar con Google',
    signInCta: 'Entrar',
    createAccountCta: 'Crear cuenta',
    defaultAuthError: 'No se pudo iniciar sesion.',
    guestError: 'No se pudo continuar en modo invitado.',
    googleError: 'No se pudo continuar con Google.',
    signupError: 'No se pudo crear la cuenta.',
    enableEmailPasswordHint: 'Activa Email/Password en Firebase Authentication.',
  },
  en: {
    welcomeBack: 'Welcome back',
    createFamilySpace: 'Create your family space',
    continueLabel: 'Continue',
    getStarted: 'Get started',
    selectLanguage: 'Select your language',
    current: 'Current',
    benefit1: 'Fast feed, sleep and diaper logging',
    benefit2: 'Shared timeline for both parents',
    benefit3: 'Private data with secure sync',
    name: 'Name',
    parentName: 'Parent name',
    username: 'Username',
    pinLabel: 'PIN (4+ digits)',
    back: 'Back',
    signIn: 'Sign in',
    createAccount: 'Create account',
    continueGuest: 'Continue as guest',
    continueGoogle: 'Continue with Google',
    signInCta: 'Sign in',
    createAccountCta: 'Create account',
    defaultAuthError: 'Unable to sign in.',
    guestError: 'Unable to continue in guest mode.',
    googleError: 'Unable to continue with Google.',
    signupError: 'Unable to create account.',
    enableEmailPasswordHint: 'Enable Email/Password in Firebase Authentication.',
  },
  nl: {
    welcomeBack: 'Welkom terug',
    createFamilySpace: 'Maak je familieplek aan',
    continueLabel: 'Doorgaan',
    getStarted: 'Start',
    selectLanguage: 'Kies je taal',
    current: 'Huidig',
    benefit1: 'Snelle registratie van voeding, slaap en luiers',
    benefit2: 'Gedeelde tijdlijn voor beide ouders',
    benefit3: 'Privegegevens met veilige synchronisatie',
    name: 'Naam',
    parentName: 'Naam van ouder',
    username: 'Gebruikersnaam',
    pinLabel: 'PIN (4+ cijfers)',
    back: 'Terug',
    signIn: 'Aanmelden',
    createAccount: 'Account maken',
    continueGuest: 'Doorgaan als gast',
    continueGoogle: 'Doorgaan met Google',
    signInCta: 'Aanmelden',
    createAccountCta: 'Account maken',
    defaultAuthError: 'Aanmelden mislukt.',
    guestError: 'Doorgaan als gast is mislukt.',
    googleError: 'Doorgaan met Google is mislukt.',
    signupError: 'Account maken is mislukt.',
    enableEmailPasswordHint: 'Activeer Email/Password in Firebase Authentication.',
  },
};

function sanitizeUsername(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 24);
}

function languageName(language: AppLanguage) {
  if (language === 'es') return 'Espanol';
  if (language === 'en') return 'English';
  if (language === 'nl') return 'Nederlands';
  return 'Francais';
}

export default function IndexRoute() {
  const { width } = useWindowDimensions();
  const { colors, gradients } = useTheme();
  const { language, setLanguage, t } = useLocale();
  const { loading, user, profile, guestMode, signInGuest, signInEmail, signInGoogle, register } = useAuth();
  const isDesktop = width >= 1280;
  const isTablet = width >= 768;

  const [view, setView] = useState<AuthView>('landing');
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');

  const cardWidth = isDesktop ? 500 : width >= 880 ? 540 : width >= 640 ? 500 : '100%';
  const headline = t('login.welcome', 'Welcome');
  const tagline = t('login.tagline', 'A calm place to track your baby.');
  const ui = UI_TEXT[language];
  const googleLabel = ui.continueGoogle;
  const titleStyle = {
    fontSize: isDesktop ? 26 : isTablet ? 28 : 30,
    lineHeight: isDesktop ? 30 : isTablet ? 32 : 34,
  };
  const subtitleStyle = {
    fontSize: isDesktop ? 13 : 14,
    lineHeight: isDesktop ? 18 : 20,
  };

  const canSubmitLogin = useMemo(() => email.trim().length > 4 && password.length >= 6, [email, password]);
  const canSubmitSignup = useMemo(() => {
    return (
      displayName.trim().length >= 2 &&
      username.trim().length >= 3 &&
      email.trim().length > 4 &&
      password.length >= 6 &&
      pin.length >= 4
    );
  }, [displayName, username, email, password, pin]);

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      if (!mounted) return;
      setView('landing');

      const locale = Localization.getLocales()[0]?.languageCode as string | undefined;
      const detected = SUPPORTED_LANGUAGES.find((item) => item.code === locale)?.code;
      if (detected && detected !== language) {
        await setLanguage(detected);
      }
    };
    void bootstrap();
    return () => {
      mounted = false;
    };
  }, [language, setLanguage]);

  useEffect(() => {
    const nextUsername = sanitizeUsername(displayName || email.split('@')[0] || '');
    if (view === 'signup' && !username && nextUsername) {
      setUsername(nextUsername);
    }
  }, [displayName, email, username, view]);

  if (loading) {
    return (
      <Page scroll={false}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.text }]}>{t('login.connection_checking', 'Checking connection...')}</Text>
        </View>
      </Page>
    );
  }

  if (user || guestMode) {
    if (!profile?.hasCompletedOnboarding) return <Redirect href="/onboarding" />;
    return <Redirect href="/home" />;
  }

  async function handleGuest() {
    setBusy(true);
    setErrorMessage('');
    try {
      await signInGuest();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      setErrorMessage(error?.message ?? ui.guestError);
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin() {
    if (!canSubmitLogin) return;
    setBusy(true);
    setErrorMessage('');
    try {
      await signInEmail({ email: email.trim(), password });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      setErrorMessage(error?.message ?? ui.defaultAuthError);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    setErrorMessage('');
    try {
      await signInGoogle();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      setErrorMessage(error?.message ?? ui.googleError);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup() {
    if (!canSubmitSignup) return;
    setBusy(true);
    setErrorMessage('');
    try {
      await register({
        displayName: displayName.trim(),
        username: sanitizeUsername(username),
        email: email.trim(),
        password,
        pin: pin.trim(),
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      const message = String(error?.message ?? '');
      if (message.includes('auth/operation-not-allowed')) {
        setErrorMessage(ui.enableEmailPasswordHint);
      } else {
        setErrorMessage(message || ui.signupError);
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  }

  async function finishWalkthrough() {
    setView('landing');
  }

  return (
    <Page scroll={false} contentStyle={styles.pageContent}>
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: gradients.hero[0],
            opacity: 0.07,
          },
        ]}
      />
      <View style={styles.shell}>
        {view === 'walkthrough' ? (
          <Card style={[styles.card, { width: cardWidth, backgroundColor: colors.surface }]}>
            <Text style={[styles.kicker, { color: colors.primary }]}>APP LEO</Text>
            <Text style={[styles.title, titleStyle, { color: colors.text }]}>{walkthroughStep === 0 ? ui.selectLanguage : t('login.walkthrough_title', 'Welcome')}</Text>
            <Text style={[styles.subtitle, subtitleStyle, { color: colors.muted }]}>
              {walkthroughStep === 0
                ? `${ui.current}: ${languageName(language)}`
                : t('login.walkthrough_desc', 'A calm, professional space to follow your baby journey.')}
            </Text>

            {walkthroughStep === 0 ? (
              <View style={styles.langGrid}>
                {SUPPORTED_LANGUAGES.map((item) => {
                  const active = item.code === language;
                  return (
                    <Pressable
                      key={item.code}
                      onPress={() => void setLanguage(item.code)}
                      style={[
                        styles.langChip,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? colors.primarySoft : colors.backgroundAlt,
                        },
                      ]}
                    >
                      <Text style={{ color: active ? colors.primary : colors.text, fontWeight: '800' }}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={styles.benefits}>
                <Text style={[styles.benefitText, { color: colors.text }]}>{ui.benefit1}</Text>
                <Text style={[styles.benefitText, { color: colors.text }]}>{ui.benefit2}</Text>
                <Text style={[styles.benefitText, { color: colors.text }]}>{ui.benefit3}</Text>
              </View>
            )}

            <View style={styles.actions}>
              <Pressable onPress={() => void handleGoogle()} style={[styles.googleButton, { borderColor: colors.border, backgroundColor: colors.backgroundAlt }]}>
                <Ionicons name="logo-google" size={18} color={colors.text} />
                <Text style={[styles.googleButtonText, { color: colors.text }]}>{googleLabel}</Text>
              </Pressable>
              {walkthroughStep === 0 ? (
                <Button label={ui.continueLabel} onPress={() => setWalkthroughStep(1)} />
              ) : (
                <Button label={t('login.walkthrough_btn', ui.getStarted)} onPress={() => void finishWalkthrough()} />
              )}
            </View>
          </Card>
        ) : view === 'landing' ? (
          <View style={styles.stack}>
            <Card style={[styles.card, { width: cardWidth, backgroundColor: colors.surface }]}>
              <Text style={[styles.kicker, { color: colors.primary }]}>APP LEO</Text>
              <Text style={[styles.title, titleStyle, { color: colors.text }]}>{headline}</Text>
              <Text style={[styles.subtitle, subtitleStyle, { color: colors.muted }]}>{tagline}</Text>

              <View style={styles.actions}>
                <Pressable onPress={() => void handleGoogle()} style={[styles.googleButton, { borderColor: colors.border, backgroundColor: colors.backgroundAlt }]}>
                  <Ionicons name="logo-google" size={18} color={colors.text} />
                  <Text style={[styles.googleButtonText, { color: colors.text }]}>{googleLabel}</Text>
                </Pressable>
                <Button label={busy ? '...' : t('login.guest_btn', ui.continueGuest)} onPress={() => void handleGuest()} disabled={busy} />
                <Button label={t('login.has_account', ui.signIn)} variant="secondary" onPress={() => setView('login')} />
                <Button label={t('auth.sign_up', ui.createAccount)} variant="ghost" onPress={() => setView('signup')} />
              </View>

              <View style={styles.langRow}>
                {SUPPORTED_LANGUAGES.map((item) => {
                  const active = item.code === language;
                  return (
                    <Pressable key={item.code} onPress={() => void setLanguage(item.code)} style={[styles.inlineLang, { borderColor: active ? colors.primary : colors.border }]}>
                      <Text style={{ color: active ? colors.primary : colors.muted, fontWeight: '700', fontSize: 12 }}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          </View>
        ) : (
          <Card style={[styles.card, { width: cardWidth, backgroundColor: colors.surface }]}>
            <Text style={[styles.kicker, { color: colors.primary }]}>{view === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}</Text>
            <Text style={[styles.title, titleStyle, { color: colors.text }]}>{view === 'login' ? ui.welcomeBack : ui.createFamilySpace}</Text>

            {view === 'signup' ? (
              <>
                <Input label={ui.name} value={displayName} onChangeText={setDisplayName} placeholder={ui.parentName} autoCapitalize="words" />
                <Input label={ui.username} value={username} onChangeText={(value) => setUsername(sanitizeUsername(value))} placeholder="username" autoCapitalize="none" />
              </>
            ) : null}

            <Input label={t('auth.email', 'Email')} value={email} onChangeText={setEmail} placeholder="name@email.com" autoCapitalize="none" keyboardType="email-address" />
            <Input label={t('auth.password', 'Password')} value={password} onChangeText={setPassword} placeholder="******" secureTextEntry autoCapitalize="none" />
            {view === 'signup' ? <Input label={ui.pinLabel} value={pin} onChangeText={setPin} placeholder="1234" autoCapitalize="none" keyboardType="number-pad" /> : null}

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <View style={styles.actions}>
              <Pressable onPress={() => void handleGoogle()} style={[styles.googleButton, { borderColor: colors.border, backgroundColor: colors.backgroundAlt }]}>
                <Ionicons name="logo-google" size={18} color={colors.text} />
                <Text style={[styles.googleButtonText, { color: colors.text }]}>{googleLabel}</Text>
              </Pressable>
              {view === 'login' ? (
                <Button label={busy ? '...' : ui.signInCta} onPress={() => void handleLogin()} disabled={busy || !canSubmitLogin} />
              ) : (
                <Button label={busy ? '...' : ui.createAccountCta} onPress={() => void handleSignup()} disabled={busy || !canSubmitSignup} />
              )}
              <Button label={ui.back} variant="ghost" onPress={() => setView('landing')} />
            </View>
          </Card>
        )}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  pageContent: {
    flex: 1,
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  shell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 18,
  },
  stack: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    gap: 14,
    borderRadius: 24,
    paddingVertical: 18,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontWeight: '800',
    textAlign: 'center',
  },
  title: {
    fontSize: 30,
    lineHeight: 34,
    textAlign: 'center',
    fontWeight: '900',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: 10,
  },
  googleButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  langChip: {
    minWidth: 76,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  langRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  inlineLang: {
    borderWidth: 1,
    borderRadius: 999,
    minWidth: 48,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  benefits: {
    gap: 8,
    marginTop: 2,
  },
  benefitText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
