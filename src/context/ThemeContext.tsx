import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useAuth } from './AuthContext';
import { themeTokens } from '@/theme';
import { ThemeMode } from '@/types';

interface ThemeContextValue {
  mode: 'light' | 'dark';
  themeMode: ThemeMode;
  colors: any;
  gradients: any;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const systemScheme = useColorScheme();
  const themeMode = profile?.themeMode ?? 'system';
  const resolvedMode = themeMode === 'system' ? systemScheme ?? 'light' : themeMode;
  const tokens = resolvedMode === 'dark' ? themeTokens.dark : themeTokens.light;

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode: resolvedMode === 'dark' ? 'dark' : 'light',
      themeMode,
      colors: tokens.colors,
      gradients: tokens.gradients,
    }),
    [resolvedMode, themeMode, tokens],
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
