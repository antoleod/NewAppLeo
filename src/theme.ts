import { useColorScheme } from 'react-native';

export type ThemeVariant = 'sage' | 'rose' | 'navy' | 'sand' | 'mint' | 'coral' | 'plum';
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
  green: '#3FB950',
  blue: '#58A6FF',
  red: '#E74C3C',
  yellow: '#F2C86F',
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
  green: '#2D7A3A',
  blue: '#1A5FA5',
  red: '#C0392B',
  yellow: '#B07418',
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
      bg: '#0D1210',
      bgCard: '#131A17',
      bgCardAlt: '#1B2A24',
      border: '#1D2921',
      accent: '#4d7c6b',
      blue: '#c18f54',
      green: '#74C69D',
      borderActive: '#4d7c6b',
    },
    jour: {
      bg: '#F2F5F1',
      bgCard: '#FAFDF9',
      bgCardAlt: '#EEF4EF',
      border: '#DDE5DE',
      accent: '#4d7c6b',
      blue: '#c18f54',
      green: '#2F7D57',
      borderActive: '#4d7c6b',
    },
  },
  rose: {
    nuit: {
      bg: '#120D10',
      bgCard: '#1A1318',
      bgCardAlt: '#241A1F',
      border: '#261D23',
      accent: '#D08BA0',
      green: '#66C28F',
      blue: '#E8A1C3',
      borderActive: '#D08BA0',
    },
    jour: {
      bg: '#F7F2F4',
      bgCard: '#FFF8FA',
      bgCardAlt: '#F7ECEF',
      border: '#E8D8DF',
      accent: '#B95B74',
      green: '#3D865A',
      blue: '#D97998',
      borderActive: '#B95B74',
    },
  },
  navy: {
    nuit: {
      bg: '#0C0F14',
      bgCard: '#121720',
      bgCardAlt: '#132033',
      border: '#1A2535',
      accent: '#8EB5EA',
      blue: '#7CC2FF',
      green: '#6EC994',
      borderActive: '#8EB5EA',
    },
    jour: {
      bg: '#F1F3F7',
      bgCard: '#F8FAFD',
      bgCardAlt: '#EEF3F8',
      border: '#D5DDE8',
      accent: '#1D4E89',
      blue: '#2D78D0',
      green: '#2D7A3A',
      borderActive: '#1D4E89',
    },
  },
  sand: {
    nuit: {
      bg: '#130F0A',
      bgCard: '#1C1510',
      bgCardAlt: '#201B16',
      border: '#2A2018',
      accent: '#D9B97D',
      green: '#7AB58E',
      blue: '#E8C493',
      yellow: '#F5A623',
      borderActive: '#D9B97D',
    },
    jour: {
      bg: '#F7F4EF',
      bgCard: '#FFFDF8',
      bgCardAlt: '#F6F0E6',
      border: '#E5DDD0',
      accent: '#8C6B3F',
      green: '#4B8A59',
      blue: '#B89968',
      yellow: '#A35F00',
      borderActive: '#8C6B3F',
    },
  },
  mint: {
    nuit: {
      bg: '#071210',
      bgCard: '#0F1D1A',
      bgCardAlt: '#172C27',
      border: '#1D3A32',
      accent: '#5ED6B3',
      green: '#7BE0B6',
      blue: '#75B8D8',
      yellow: '#E3C36C',
      borderActive: '#5ED6B3',
    },
    jour: {
      bg: '#EEF8F4',
      bgCard: '#FAFFFD',
      bgCardAlt: '#E3F2EC',
      border: '#CDE2D8',
      accent: '#247C68',
      green: '#2E8A5B',
      blue: '#2F82A1',
      yellow: '#A56A19',
      borderActive: '#247C68',
    },
  },
  coral: {
    nuit: {
      bg: '#160C0B',
      bgCard: '#211311',
      bgCardAlt: '#301B18',
      border: '#3B231F',
      accent: '#EE8A72',
      green: '#7BC99A',
      blue: '#F0B17D',
      yellow: '#F5C15F',
      borderActive: '#EE8A72',
    },
    jour: {
      bg: '#FFF3EF',
      bgCard: '#FFFBF8',
      bgCardAlt: '#F8E6DF',
      border: '#E8CFC5',
      accent: '#C85D45',
      green: '#3C8659',
      blue: '#B9774A',
      yellow: '#A96715',
      borderActive: '#C85D45',
    },
  },
  plum: {
    nuit: {
      bg: '#100D16',
      bgCard: '#191421',
      bgCardAlt: '#231C2D',
      border: '#30273B',
      accent: '#BFA1F2',
      green: '#82C99B',
      blue: '#9CC1F3',
      yellow: '#DDBB72',
      borderActive: '#BFA1F2',
    },
    jour: {
      bg: '#F7F3FB',
      bgCard: '#FEFBFF',
      bgCardAlt: '#EFE8F6',
      border: '#DED2EA',
      accent: '#7652A6',
      green: '#3E805A',
      blue: '#5F77B5',
      yellow: '#946A1C',
      borderActive: '#7652A6',
    },
  },
};

