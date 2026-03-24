import { useColorScheme } from 'react-native';

export const themeTokens = {
  light: {
    colors: {
      background: '#f6f4ef',
      backgroundAlt: '#eef5ff',
      surface: '#ffffff',
      text: '#132033',
      muted: '#667085',
      border: '#e6e0d7',
      primary: '#0b84ff',
      primarySoft: '#dcebff',
      secondary: '#ff8f5a',
      secondarySoft: '#ffe7db',
      success: '#1c9b6c',
      successSoft: '#d7f2e7',
      warning: '#d98f14',
      warningSoft: '#ffefc8',
      danger: '#d84c4c',
      dangerSoft: '#ffe0e0',
      cardBorder: 'rgba(19, 32, 51, 0.08)',
    },
    gradients: {
      page: ['#f7f5f0', '#edf4ff', '#f8f2ea'] as const,
      hero: ['#14304f', '#0b84ff'] as const,
    },
  },
  dark: {
    colors: {
      background: '#0b1220',
      backgroundAlt: '#111d33',
      surface: '#111b2d',
      text: '#f4f7fb',
      muted: '#b8c3d9',
      border: 'rgba(184, 195, 217, 0.18)',
      primary: '#79b8ff',
      primarySoft: 'rgba(121, 184, 255, 0.14)',
      secondary: '#ff9d6e',
      secondarySoft: 'rgba(255, 157, 110, 0.16)',
      success: '#4dd29a',
      successSoft: 'rgba(77, 210, 154, 0.16)',
      warning: '#f2c86f',
      warningSoft: 'rgba(242, 200, 111, 0.16)',
      danger: '#ff8080',
      dangerSoft: 'rgba(255, 128, 128, 0.16)',
      cardBorder: 'rgba(255, 255, 255, 0.08)',
    },
    gradients: {
      page: ['#0b1220', '#111d33', '#0f172a'] as const,
      hero: ['#0c1b35', '#1b4f86'] as const,
    },
  },
} as const;

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
