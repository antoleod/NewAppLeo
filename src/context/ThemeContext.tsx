import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useAuth } from './AuthContext';
import { getThemeTokens, type Theme, type ThemePaletteMode, type ThemeVariant } from '@/theme';
import { ThemeMode } from '@/types';
import { defaultAppSettings, getAppSettings, setAppSettings } from '@/lib/storage';

interface ThemeContextValue {
  mode: 'light' | 'dark';
  paletteMode: ThemePaletteMode;
  themeMode: ThemeMode;
  themeVariant: ThemeVariant;
  setThemeVariant: (variant: ThemeVariant) => Promise<void>;
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
  const [customTheme, setCustomThemeState] = useState(defaultAppSettings.customTheme);
  const themeMode = profile?.themeMode ?? 'system';
  const resolvedMode = themeMode === 'system' ? systemScheme ?? 'light' : themeMode;

  useEffect(() => {
    let active = true;
    (async () => {
      const settings = await getAppSettings();
      if (active) {
        setThemeVariantState(settings.themeVariant);
        setCustomThemeState(settings.customTheme);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const tokens = getThemeTokens(resolvedMode, themeVariant, customTheme);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode: resolvedMode === 'dark' ? 'dark' : 'light',
      paletteMode: tokens.paletteMode,
      themeMode,
      themeVariant,
      setThemeVariant: async (variant) => {
        setThemeVariantState(variant);
        const settings = await getAppSettings();
        await setAppSettings({ ...settings, themeVariant: variant });
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
    [customTheme, resolvedMode, setThemeMode, themeMode, themeVariant, tokens],
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
