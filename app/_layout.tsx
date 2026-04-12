import { useEffect, useState, useRef } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View, AppState, StyleSheet, Text } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Fraunces_400Regular_Italic, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppDataProvider } from '@/context/AppDataContext';
import { NightOverlay } from '@/components/NightOverlay';
import { LocaleProvider } from '@/context/LocaleContext';
import * as LocalAuthentication from 'expo-local-authentication';
import { Button } from '@/components/ui';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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
  const [autoLockEnabled] = useState(true);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        setIsIncognito(false);
        const wasInBackground = appState.current.match(/inactive|background/);
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        
        // Bloqueamos solo si estaba en background, tiene biometria y la opcion esta activa
        if (wasInBackground && hasHardware && isEnrolled && autoLockEnabled) {
          setIsLocked(true);
          handleUnlock();
        }
      } else {
        setIsIncognito(true);
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [autoLockEnabled]);

  const handleUnlock = async () => {
      const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock App Leo',
      fallbackLabel: 'Use passcode',
    });
    if (result.success) {
      setIsLocked(false);
    }
  };

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <LocaleProvider>
            <ThemeProvider>
              <AppDataProvider>
                <View style={{ flex: 1 }}>
                  <StatusBar style={statusBarStyle} />
                  <NightOverlay />
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(app)" />
                  </Stack>

                  {isIncognito && (
                    <View style={[StyleSheet.absoluteFill, styles.incognitoOverlay, { backgroundColor: '#1A1C1E' }]}>
                      <Text style={{ fontSize: 40 }}>\u2728</Text>
                      <Text style={{ color: '#fff', marginTop: 10, fontWeight: '600' }}>App Leo</Text>
                    </View>
                  )}

                  {isLocked && (
                    <View style={[StyleSheet.absoluteFill, styles.lockOverlay]}>
                      <Text style={styles.lockEmoji}>{'\u{1F512}'}</Text>
                      <Text style={styles.lockTitle}>App Locked</Text>
                      <View style={{ width: 200 }}>
                        <Button label="Unlock" onPress={handleUnlock} fullWidth />
                      </View>
                    </View>
                  )}
                </View>
              </AppDataProvider>
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
