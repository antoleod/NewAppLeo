import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, useColorScheme } from 'react-native';
import { useAuth } from './AuthContext';
import { getThemeTokens, type Theme, type ThemePaletteMode, type ThemeStyle, type ThemeVariant } from '@/theme';
import { ThemeMode } from '@/types';
import { defaultAppSettings, getAppSettings, setAppSettings, updateAppSettings } from '@/lib/storage';

interface ThemeContextValue {
  mode: 'light' | 'dark';
  paletteMode: ThemePaletteMode;
  themeMode: ThemeMode;
  themeVariant: ThemeVariant;
  themeStyle: ThemeStyle;
  backgroundPhotoUri: string;
  buttonOpacity: number;
  buttonTransparency: number;
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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile, setThemeMode } = useAuth();
  const systemScheme = useColorScheme();
  const [themeVariant, setThemeVariantState] = useState<ThemeVariant>(defaultAppSettings.themeVariant);
  const [themeStyle, setThemeStyleState] = useState<ThemeStyle>(defaultAppSettings.themeStyle);
  const [backgroundPhotoUri, setBackgroundPhotoUriState] = useState(defaultAppSettings.backgroundPhotoUri);
  const [buttonOpacity, setButtonOpacityState] = useState(defaultAppSettings.buttonOpacity);
  const [buttonTransparency, setButtonTransparencyState] = useState(defaultAppSettings.buttonTransparency);
  const [customTheme, setCustomThemeState] = useState(defaultAppSettings.customTheme);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const themeMode = profile?.themeMode ?? 'system';
  const resolvedMode = themeMode === 'system' ? systemScheme ?? 'light' : themeMode;

  const normalizeButtonOpacity = (opacity: unknown) => {
    const numericOpacity = Number(opacity);
    return Number.isFinite(numericOpacity) ? Math.max(0.2, Math.min(1, numericOpacity)) : defaultAppSettings.buttonOpacity;
  };

  const normalizeButtonTransparency = (opacity: unknown) => {
    const numericOpacity = Number(opacity);
    return Number.isFinite(numericOpacity) ? Math.max(0.2, Math.min(1, numericOpacity)) : defaultAppSettings.buttonTransparency;
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const settings = await getAppSettings();
      if (active) {
        setThemeVariantState(settings.themeVariant);
        setThemeStyleState(settings.themeStyle);
        setBackgroundPhotoUriState(settings.backgroundPhotoUri ?? '');
        setButtonOpacityState(normalizeButtonOpacity(settings.buttonOpacity));
        setButtonTransparencyState(normalizeButtonTransparency(settings.buttonTransparency));
        setCustomThemeState(settings.customTheme);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
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
      setThemeVariant: async (variant) => {
        setThemeVariantState(variant);
        await updateAppSettings({ themeVariant: variant });
      },
      setThemeStyle: async (style) => {
        setThemeStyleState(style);
        await updateAppSettings({ themeStyle: style });
      },
      setBackgroundPhotoUri: async (uri) => {
        setBackgroundPhotoUriState(uri);
        await updateAppSettings({ backgroundPhotoUri: uri });
      },
      setButtonOpacity: async (opacity) => {
        const nextOpacity = normalizeButtonOpacity(opacity);
        setButtonOpacityState(nextOpacity);
        await updateAppSettings({ buttonOpacity: nextOpacity });
      },
      setButtonTransparency: async (opacity) => {
        const nextOpacity = normalizeButtonTransparency(opacity);
        setButtonTransparencyState(nextOpacity);
        await updateAppSettings({ buttonTransparency: nextOpacity });
      },
      setCustomTheme: async (nextCustomTheme) => {
        const next = { ...customTheme, ...nextCustomTheme };
        setCustomThemeState(next);
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
