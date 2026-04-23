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
  bg: '#0A0E1A',
  bgCard: '#141824',
  bgCardAlt: '#1A1F2E',
  border: '#2A3142',
  borderActive: '#6366F1',
  accent: '#6366F1',
  accentText: '#FFFFFF',
  green: '#10B981',
  blue: '#3B82F6',
  red: '#EF4444',
  muted: '#94A3B8',
  textPrimary: '#F8FAFC',
  textSecondary: '#E2E8F0',
  textMuted: '#94A3B8',
  pillBg: '#2A3142',
  pillActive: '#6366F1',
  pillActiveText: '#FFFFFF',
  progressBg: '#2A3142',
  progressFill: '#6366F1',
  navBg: '#141824',
  navBorder: '#2A3142',
  navActive: '#6366F1',
  navInactive: '#94A3B8',
};

const jour: typeof nuit = {
  bg: '#FAFBFC',
  bgCard: '#FFFFFF',
  bgCardAlt: '#F8FAFC',
  border: '#E2E8F0',
  borderActive: '#6366F1',
  accent: '#6366F1',
  accentText: '#FFFFFF',
  green: '#10B981',
  blue: '#3B82F6',
  red: '#EF4444',
  muted: '#64748B',
  textPrimary: '#0F172A',
  textSecondary: '#1E293B',
  textMuted: '#64748B',
  pillBg: '#E2E8F0',
  pillActive: '#6366F1',
  pillActiveText: '#FFFFFF',
  progressBg: '#E2E8F0',
  progressFill: '#6366F1',
  navBg: '#FFFFFF',
  navBorder: '#E2E8F0',
  navActive: '#6366F1',
  navInactive: '#64748B',
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
      accent: '#10B981',
      blue: '#06B6D4',
      green: '#10B981',
      bgCardAlt: '#0F2027',
      borderActive: '#10B981',
    },
    jour: {
      accent: '#10B981',
      blue: '#06B6D4',
      green: '#10B981',
      bgCardAlt: '#F0FDF4',
      borderActive: '#10B981',
    },
  },
  rose: {
    nuit: {
      accent: '#EC4899',
      green: '#10B981',
      bgCardAlt: '#1F0F14',
      blue: '#F472B6',
      borderActive: '#EC4899',
    },
    jour: {
      accent: '#EC4899',
      green: '#10B981',
      bgCardAlt: '#FDF2F8',
      blue: '#F9A8D4',
      borderActive: '#EC4899',
    },
  },
  navy: {
    nuit: {
      accent: '#3B82F6',
      blue: '#60A5FA',
      bgCardAlt: '#0F172A',
      green: '#10B981',
      borderActive: '#3B82F6',
    },
    jour: {
      accent: '#3B82F6',
      blue: '#60A5FA',
      bgCardAlt: '#EFF6FF',
      green: '#10B981',
      borderActive: '#3B82F6',
    },
  },
  sand: {
    nuit: {
      accent: '#F59E0B',
      green: '#10B981',
      bgCardAlt: '#1A1A0F',
      blue: '#FCD34D',
      borderActive: '#F59E0B',
    },
    jour: {
      accent: '#F59E0B',
      green: '#10B981',
      bgCardAlt: '#FFFBEB',
      blue: '#FDE68A',
      borderActive: '#F59E0B',
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
