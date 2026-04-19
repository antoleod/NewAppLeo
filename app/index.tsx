import React, { useEffect, useMemo, useState, useRef } from 'react';
import { 
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet, 
  Text, 
  TextInput, 
  UIManager,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { Redirect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Reanimated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withRepeat } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Localization from 'expo-localization';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { AppLanguage } from '@/types';
import { isValidPin, normalizeUsername } from '@/utils/crypto';

// Habilitar LayoutAnimation en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type AuthView = 'landing' | 'login' | 'signup' | 'walkthrough';

const SUPPORTED_LANGUAGES: ReadonlyArray<{ code: AppLanguage; label: string; flag: string }> = [
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'es', label: 'ES', flag: '🇪🇸' },
  { code: 'nl', label: 'NL', flag: '🇳🇱' },
];

const BACKGROUND_IMAGES: Record<AppLanguage, string> = {
  fr: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=2071',
  es: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?q=80&w=2040',
  en: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=2075',
  nl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=2070',
};

const COUNTRY_CALLING_CODES: Record<string, string> = {
  BE: '+32', ES: '+34', US: '+1', FR: '+33', NL: '+31',
  MX: '+52', AR: '+54', CO: '+57', CL: '+56', PE: '+51',
  BR: '+55', IT: '+39', DE: '+49', GB: '+44', CA: '+1',
  UY: '+598', PY: '+595', BO: '+591', EC: '+593', VE: '+58'
};

// Validación simple de formato de email
const EMAIL_REGEX = /\S+@\S+\.\S+/;
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

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

