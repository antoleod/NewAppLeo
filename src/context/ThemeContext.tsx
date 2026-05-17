import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, useColorScheme } from 'react-native';
import { useAuth } from './AuthContext';
import { getThemeTokens, type Theme, type ThemePaletteMode, type ThemeStyle, type ThemeVariant } from '@/theme';
import { ThemeMode } from '@/types';
import { defaultAppSettings, getAppSettings, updateAppSettings } from '@/lib/storage';

interface ThemeContextValue {
  mode: 'light' | 'dark';
  paletteMode: ThemePaletteMode;
  themeMode: ThemeMode;
  themeVariant: ThemeVariant;
  themeStyle: ThemeStyle;
  backgroundPhotoUri: string;
  buttonOpacity: number;
  buttonTransparency: number;
  customTheme: { enabled: boolean; primary: string; secondary: string; backgroundAlt: string };
  setThemeVariant: (variant: ThemeVariant) => Promise<void>;
  setThemeStyle: (style: ThemeStyle) => Promise<void>;
  setBackgroundPhotoUri: (uri: string) => Promise<void>;
  setButtonOpacity: (opacity: number) => Promise<void>;
  setButtonTransparency: (opacity: number) => Promise<void>;
  setCustomTheme: (colors: { enabled?: boolean; primary?: string; secondary?: string; backgroundAlt?: string }) => Promise<void>;
  toggleTheme: () => Promise<void>;
  theme: Theme;
  colors: any;
  gradients: any;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface LocalThemeSettings {
  themeVariant: ThemeVariant;
  themeStyle: ThemeStyle;
  backgroundPhotoUri: string;
  buttonOpacity: number;
  buttonTransparency: number;
  customTheme: { enabled: boolean; primary: string; secondary: string; backgroundAlt: string };
}

function normalizeButtonOpacity(opacity: unknown) {
  const n = Number(opacity);
  return Number.isFinite(n) ? Math.max(0.2, Math.min(1, n)) : defaultAppSettings.buttonOpacity;
}

function normalizeButtonTransparency(opacity: unknown) {
  const n = Number(opacity);
  return Number.isFinite(n) ? Math.max(0.2, Math.min(1, n)) : defaultAppSettings.buttonTransparency;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile, setThemeMode } = useAuth();
  const systemScheme = useColorScheme();
  const [localSettings, setLocalSettings] = useState<LocalThemeSettings>({
    themeVariant: defaultAppSettings.themeVariant,
    themeStyle: defaultAppSettings.themeStyle,
    backgroundPhotoUri: defaultAppSettings.backgroundPhotoUri,
    buttonOpacity: defaultAppSettings.buttonOpacity,
    buttonTransparency: defaultAppSettings.buttonTransparency,
    customTheme: defaultAppSettings.customTheme,
  });
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const hydratedRef = useRef(false);
  const themeMode = profile?.themeMode ?? 'system';
  const resolvedMode = themeMode === 'system' ? systemScheme ?? 'light' : themeMode;

  const { themeVariant, themeStyle, backgroundPhotoUri, buttonOpacity, buttonTransparency, customTheme } = localSettings;

  useEffect(() => {
    let active = true;
    (async () => {
      const settings = await getAppSettings();
      if (!active) return;
      setLocalSettings({
        themeVariant: settings.themeVariant,
        themeStyle: settings.themeStyle,
        backgroundPhotoUri: settings.backgroundPhotoUri ?? '',
        buttonOpacity: normalizeButtonOpacity(settings.buttonOpacity),
        buttonTransparency: normalizeButtonTransparency(settings.buttonTransparency),
        customTheme: settings.customTheme,
      });
      hydratedRef.current = true;
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.3, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [themeVariant, resolvedMode, fadeAnim]);

  const tokens = useMemo(
    () => getThemeTokens(resolvedMode, themeVariant, customTheme, themeStyle),
    [resolvedMode, themeVariant, customTheme, themeStyle],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode: resolvedMode === 'dark' ? 'dark' : 'light',
      paletteMode: tokens.paletteMode,
      themeMode,
      themeVariant,
      themeStyle,
      backgroundPhotoUri,
      buttonOpacity,
      buttonTransparency,
      customTheme,
      setThemeVariant: async (variant) => {
        setLocalSettings((prev) => ({ ...prev, themeVariant: variant }));
        await updateAppSettings({ themeVariant: variant });
      },
      setThemeStyle: async (style) => {
        setLocalSettings((prev) => ({ ...prev, themeStyle: style }));
        await updateAppSettings({ themeStyle: style });
      },
      setBackgroundPhotoUri: async (uri) => {
        setLocalSettings((prev) => ({ ...prev, backgroundPhotoUri: uri }));
        await updateAppSettings({ backgroundPhotoUri: uri });
      },
      setButtonOpacity: async (opacity) => {
        const nextOpacity = normalizeButtonOpacity(opacity);
        setLocalSettings((prev) => ({ ...prev, buttonOpacity: nextOpacity }));
        await updateAppSettings({ buttonOpacity: nextOpacity });
      },
      setButtonTransparency: async (opacity) => {
        const nextOpacity = normalizeButtonTransparency(opacity);
        setLocalSettings((prev) => ({ ...prev, buttonTransparency: nextOpacity }));
        await updateAppSettings({ buttonTransparency: nextOpacity });
      },
      setCustomTheme: async (nextCustomTheme) => {
        const next = { ...customTheme, ...nextCustomTheme };
        setLocalSettings((prev) => ({ ...prev, customTheme: next }));
        await updateAppSettings({ customTheme: next });
      },
      toggleTheme: async () => {
        const nextMode: ThemeMode = resolvedMode === 'dark' ? 'light' : 'dark';
        await setThemeMode(nextMode);
      },
      theme: tokens.theme,
      colors: tokens.colors,
      gradients: tokens.gradients,
    }),
    [backgroundPhotoUri, buttonOpacity, buttonTransparency, customTheme, resolvedMode, setThemeMode, themeMode, themeStyle, themeVariant, tokens],
  );

  return (
    <ThemeContext.Provider value={value}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {children}
      </Animated.View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
}