/**
 * Returns the three preview swatches for a theme variant in a given palette mode.
 * Reads directly from the base theme + variantOverrides so the carousel preview
 * in settings always reflects the actual applied colors.
 */
export function getVariantSwatches(
  variant: ThemeVariant,
  paletteMode: ThemePaletteMode,
): [string, string, string] {
  const base = themes[paletteMode];
  const override = variantOverrides[variant]?.[paletteMode] ?? {};
  const bg = override.bg ?? base.bg;
  const bgCard = override.bgCard ?? base.bgCard;
  const accent = override.accent ?? base.accent;
  return [bg, bgCard, accent];
}

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
  mint: {
    label: 'Mint',
    emoji: '🌱',
    description: 'Fresh mint and aqua tones - clean, bright, and easy to scan',
  },
  coral: {
    label: 'Coral',
    emoji: '🪸',
    description: 'Soft coral warmth with grounded contrast for a friendlier feel',
  },
  plum: {
    label: 'Plum',
    emoji: '🫐',
    description: 'Deep plum with cool accents - calm, premium, and focused',
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
    warning: theme.yellow,
    warningSoft: withAlpha(theme.yellow, '22'),
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
    // "Portrait" — photo visible, cards with sufficient contrast for readability
    return {
      ...theme,
      bg: isDark ? 'rgba(6, 8, 12, 0.12)' : 'rgba(255, 255, 255, 0.06)',
      bgCard: isDark ? 'rgba(10, 14, 20, 0.82)' : 'rgba(255, 255, 255, 0.90)',
      bgCardAlt: isDark ? 'rgba(18, 22, 30, 0.72)' : 'rgba(255, 255, 255, 0.80)',
      border: isDark ? 'rgba(255, 255, 255, 0.24)' : 'rgba(72, 92, 84, 0.36)',
      navBg: isDark ? 'rgba(8, 12, 18, 0.88)' : 'rgba(255, 255, 255, 0.92)',
      pillBg: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.72)',
      progressBg: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.62)',
      textSecondary: isDark ? '#F0F5F8' : '#111827',
      textMuted: isDark ? '#D9E2EA' : '#1F2937',
      muted: isDark ? '#D9E2EA' : '#1F2937',
    } as Theme;
  }

  if (defaultMode) {
    // "Frosted Glass" — professional blur effect with improved text contrast
    return {
      ...theme,
      bg: isDark ? 'rgba(6, 8, 12, 0.08)' : 'rgba(255, 255, 255, 0.06)',
      bgCard: isDark ? 'rgba(18, 24, 32, 0.84)' : 'rgba(255, 255, 255, 0.90)',
      bgCardAlt: isDark ? 'rgba(26, 32, 42, 0.72)' : 'rgba(248, 246, 240, 0.82)',
      border: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(72, 92, 84, 0.30)',
      navBg: isDark ? 'rgba(14, 18, 26, 0.90)' : 'rgba(255, 255, 255, 0.94)',
      pillBg: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.68)',
      progressBg: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(230, 228, 220, 0.72)',
      textSecondary: isDark ? '#E2E8F0' : '#1A202C',
      textMuted: isDark ? '#C4CDD8' : '#2D3748',
      muted: isDark ? '#C4CDD8' : '#2D3748',
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
    navActive: variantTheme.accent ?? baseTheme.accent,
    navBg: variantTheme.bgCard ?? baseTheme.bgCard,
    navBorder: variantTheme.border ?? baseTheme.border,
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
