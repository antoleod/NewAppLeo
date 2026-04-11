import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useAuth } from './AuthContext';
import { getThemeTokens, type Theme, type ThemePaletteMode, type ThemeStyle, type ThemeVariant } from '@/theme';
import { ThemeMode } from '@/types';
import { defaultAppSettings, getAppSettings, setAppSettings } from '@/lib/storage';

interface ThemeContextValue {
  mode: 'light' | 'dark';
  paletteMode: ThemePaletteMode;
  themeMode: ThemeMode;
  themeVariant: ThemeVariant;
  themeStyle: ThemeStyle;
  backgroundPhotoUri: string;
  setThemeVariant: (variant: ThemeVariant) => Promise<void>;
  setThemeStyle: (style: ThemeStyle) => Promise<void>;
  setBackgroundPhotoUri: (uri: string) => Promise<void>;
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
  const [customTheme, setCustomThemeState] = useState(defaultAppSettings.customTheme);
  const themeMode = profile?.themeMode ?? 'system';
  const resolvedMode = themeMode === 'system' ? systemScheme ?? 'light' : themeMode;

  useEffect(() => {
    let active = true;
    (async () => {
      const settings = await getAppSettings();
      if (active) {
        setThemeVariantState(settings.themeVariant);
        setThemeStyleState(settings.themeStyle);
        setBackgroundPhotoUriState(settings.backgroundPhotoUri ?? '');
        setCustomThemeState(settings.customTheme);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const tokens = getThemeTokens(resolvedMode, themeVariant, customTheme, themeStyle);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode: resolvedMode === 'dark' ? 'dark' : 'light',
      paletteMode: tokens.paletteMode,
      themeMode,
      themeVariant,
      themeStyle,
      backgroundPhotoUri,
      setThemeVariant: async (variant) => {
        setThemeVariantState(variant);
        const settings = await getAppSettings();
        await setAppSettings({ ...settings, themeVariant: variant });
      },
      setThemeStyle: async (style) => {
        setThemeStyleState(style);
        const settings = await getAppSettings();
        await setAppSettings({ ...settings, themeStyle: style });
      },
      setBackgroundPhotoUri: async (uri) => {
        setBackgroundPhotoUriState(uri);
        const settings = await getAppSettings();
        await setAppSettings({ ...settings, backgroundPhotoUri: uri });
      },
      setCustomTheme: async (nextCustomTheme) => {
        const next = { ...customTheme, ...nextCustomTheme };
        setCustomThemeState(next);
        const settings = await getAppSettings();
        await setAppSettings({ ...settings, customTheme: next });
      },
      toggleTheme: async () => {
        const nextMode: ThemeMode = resolvedMode === 'dark' ? 'light' : 'dark';
        await setThemeMode(nextMode);
      },
      theme: tokens.theme,
      colors: tokens.colors,
      gradients: tokens.gradients,
    }),
    [backgroundPhotoUri, customTheme, resolvedMode, setThemeMode, themeMode, themeStyle, themeVariant, tokens],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
}
