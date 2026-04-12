import { useColorScheme } from 'react-native';

export type ThemeVariant = 'sage' | 'rose' | 'navy' | 'sand';
export type ThemePaletteMode = 'nuit' | 'jour';
export type ThemeStyle = 'default' | 'photo' | 'classic';

export interface CustomThemeOverride {
  enabled?: boolean;
  primary?: string;
  secondary?: string;
  backgroundAlt?: string;
}

export interface ThemeSurfaceStyle {
  surfaceMode: ThemeStyle;
}

const nuit = {
  bg: '#0D1117',
  bgCard: '#161B22',
  bgCardAlt: '#1C2128',
  border: '#21262D',
  borderActive: '#C9A227',
  accent: '#C9A227',
  accentText: '#0D1117',
  green: '#B88A2A',
  blue: '#58A6FF',
  red: '#E74C3C',
  muted: '#8B949E',
  textPrimary: '#FFFFFF',
  textSecondary: '#C9D1D9',
  textMuted: '#8B949E',
  pillBg: '#21262D',
  pillActive: '#C9A227',
  pillActiveText: '#0D1117',
  progressBg: '#21262D',
  progressFill: '#C9A227',
  navBg: '#161B22',
  navBorder: '#21262D',
  navActive: '#C9A227',
  navInactive: '#8B949E',
};

const jour: typeof nuit = {
  bg: '#F5F5F0',
  bgCard: '#FFFFFF',
  bgCardAlt: '#F0EFE9',
  border: '#E0DDD5',
  borderActive: '#8B6914',
  accent: '#8B6914',
  accentText: '#FFFFFF',
  green: '#8C6B14',
  blue: '#1A5FA5',
  red: '#C0392B',
  muted: '#6B7280',
  textPrimary: '#111111',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  pillBg: '#E8E6DF',
  pillActive: '#8B6914',
  pillActiveText: '#FFFFFF',
  progressBg: '#E0DDD5',
  progressFill: '#8B6914',
  navBg: '#FFFFFF',
  navBorder: '#E0DDD5',
  navActive: '#8B6914',
  navInactive: '#9CA3AF',
};

export const themes = { nuit, jour };
export type Theme = typeof nuit;

function withAlpha(hex: string, alpha: string) {
  if (!/^#([0-9a-f]{6})$/i.test(hex)) return hex;
  return `${hex}${alpha}`;
}

const variantOverrides: Record<ThemeVariant, Partial<Record<ThemePaletteMode, Partial<Theme>>>> = {
  sage: {
    nuit: { 
      accent: '#4d7c6b', 
      blue: '#c18f54', 
      green: '#C9A227', 
      bgCardAlt: '#1B2A24',
      borderActive: '#4d7c6b',
    },
    jour: { 
      accent: '#4d7c6b', 
      blue: '#c18f54', 
      green: '#B88A2A', 
      bgCardAlt: '#EEF4EF',
      borderActive: '#4d7c6b',
    },
  },
  rose: {
    nuit: { 
      accent: '#D08BA0', 
      green: '#C9A227', 
      bgCardAlt: '#241A1F',
      blue: '#E8A1C3',
      borderActive: '#D08BA0',
    },
    jour: { 
      accent: '#B95B74', 
      green: '#B88A2A', 
      bgCardAlt: '#F7ECEF',
      blue: '#D97998',
      borderActive: '#B95B74',
    },
  },
  navy: {
    nuit: { 
      accent: '#8EB5EA', 
      blue: '#7CC2FF', 
      bgCardAlt: '#132033',
      green: '#C9A227',
      borderActive: '#8EB5EA',
    },
    jour: { 
      accent: '#1D4E89', 
      blue: '#2D78D0', 
      bgCardAlt: '#EEF3F8',
      green: '#B88A2A',
      borderActive: '#1D4E89',
    },
  },
  sand: {
    nuit: { 
      accent: '#D9B97D', 
      green: '#C9A227', 
      bgCardAlt: '#201B16',
      blue: '#E8C493',
      borderActive: '#D9B97D',
    },
    jour: { 
      accent: '#8C6B3F', 
      green: '#B88A2A', 
      bgCardAlt: '#F6F0E6',
      blue: '#B89968',
      borderActive: '#8C6B3F',
    },
  },
};

export const themeVariantDescriptions: Record<ThemeVariant, { label: string; description: string; emoji: string }> = {
  sage: {
    label: 'Sage',
    emoji: '🌿',
    description: 'Calming greens and earthy tones – perfect for a soothing parenting experience',
  },
  rose: {
    label: 'Rose',
    emoji: '🌸',
    description: 'Warm pinks and natural accents – gentle and nurturing for baby care',
  },
  navy: {
    label: 'Navy',
    emoji: '🌊',
    description: 'Professional blues – structured and clear for organized tracking',
  },
  sand: {
    label: 'Sand',
    emoji: '🏜️',
    description: 'Warm neutrals – cozy and natural, inspired by desert sunsets',
  },
};

function toCompatColors(theme: Theme) {
  return {
    background: theme.bg,
    backgroundAlt: theme.bgCardAlt,
    surface: theme.bgCard,
    text: theme.textPrimary,
    muted: theme.textMuted,
    border: theme.border,
    primary: theme.accent,
    primarySoft: withAlpha(theme.accent, '22'),
    secondary: theme.blue,
    secondarySoft: withAlpha(theme.blue, '22'),
    success: theme.green,
    successSoft: withAlpha(theme.green, '22'),
    warning: theme.accent,
    warningSoft: withAlpha(theme.accent, '22'),
    danger: theme.red,
    dangerSoft: withAlpha(theme.red, '22'),
    cardBorder: theme.border,
  };
}

function applySurfaceStyle(theme: Theme, paletteMode: ThemePaletteMode, surfaceMode: ThemeStyle) {
  const photoMode = surfaceMode === 'photo';
  const defaultMode = surfaceMode === 'default';
  const isDark = paletteMode === 'nuit';

  if (surfaceMode === 'classic') {
    return theme;
  }

  if (photoMode) {
    return {
      ...theme,
      bg: isDark ? 'rgba(8, 10, 14, 0.18)' : 'rgba(255, 255, 255, 0.10)',
      bgCard: isDark ? 'rgba(18, 24, 31, 0.34)' : 'rgba(255, 255, 255, 0.44)',
      bgCardAlt: isDark ? 'rgba(27, 34, 43, 0.24)' : 'rgba(255, 255, 255, 0.28)',
      border: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.22)',
      navBg: isDark ? 'rgba(15, 20, 26, 0.48)' : 'rgba(255, 255, 255, 0.50)',
      pillBg: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.26)',
      progressBg: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.18)',
    } as Theme;
  }

  if (defaultMode) {
    return {
      ...theme,
      bg: isDark ? '#0B0F15' : 'rgba(245, 245, 240, 0.92)',
      bgCard: isDark ? 'rgba(22, 27, 34, 0.86)' : 'rgba(255, 255, 255, 0.92)',
      bgCardAlt: isDark ? 'rgba(28, 33, 40, 0.76)' : 'rgba(240, 239, 233, 0.82)',
      border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(224, 221, 213, 0.86)',
      navBg: isDark ? 'rgba(22, 27, 34, 0.90)' : 'rgba(255, 255, 255, 0.90)',
      pillBg: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(232, 230, 223, 0.88)',
      progressBg: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(224, 221, 213, 0.86)',
    } as Theme;
  }

  return theme;
}

