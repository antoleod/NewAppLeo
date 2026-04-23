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
  highContrastMode: boolean;
  themeSyncError: string | null;
  setThemeVariant: (variant: ThemeVariant) => Promise<void>;
  setThemeStyle: (style: ThemeStyle) => Promise<void>;
  setBackgroundPhotoUri: (uri: string) => Promise<void>;
  setCustomTheme: (colors: { enabled?: boolean; primary?: string; secondary?: string; backgroundAlt?: string }) => Promise<void>;
  setHighContrastMode: (enabled: boolean) => Promise<void>;
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
  const [highContrastMode, setHighContrastModeState] = useState(defaultAppSettings.highContrastMode);
  const [themeSyncError, setThemeSyncError] = useState<string | null>(null);
  const themeMode = profile?.themeMode ?? 'system';
  const resolvedMode = themeMode === 'system' ? systemScheme ?? 'light' : themeMode;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const settings = await getAppSettings();
        if (active) {
          setThemeVariantState(settings.themeVariant);
          setThemeStyleState(settings.themeStyle);
          setBackgroundPhotoUriState(settings.backgroundPhotoUri ?? '');
          setCustomThemeState(settings.customTheme);
          setHighContrastModeState(settings.highContrastMode ?? false);
          setThemeSyncError(null);
        }
      } catch (error: any) {
        if (active) {
          setThemeSyncError(error?.code === 'permission-denied' ? 'no-permission' : 'sync-failed');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const tokens = getThemeTokens(resolvedMode, themeVariant, customTheme, themeStyle);
  const themeWithContrast = highContrastMode
    ? {
        ...tokens.theme,
        bg: resolvedMode === 'dark' ? '#081019' : '#FFFFFF',
        bgCard: resolvedMode === 'dark' ? '#101A26' : '#FFFFFF',
        bgCardAlt: resolvedMode === 'dark' ? '#162131' : '#F4F7F8',
        textPrimary: resolvedMode === 'dark' ? '#FFFFFF' : '#101418',
        textSecondary: resolvedMode === 'dark' ? '#EAF1F5' : '#20262C',
        textMuted: resolvedMode === 'dark' ? '#C7D3DA' : '#47515A',
        border: resolvedMode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)',
      }
    : tokens.theme;

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode: resolvedMode === 'dark' ? 'dark' : 'light',
      paletteMode: tokens.paletteMode,
      themeMode,
      themeVariant,
      themeStyle,
      backgroundPhotoUri,
      highContrastMode,
      themeSyncError,
      setThemeVariant: async (variant) => {
        setThemeVariantState(variant);
        try {
          await setAppSettings({ ...(await getAppSettings()), themeVariant: variant });
          setThemeSyncError(null);
        } catch (error: any) {
          setThemeSyncError(error?.code === 'permission-denied' ? 'no-permission' : 'sync-failed');
        }
      },
      setThemeStyle: async (style) => {
        setThemeStyleState(style);
        try {
          await setAppSettings({ ...(await getAppSettings()), themeStyle: style });
          setThemeSyncError(null);
        } catch (error: any) {
          setThemeSyncError(error?.code === 'permission-denied' ? 'no-permission' : 'sync-failed');
        }
      },
      setBackgroundPhotoUri: async (uri) => {
        setBackgroundPhotoUriState(uri);
        try {
          await setAppSettings({ ...(await getAppSettings()), backgroundPhotoUri: uri });
          setThemeSyncError(null);
        } catch (error: any) {
          setThemeSyncError(error?.code === 'permission-denied' ? 'no-permission' : 'sync-failed');
        }
      },
      setCustomTheme: async (nextCustomTheme) => {
        const next = { ...customTheme, ...nextCustomTheme };
        setCustomThemeState(next);
        try {
          await setAppSettings({ ...(await getAppSettings()), customTheme: next });
          setThemeSyncError(null);
        } catch (error: any) {
          setThemeSyncError(error?.code === 'permission-denied' ? 'no-permission' : 'sync-failed');
        }
      },
      setHighContrastMode: async (enabled) => {
        setHighContrastModeState(enabled);
        try {
          await setAppSettings({ ...(await getAppSettings()), highContrastMode: enabled });
          setThemeSyncError(null);
        } catch (error: any) {
          setThemeSyncError(error?.code === 'permission-denied' ? 'no-permission' : 'sync-failed');
        }
      },
      toggleTheme: async () => {
        const nextMode: ThemeMode = resolvedMode === 'dark' ? 'light' : 'dark';
        await setThemeMode(nextMode);
      },
      theme: themeWithContrast as Theme,
      colors: {
        ...tokens.colors,
        background: themeWithContrast.bg,
        backgroundAlt: themeWithContrast.bgCardAlt,
        surface: themeWithContrast.bgCard,
        text: themeWithContrast.textPrimary,
        muted: themeWithContrast.textMuted,
        border: themeWithContrast.border,
        primary: themeWithContrast.accent,
      },
      gradients: tokens.gradients,
    }),
    [backgroundPhotoUri, customTheme, highContrastMode, resolvedMode, setThemeMode, themeMode, themeStyle, themeVariant, themeWithContrast, themeSyncError, tokens],
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