export default function IndexRoute() {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { language, setLanguage, t } = useLocale();
  const { loading, user, profile, guestMode, signInGuest, signInEmail, signInGoogle, register } = useAuth();
  const scheme = useColorScheme();
  const isDesktop = width >= 1280;
  const uiScale = isDesktop ? 0.8 : 1.0;
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
  const [selectedRegion, setSelectedRegion] = useState(Localization.getLocales()[0]?.regionCode || 'BE');
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Precarga de imágenes
  useEffect(() => {
    const urls = Object.values(BACKGROUND_IMAGES);
    void Promise.all(urls.map(url => Image.prefetch(url)));
  }, []);

  // Transición de fondo
  const bgOpacity = useRef(new Animated.Value(1)).current;
  const [bgSource, setBgSource] = useState(BACKGROUND_IMAGES[language]);

  useEffect(() => {
    if (BACKGROUND_IMAGES[language] !== bgSource) {
      Animated.timing(bgOpacity, { toValue: 0.2, duration: 300, useNativeDriver: true }).start(() => {
        setBgSource(BACKGROUND_IMAGES[language]);
        Animated.timing(bgOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      });
    }
  }, [language, bgSource, bgOpacity]);

  const { phonePlaceholder, countryFlag } = useMemo(() => {
    const code = COUNTRY_CALLING_CODES[selectedRegion] || '+32';
    const flag = selectedRegion.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
    const sep = language === 'nl' ? 'of' : language === 'es' ? 'o' : language === 'fr' ? 'ou' : 'or';
    return {
      phonePlaceholder: `you@example.com ${sep} ${code}12345678`,
      countryFlag: flag
    };
  }, [selectedRegion, language]);

  const changeView = (newView: AuthView) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setView(newView);
    setErrorMessage('');
  };

  const canSubmitLogin = useMemo(() => {
    const isEmail = EMAIL_REGEX.test(email.trim());
    const isPhone = PHONE_REGEX.test(email.trim());
    return (isEmail || isPhone) && password.length >= 6;
  }, [email, password]);

  const canSubmitSignup = useMemo(() => {
    const isEmailOrPhone = EMAIL_REGEX.test(email.trim()) || PHONE_REGEX.test(email.trim());
    return (
      displayName.trim().length >= 2 &&
      isEmailOrPhone &&
      password.length >= 6
    );
  }, [displayName, email, password]);

  function getAuthErrorMessage(error: any) {
    const code = error?.code || '';
    if (code === 'auth/invalid-email') {
      if (language === 'es') return 'El formato del correo no es válido.';
      if (language === 'fr') return 'Format d\'e-mail invalide.';
      if (language === 'nl') return 'Ongeldig e-mailformaat.';
      return 'Invalid email format.';
    }
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/invalid-password' || code === 'auth/wrong-pin') {
      if (language === 'es') return 'Credenciales incorrectas.';
      if (language === 'fr') return 'Identifiants incorrects.';
      if (language === 'nl') return 'Ongeldige inloggegevens.';
      return 'Invalid credentials.';
    }
    return error?.message || 'Authentication failed';
  }

  async function handleLogin() {
    if (!canSubmitLogin || busy) return;
    setBusy(true);
    setErrorMessage('');
    try {
      await signInEmail({ email, password });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      // Si el error indica que es un PIN/Password inválido, lo mapeamos
      setErrorMessage(getAuthErrorMessage(error));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup() {
    if (!canSubmitSignup || busy) return;
    setBusy(true);
    setErrorMessage('');
    try {
      await register({
        displayName: displayName.trim(),
        username: normalizeUsername(email.split('@')[0]),
        email: email.trim(),
        password,
        pin: '000000', // PIN por defecto para simplificar el registro
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      setErrorMessage(getAuthErrorMessage(error));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Page scroll={false} contentStyle={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></Page>;
  if (user && profile) return <Redirect href="/home" />;
  if (user && !profile && !guestMode) return <Redirect href="/onboarding" />;

  return (
    <Page scroll={false} contentStyle={styles.pageContent}>
      <Animated.Image source={{ uri: bgSource }} style={[StyleSheet.absoluteFillObject, { opacity: bgOpacity }]} />
      <BlurView intensity={Platform.OS === 'ios' ? 30 : 60} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
      
      <View style={[styles.shell, { maxWidth: isDesktop ? 400 : isTablet ? 480 : '100%' }]}>
        <Card>
          <Text style={[styles.title, { color: colors.text, fontSize: 28 * uiScale }]}>
            {view === 'landing' ? t('login.welcome', 'Welcome') : view === 'login' ? (language === 'nl' ? 'Welkom terug' : language === 'es' ? 'Bienvenido' : 'Welcome Back') : (language === 'nl' ? 'Account aanmaken' : language === 'es' ? 'Crear cuenta' : 'Create Account')}
          </Text>
          
          <View style={styles.formContainer}>
            {view === 'signup' && (
              <Input label={language === 'nl' ? 'Naam' : language === 'es' ? 'Nombre' : 'Name'} value={displayName} onChangeText={setDisplayName} placeholder="Andrea" autoCorrect={false} />
            )}

            {(view === 'login' || view === 'signup') && (
              <>
                <Input 
                  label={language === 'es' ? "Email o Teléfono" : language === 'nl' ? "E-mail of Telefoon" : language === 'fr' ? "Email ou Téléphone" : "Email or Phone"} 
                  value={email} 
                  onChangeText={setEmail} 
                  placeholder={phonePlaceholder} 
                  iconName={countryFlag}
                  isPulsing={showCountryPicker}
                  onIconPress={() => setShowCountryPicker(true)}
                  autoCapitalize="none" 
                  autoCorrect={false} 
                />
                <Input 
                  label={language === 'es' ? "Contraseña o PIN" : language === 'nl' ? "Wachtwoord of PIN" : language === 'fr' ? "Mot de passe ou PIN" : "Password or PIN"} 
                  value={password} 
                  onChangeText={setPassword} 
                  placeholder="******" 
                  secureTextEntry 
                  autoCapitalize="none" 
                  autoCorrect={false}
                  rightActionIcon={view === 'signup' ? "sparkles" : undefined}
                  onRightAction={() => {
                    setPassword(generatePassphrase());
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                />
              </>
            )}

            {password.length > 0 && password.length < 6 && (
              <Text style={{ color: colors.danger, fontSize: 11 * uiScale, marginLeft: 4 * uiScale, marginTop: -4 * uiScale }}>
                {language === 'es' ? 'Mínimo 6 caracteres o números' : language === 'nl' ? 'Minimaal 6 tekens of cijfers' : 'Minimum 6 characters or numbers'}
              </Text>
            )}

            {view === 'signup' && password.length > 0 && (
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
            
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <View style={styles.actions}>
              {view === 'landing' ? (
                <>
                  <Button label={language === 'nl' ? 'Doorgaan met Google' : 'Continue with Google'} iconName="logo-google" variant="secondary" fullWidth onPress={() => void signInGoogle()} />
                  <Button label={language === 'nl' ? 'Inloggen' : 'Sign In'} variant="primary" fullWidth onPress={() => changeView('login')} />
                  <Button label={language === 'nl' ? 'Account aanmaken' : 'Create Account'} variant="ghost" fullWidth onPress={() => changeView('signup')} />
                </>
              ) : (
                <>
                  <Button 
                    label={language === 'nl' ? 'Bevestigen' : 'Submit'} 
                    loading={busy} 
                    fullWidth 
                    onPress={view === 'login' ? handleLogin : handleSignup}
                    disabled={view === 'login' ? !canSubmitLogin : !canSubmitSignup}
                  />
                  <Button label={language === 'nl' ? 'Terug' : 'Back'} variant="ghost" fullWidth onPress={() => changeView('landing')} />
                </>
              )}
            </View>
          </View>
        </Card>
      </View>

      {busy && (
        <View style={styles.blockingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

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
  pageContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  shell: { width: '100%', padding: 20, alignSelf: 'center' },
  title: { fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  formContainer: { gap: 12 },
  actions: { gap: 10, marginTop: 10 },
  blockingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
});

// Hook interno para obtener la escala global
const useUiScale = () => {
  const { width } = useWindowDimensions();
  return width >= 1280 ? 0.8 : 1.0;
};

/**
 * Card: Contenedor con sombras corregidas para Web y escalado automático
 */
export const Card = ({ children, style, gap }: { children: React.ReactNode; style?: any, gap?: number }) => {
  const { colors } = useTheme();
  const uiScale = useUiScale();

  return (
    <View style={[
      {
        backgroundColor: colors.surface,
        borderRadius: 24 * uiScale,
        padding: 20 * uiScale,
        gap: (gap ?? 12) * uiScale,
        width: '100%',
        ...Platform.select({
          web: {
            boxShadow: `0px ${4 * uiScale}px ${16 * uiScale}px rgba(0, 0, 0, 0.08)`,
          },
          default: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 4,
          },
        }),
      },
      style
    ]}>
      {children}
    </View>
  );
};

/**
 * Input: Campo de texto auto-escalable
 */
export const Input = ({ label, error, iconName, iconColor, onIconPress, onClear, rightActionIcon, onRightAction, isPulsing, ...props }: any) => {
  const { colors } = useTheme();
  const uiScale = useUiScale();
  const scheme = useColorScheme();
  const [isSecure, setIsSecure] = React.useState(!!props.secureTextEntry);

  // Animación de latido para el corazón cuando el usuario escribe
  const iconScale = useSharedValue(1);

  useEffect(() => {
    if (props.value && iconName === 'heart-outline') {
      iconScale.value = withSequence(
        withTiming(1.3, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
    }
  }, [props.value, iconName]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }]
  }));

  // Animación de pulso para la bandera
  const flagScale = useSharedValue(1);
  useEffect(() => {
    if (isPulsing) {
      flagScale.value = withRepeat(withTiming(1.15, { duration: 600 }), -1, true);
    } else {
      flagScale.value = withTiming(1);
    }
  }, [isPulsing]);

  return (
    <View style={{ gap: 6 * uiScale, width: '100%' }}>
      {label && (
        <Text style={{ fontSize: 13 * uiScale, fontWeight: '700', color: colors.muted, marginLeft: 4 * uiScale }}>
          {label}
        </Text>
      )}
      <View style={{ justifyContent: 'center' }}>
        {iconName && (
          <Reanimated.View style={[{ position: 'absolute', left: 10 * uiScale, zIndex: 2 }, isPulsing && { transform: [{ scale: flagScale.value }] }]}>
          <Pressable 
            onPress={onIconPress}
            disabled={!onIconPress}
            style={{
              width: 32 * uiScale,
              height: 32 * uiScale,
              borderRadius: 16 * uiScale,
              backgroundColor: iconName.length <= 2 ? (scheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)') : 'transparent',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {iconName.length <= 4 ? (
              <Text style={{ fontSize: 16 * uiScale }}>{iconName}</Text>
            ) : (
              <Reanimated.View style={animatedIconStyle}>
                <Ionicons name={iconName} size={18 * uiScale} color={iconColor || colors.muted} />
              </Reanimated.View>
            )}
          </Pressable>
          </Reanimated.View>
        )}
        <TextInput
          style={[
            {
              height: 40 * uiScale,
              backgroundColor: colors.backgroundAlt,
              borderRadius: 14 * uiScale,
              paddingLeft: iconName ? 48 * uiScale : 16 * uiScale,
              paddingRight: ((onClear || onRightAction ? 32 : 0) + (props.secureTextEntry ? 32 : 0) + 16) * uiScale,
              fontSize: 15 * uiScale,
              color: colors.text,
              borderWidth: 1,
              borderColor: error ? colors.danger : colors.border,
            }
          ]}
          placeholderTextColor={colors.muted}
          {...props}
          secureTextEntry={isSecure}
        />
        {onClear && props.value?.length > 0 && (
          <Pressable 
            onPress={onClear} 
            style={{ position: 'absolute', right: 12 * uiScale, zIndex: 1 }}
          >
            <Ionicons name="close-circle" size={20 * uiScale} color={colors.muted} />
          </Pressable>
        )}
        {onRightAction && rightActionIcon && (
          <Pressable 
            onPress={() => {
              onRightAction();
              if (rightActionIcon === 'sparkles') setIsSecure(false);
            }} 
            style={{ position: 'absolute', right: 12 * uiScale, zIndex: 1 }}
          >
            <Ionicons name={rightActionIcon} size={18 * uiScale} color={colors.primary} />
          </Pressable>
        )}
        {props.secureTextEntry && (
          <Pressable 
            onPress={() => setIsSecure(!isSecure)} 
            style={{ position: 'absolute', right: (rightActionIcon || onClear) ? 44 * uiScale : 12 * uiScale, zIndex: 1, padding: 4 }}
          >
            <Ionicons name={isSecure ? "eye-off" : "eye"} size={20 * uiScale} color={isSecure ? colors.muted : "#FF3B30"} />
          </Pressable>
        )}
      </View>
      {error && <Text style={{ fontSize: 11 * uiScale, color: colors.danger, marginLeft: 4 * uiScale }}>{error}</Text>}
    </View>
  );
};

/**
 * Button: Botón con variantes y escalado de densidad
 */
export const Button = ({ label, onPress, variant = 'primary', loading, disabled, fullWidth, iconName, iconSize }: any) => {
  const { colors } = useTheme();
  const uiScale = useUiScale();

  const isGhost = variant === 'ghost';
  const isSecondary = variant === 'secondary';
  const iconColor = isGhost || isSecondary ? colors.primary : '#fff';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          height: 40 * uiScale,
          borderRadius: 16 * uiScale,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24 * uiScale,
          width: fullWidth ? '100%' : 'auto',
          backgroundColor: isGhost ? 'transparent' : isSecondary ? colors.backgroundAlt : colors.primary,
          opacity: (disabled || loading) ? 0.5 : pressed ? 0.9 : 1,
          borderWidth: isSecondary ? 1 : 0,
          borderColor: colors.border,
        }
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isGhost || isSecondary ? colors.primary : '#fff'} size="small" />
      ) : (
        <Text style={{
          fontSize: 15 * uiScale,
          fontWeight: '800',
          color: isGhost || isSecondary ? colors.primary : '#fff'
        }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
};

/**
 * Page: Contenedor base de pantalla
 */
export const Page = ({ children, scroll = true, contentStyle }: any) => {
  // Inyectar CSS para ocultar el icono de revelar contraseña nativo del navegador en Web
  const browserStyle = Platform.OS === 'web' ? (
    <style dangerouslySetInnerHTML={{ __html: `
      input::-ms-reveal,
      input::-ms-clear {
        display: none;
      }
    `}} />
  ) : null;

  if (scroll) {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[{ flexGrow: 1 }, contentStyle]}>
        {browserStyle}
        {children}
      </ScrollView>
    );
  }
  return (
    <View style={[{ flex: 1 }, contentStyle]}>
      {browserStyle}
      {children}
    </View>
  );
};