function alphaFromTheme(theme: Theme, paletteMode: ThemePaletteMode, surfaceMode: ThemeStyle) {
  if (surfaceMode === 'classic') {
    return {
      page: [theme.bg, theme.bgCardAlt, theme.bg] as const,
      hero: [withAlpha(theme.accent, paletteMode === 'nuit' ? '88' : 'DD').slice(0, 7), theme.accent] as const,
    };
  }

  const baseOverlay = paletteMode === 'nuit' ? 'rgba(4, 7, 10, 0.12)' : 'rgba(255, 255, 255, 0.14)';
  return {
    page: [baseOverlay, 'rgba(0,0,0,0.04)', baseOverlay] as const,
    hero: [withAlpha(theme.accent, paletteMode === 'nuit' ? '66' : 'AA').slice(0, 7), theme.accent] as const,
  };
}

export function getThemeTokens(
  resolvedMode: 'light' | 'dark',
  variant: ThemeVariant = 'sage',
  custom?: CustomThemeOverride,
  surfaceMode: ThemeStyle = 'default',
) {
  const paletteMode: ThemePaletteMode = resolvedMode === 'dark' ? 'nuit' : 'jour';
  const baseTheme = themes[paletteMode];
  const variantTheme = variantOverrides[variant]?.[paletteMode] ?? {};
  const nextTheme: Theme = {
    ...baseTheme,
    ...variantTheme,
  };

  if (custom?.enabled) {
    if (custom.primary) {
      nextTheme.accent = custom.primary;
      nextTheme.borderActive = custom.primary;
      nextTheme.progressFill = custom.primary;
      nextTheme.pillActive = custom.primary;
      nextTheme.navActive = custom.primary;
    }
    if (custom.secondary) {
      nextTheme.blue = custom.secondary;
    }
    if (custom.backgroundAlt) {
      nextTheme.bgCardAlt = custom.backgroundAlt;
    }
  }

  const themedSurface = applySurfaceStyle(nextTheme, paletteMode, surfaceMode);

  return {
    theme: themedSurface,
    colors: toCompatColors(themedSurface),
    gradients: alphaFromTheme(themedSurface, paletteMode, surfaceMode),
    paletteMode,
    surfaceMode,
  };
}

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export function useResolvedThemeMode(resolvedMode?: 'light' | 'dark' | null) {
  const systemScheme = useColorScheme();
  return resolvedMode ?? systemScheme ?? 'light';
}
