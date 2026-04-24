import { useColorScheme } from 'react-native';

export type ThemeVariant = 'light' | 'custom' | 'parliament' | 'noir';
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
  bg: '#0D0F12',
  bgCard: '#16181D',
  bgCardAlt: '#1C1E24',
  border: 'rgba(255,255,255,0.06)',
  borderActive: '#8B7ED8',
  accent: '#8B7ED8',
  accentText: '#FFFFFF',
  green: '#5ECCA0',
  blue: '#6BA3E0',
  red: '#E87878',
  muted: '#6B7280',
  textPrimary: '#F2F4F6',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  pillBg: 'rgba(255,255,255,0.05)',
  pillActive: '#8B7ED8',
  pillActiveText: '#FFFFFF',
  progressBg: 'rgba(255,255,255,0.06)',
  progressFill: '#8B7ED8',
  navBg: '#0D0F12',
  navBorder: 'rgba(255,255,255,0.06)',
  navActive: '#8B7ED8',
  navInactive: '#6B7280',
};

const jour: typeof nuit = {
  bg: '#F5F6F8',
  bgCard: '#FFFFFF',
  bgCardAlt: '#F9FAFB',
  border: 'rgba(0,0,0,0.05)',
  borderActive: '#7C6FC4',
  accent: '#7C6FC4',
  accentText: '#FFFFFF',
  green: '#4AAE82',
  blue: '#5A8FD4',
  red: '#D46666',
  muted: '#8B9298',
  textPrimary: '#1A1D23',
  textSecondary: '#374151',
  textMuted: '#8B9298',
  pillBg: 'rgba(0,0,0,0.04)',
  pillActive: '#7C6FC4',
  pillActiveText: '#FFFFFF',
  progressBg: 'rgba(0,0,0,0.05)',
  progressFill: '#7C6FC4',
  navBg: '#FFFFFF',
  navBorder: 'rgba(0,0,0,0.06)',
  navActive: '#7C6FC4',
  navInactive: '#8B9298',
};

export const themes = { nuit, jour };
export type Theme = typeof nuit;

