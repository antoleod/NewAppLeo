import React, { useEffect, useMemo, useState, useRef } from 'react';
import { 
  ActivityIndicator,
  Animated,
  Image,
  LayoutAnimation,
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

const SUPPORTED_LANGUAGES: ReadonlyArray<{ code: AppLanguage; label: string }> = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'es', label: 'ES' },
  { code: 'nl', label: 'NL' },
];

const BACKGROUND_IMAGES: Record<AppLanguage, string> = {
  fr: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=2071',
  es: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?q=80&w=2040',
  en: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=2075',
  nl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=2070',
};

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

  const changeView = (newView: AuthView) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setView(newView);
    setErrorMessage('');
  };

  const canSubmitSignup = useMemo(() => {
    return displayName.trim().length >= 2 && normalizeUsername(username).length >= 3 && email.trim().length > 4 && password.length >= 6 && isValidPin(pin);
  }, [displayName, username, email, password, pin]);

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
            {view === 'landing' ? t('login.welcome', 'Welcome') : view === 'login' ? 'Welcome Back' : 'Create Account'}
          </Text>
          
          <View style={styles.formContainer}>
            {view === 'signup' && (
              <>
                <Input label="Name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
                <Input label="Username" value={username} onChangeText={(v: string) => setUsername(normalizeUsername(v))} placeholder="username" />
              </>
            )}
            
            {(view === 'login' || view === 'signup') && (
              <>
                <Input label="Email" value={email} onChangeText={setEmail} placeholder="name@email.com" keyboardType="email-address" />
                <Input label="Password" value={password} onChangeText={setPassword} placeholder="******" secureTextEntry />
              </>
            )}

            {view === 'signup' && <Input label="PIN" value={pin} onChangeText={setPin} placeholder="6 digits" keyboardType="number-pad" secureTextEntry />}
            
            <View style={styles.actions}>
              {view === 'landing' ? (
                <>
                  <Button label="Continue with Google" iconName="logo-google" variant="secondary" fullWidth onPress={() => void signInGoogle()} />
                  <Button label="Sign In" variant="primary" fullWidth onPress={() => changeView('login')} />
                  <Button label="Create Account" variant="ghost" fullWidth onPress={() => changeView('signup')} />
                </>
              ) : (
                <>
                  <Button label="Submit" loading={busy} fullWidth onPress={() => changeView('landing')} />
                  <Button label="Back" variant="ghost" fullWidth onPress={() => changeView('landing')} />
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
    </Page>
  );
}

const styles = StyleSheet.create({
  pageContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  shell: { width: '100%', padding: 20 },
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
export const Input = ({ label, error, iconName, onClear, ...props }: any) => {
  const { colors } = useTheme();
  const uiScale = useUiScale();

  return (
    <View style={{ gap: 6 * uiScale, width: '100%' }}>
      {label && (
        <Text style={{ fontSize: 13 * uiScale, fontWeight: '700', color: colors.muted, marginLeft: 4 * uiScale }}>
          {label}
        </Text>
      )}
      <View style={{ justifyContent: 'center' }}>
        {iconName && (
          <Ionicons 
            name={iconName} 
            size={18 * uiScale} 
            color={colors.muted} 
            style={{ position: 'absolute', left: 14 * uiScale, zIndex: 1 }} 
          />
        )}
        <TextInput
          style={[
            {
              height: 48 * uiScale,
              backgroundColor: colors.backgroundAlt,
              borderRadius: 14 * uiScale,
              paddingLeft: iconName ? 42 * uiScale : 16 * uiScale,
              paddingRight: onClear ? 42 * uiScale : 16 * uiScale,
              fontSize: 15 * uiScale,
              color: colors.text,
              borderWidth: 1,
              borderColor: error ? colors.danger : colors.border,
            }
          ]}
          placeholderTextColor={colors.muted}
          {...props}
        />
        {onClear && props.value?.length > 0 && (
          <Pressable 
            onPress={onClear} 
            style={{ position: 'absolute', right: 12 * uiScale, zIndex: 1 }}
          >
            <Ionicons name="close-circle" size={20 * uiScale} color={colors.muted} />
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
          height: 48 * uiScale,
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
  const Container = scroll ? ScrollView : View;
  return (
    <Container style={{ flex: 1 }} contentContainerStyle={contentStyle}>
      {children}
    </Container>
  );
};