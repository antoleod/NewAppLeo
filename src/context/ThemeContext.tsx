import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useAuth } from './AuthContext';
import { getThemeTokens, type ThemeVariant } from '@/theme';
import { ThemeMode } from '@/types';
import { defaultAppSettings, getAppSettings, setAppSettings } from '@/lib/storage';

interface ThemeContextValue {
  mode: 'light' | 'dark';
  themeMode: ThemeMode;
  themeVariant: ThemeVariant;
  setThemeVariant: (variant: ThemeVariant) => Promise<void>;
  colors: any;
  gradients: any;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const systemScheme = useColorScheme();
  const [themeVariant, setThemeVariantState] = useState<ThemeVariant>(defaultAppSettings.themeVariant);
  const themeMode = profile?.themeMode ?? 'system';
  const resolvedMode = themeMode === 'system' ? systemScheme ?? 'light' : themeMode;

  useEffect(() => {
    let active = true;
    (async () => {
      const settings = await getAppSettings();
      if (active) {
        setThemeVariantState(settings.themeVariant);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const tokens = getThemeTokens(resolvedMode, themeVariant);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode: resolvedMode === 'dark' ? 'dark' : 'light',
      themeMode,
      themeVariant,
      setThemeVariant: async (variant) => {
        setThemeVariantState(variant);
        const settings = await getAppSettings();
        await setAppSettings({ ...settings, themeVariant: variant });
      },
      colors: tokens.colors,
      gradients: tokens.gradients,
    }),
    [resolvedMode, themeMode, themeVariant, tokens],
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