function withAlpha(hex: string, alpha: string) {
  if (!/^#([0-9a-f]{6})$/i.test(hex)) return hex;
  return `${hex}${alpha}`;
}

const variantOverrides: Record<ThemeVariant, Partial<Record<ThemePaletteMode, Partial<Theme>>>> = {
  light: {
    nuit: {
      bg: '#E5E5E5',
      bgCard: '#F2F2F2',
      bgCardAlt: '#DADADA',
      border: '#CFCFCF',
      borderActive: '#1F5EDC',
      accent: '#1F5EDC',
      accentText: '#FFFFFF',
      blue: '#1F5EDC',
      green: '#4C9B7C',
      red: '#CF4B4B',
      muted: '#4F5A66',
      textPrimary: '#1A1A1A',
      textSecondary: '#222222',
      textMuted: '#5E5E5E',
      pillBg: '#D5D5D5',
      pillActive: '#1F5EDC',
      pillActiveText: '#FFFFFF',
      progressBg: '#D5D5D5',
      progressFill: '#1F5EDC',
      navBg: '#EFEFEF',
      navBorder: '#CFCFCF',
      navActive: '#1F5EDC',
      navInactive: '#5E5E5E',
    },
    jour: {
      bg: '#E5E5E5',
      bgCard: '#F7F7F7',
      bgCardAlt: '#EEEEEE',
      border: '#D0D0D0',
      borderActive: '#1F5EDC',
      accent: '#1F5EDC',
      accentText: '#FFFFFF',
      blue: '#1F5EDC',
      green: '#4C9B7C',
      red: '#CF4B4B',
      muted: '#55606B',
      textPrimary: '#1A1A1A',
      textSecondary: '#262626',
      textMuted: '#646464',
      pillBg: '#D9D9D9',
      pillActive: '#1F5EDC',
      pillActiveText: '#FFFFFF',
      progressBg: '#D9D9D9',
      progressFill: '#1F5EDC',
      navBg: '#F5F5F5',
      navBorder: '#D0D0D0',
      navActive: '#1F5EDC',
      navInactive: '#646464',
    },
  },
  custom: {
    nuit: {
      bg: '#13294B',
      bgCard: '#173458',
      bgCardAlt: '#1B4066',
      border: '#00E5FF',
      borderActive: '#00E5FF',
      accent: '#00C2E0',
      accentText: '#071A2A',
      blue: '#00E5FF',
      green: '#6FE3D6',
      red: '#F56C6C',
      muted: '#93AFC8',
      textPrimary: '#F7FBFF',
      textSecondary: '#DCEBFA',
      textMuted: '#A6BED3',
      pillBg: '#21466E',
      pillActive: '#00C2E0',
      pillActiveText: '#071A2A',
      progressBg: '#21466E',
      progressFill: '#00C2E0',
      navBg: '#173458',
      navBorder: '#00E5FF',
      navActive: '#00E5FF',
      navInactive: '#9CB6CA',
    },
    jour: {
      bg: '#EAF4FA',
      bgCard: '#F4FAFD',
      bgCardAlt: '#DDEFFA',
      border: '#00E5FF',
      borderActive: '#00E5FF',
      accent: '#00C2E0',
      accentText: '#062030',
      blue: '#00A9D0',
      green: '#4FB9A8',
      red: '#DE5F5F',
      muted: '#44657E',
      textPrimary: '#0F2134',
      textSecondary: '#17314A',
      textMuted: '#53718B',
      pillBg: '#D2EAF4',
      pillActive: '#00C2E0',
      pillActiveText: '#062030',
      progressBg: '#D2EAF4',
      progressFill: '#00C2E0',
      navBg: '#F4FAFD',
      navBorder: '#A9EFFF',
      navActive: '#00C2E0',
      navInactive: '#53718B',
    },
  },
  parliament: {
    nuit: {
      bg: '#2B124C',
      bgCard: '#34195A',
      bgCardAlt: '#41206F',
      border: '#6D28D9',
      borderActive: '#F5C518',
      accent: '#F5C518',
      accentText: '#231032',
      blue: '#8B5CF6',
      green: '#76BFA0',
      red: '#EC6C8C',
      muted: '#C0ABD7',
      textPrimary: '#FFF8E8',
      textSecondary: '#F1E7D0',
      textMuted: '#D0C1E2',
      pillBg: '#4A257B',
      pillActive: '#F5C518',
      pillActiveText: '#231032',
      progressBg: '#4A257B',
      progressFill: '#F5C518',
      navBg: '#34195A',
      navBorder: '#6D28D9',
      navActive: '#F5C518',
      navInactive: '#D0C1E2',
    },
    jour: {
      bg: '#F6F0FB',
      bgCard: '#FBF8FE',
      bgCardAlt: '#EFE4FA',
      border: '#B794F4',
      borderActive: '#F5C518',
      accent: '#F5C518',
      accentText: '#2A1738',
      blue: '#6D28D9',
      green: '#6AAE94',
      red: '#D85F75',
      muted: '#765C95',
      textPrimary: '#2B124C',
      textSecondary: '#3F215F',
      textMuted: '#7B6798',
      pillBg: '#E9DCF8',
      pillActive: '#F5C518',
      pillActiveText: '#2A1738',
      progressBg: '#E9DCF8',
      progressFill: '#F5C518',
      navBg: '#FBF8FE',
      navBorder: '#D9C3F5',
      navActive: '#F5C518',
      navInactive: '#7B6798',
    },
  },
  noir: {
    nuit: {
      bg: '#121212',
      bgCard: '#1A1A1A',
      bgCardAlt: '#202020',
      border: '#FF7A1A',
      borderActive: '#FF7A1A',
      accent: '#FF6A00',
      accentText: '#FFFFFF',
      blue: '#FF9A4D',
      green: '#7FC8A0',
      red: '#FF775F',
      muted: '#B1B1B1',
      textPrimary: '#F7F7F7',
      textSecondary: '#E8E8E8',
      textMuted: '#B5B5B5',
      pillBg: '#252525',
      pillActive: '#FF6A00',
      pillActiveText: '#FFFFFF',
      progressBg: '#252525',
      progressFill: '#FF6A00',
      navBg: '#181818',
      navBorder: '#FF7A1A',
      navActive: '#FF6A00',
      navInactive: '#A8A8A8',
    },
    jour: {
      bg: '#F4EFEA',
      bgCard: '#FBF7F2',
      bgCardAlt: '#EEE4DA',
      border: '#FFB072',
      borderActive: '#FF7A1A',
      accent: '#FF6A00',
      accentText: '#FFFFFF',
      blue: '#F28B38',
      green: '#5F9478',
      red: '#E26D56',
      muted: '#6C6158',
      textPrimary: '#201914',
      textSecondary: '#342822',
      textMuted: '#756A61',
      pillBg: '#E7DBD0',
      pillActive: '#FF6A00',
      pillActiveText: '#FFFFFF',
      progressBg: '#E7DBD0',
      progressFill: '#FF6A00',
      navBg: '#FBF7F2',
      navBorder: '#E4C3A7',
      navActive: '#FF6A00',
      navInactive: '#756A61',
    },
  },
};

export const themeVariantDescriptions: Record<ThemeVariant, { label: string; description: string; emoji: string }> = {
  light: {
    label: 'Light',
    emoji: 'Light',
    description: 'Soft neutral background with clean blue accents and dark readable text.',
  },
  custom: {
    label: 'Custom',
    emoji: 'Custom',
    description: 'Deep blue base with bright cyan accents and a vivid aqua border.',
  },
  parliament: {
    label: 'Parliament',
    emoji: 'Gold',
    description: 'Royal violet surfaces with elegant golden contrast and purple framing.',
  },
  noir: {
    label: 'Noir',
    emoji: 'Noir',
    description: 'Near-black surfaces with warm orange emphasis and strong edge contrast.',
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
      bg: isDark ? '#0B0F15' : '#F5F5F0',
      bgCard: isDark ? '#161B22' : '#FFFFFF',
      bgCardAlt: isDark ? '#1C2128' : '#F0EFE9',
      border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(224, 221, 213, 0.86)',
      navBg: isDark ? '#161B22' : '#FFFFFF',
      pillBg: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E8E6DF',
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
  variant: ThemeVariant = 'noir',
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
