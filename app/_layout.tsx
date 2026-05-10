import { useEffect, useState, useRef } from 'react';
import { Stack, useSegments, router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View, AppState, StyleSheet, Text, useWindowDimensions, Platform } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Fraunces_400Regular_Italic, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppDataProvider } from '@/context/AppDataContext';
import { NightOverlay } from '@/components/NightOverlay';
import { LocaleProvider } from '@/context/LocaleContext';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '@/components/ui';
import { ToastProvider } from '@/components/Toast';
import { useTranslation } from '@/hooks/useTranslation';

function LockOverlay({ isLocked, uiScale, onUnlock }: { isLocked: boolean; uiScale: number; onUnlock: () => void }) {
  const { t } = useTranslation();
  if (!isLocked) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.lockOverlay]}>
      <Text style={[styles.lockEmoji, { fontSize: 64 * uiScale }]}>{'\u{1F512}'}</Text>
      <Text style={[styles.lockTitle, { fontSize: 24 * uiScale }]}>{t('lock.title')}</Text>
      <View style={{ width: 200 * uiScale }}>
        <Button label={t('lock.unlock')} onPress={onUnlock} fullWidth />
      </View>
    </View>
  );
}

void SplashScreen.preventAutoHideAsync();

/**
 * AuthGuard: Maneja la redirección automática basada en el estado de autenticación.
 */
function AuthGuard() {
  const { user, loading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    // Verificamos si estamos dentro del grupo de rutas protegidas (app)
    const inAppGroup = segments[0] === '(app)';

    if (!user && inAppGroup) {
      // Si el usuario se desconecta y está en una ruta privada, va a la raíz
      router.replace('/');
    }
  }, [user, loading, segments]);

  return null;
}

export default function RootLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1280;
  const uiScale = isDesktop ? 0.8 : 1.0;

  const scheme = useColorScheme();
  const statusBarStyle = scheme === 'dark' ? 'light' : 'dark';
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    Fraunces_700Bold,
    Fraunces_400Regular_Italic,
  });

  const [isLocked, setIsLocked] = useState(false);
  const [isIncognito, setIsIncognito] = useState(false);
  const [autoLockEnabled, setAutoLockEnabled] = useState(true);
  const autoLockRef = useRef(true);
  const biometricCapableRef = useRef<boolean | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const loadLockPreference = async () => {
      const val = await AsyncStorage.getItem('pref_auto_lock');
      const enabled = val === null ? true : val === 'true';
      autoLockRef.current = enabled;
      setAutoLockEnabled(enabled);
    };
    loadLockPreference();

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        setIsIncognito(false);
        const wasInBackground = appState.current.match(/inactive|background/);

        if (wasInBackground && autoLockRef.current) {
          // Cache hardware check — it never changes at runtime
          if (biometricCapableRef.current === null) {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            biometricCapableRef.current = hasHardware && isEnrolled;
          }
          if (biometricCapableRef.current) {
            setIsLocked(true);
            handleUnlock();
          }
        }
      } else {
        setIsIncognito(true);
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, []);

  // Keep ref in sync with state so the AppState listener always reads the latest value
  useEffect(() => {
    autoLockRef.current = autoLockEnabled;
  }, [autoLockEnabled]);

  const handleUnlock = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock App Leo',
      fallbackLabel: 'Use code',
    });
    // Always unlock — on failure too, so user is never permanently stuck
    setIsLocked(false);
  };

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);


  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0D1117' }}>
      <SafeAreaProvider>
        <AuthProvider>
          <LocaleProvider>
            <ThemeProvider>
              <ToastProvider>
              <AppDataProvider>
                <View style={{ flex: 1, backgroundColor: '#0D1117' }}>
                  <AuthGuard />
                  <StatusBar style={statusBarStyle} />
                  <NightOverlay />
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(app)" />
                  </Stack>

                  {isIncognito && (
                    <View style={[StyleSheet.absoluteFill, styles.incognitoOverlay, { backgroundColor: '#1A1C1E' }]}>
                      <Text style={{ fontSize: 40 * uiScale }}>\u2728</Text>
                      <Text style={{ color: '#fff', marginTop: 10 * uiScale, fontWeight: '600', fontSize: 16 * uiScale }}>App Leo</Text>
                    </View>
                  )}

                  <LockOverlay isLocked={isLocked} uiScale={uiScale} onUnlock={handleUnlock} />
                </View>
              </AppDataProvider>
              </ToastProvider>
            </ThemeProvider>
          </LocaleProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  lockOverlay: {
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    gap: 20,
  },
  lockEmoji: { fontSize: 64 },
  lockTitle: { fontSize: 24, fontWeight: '800', color: '#1A1C1E' },
  incognitoOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
});
