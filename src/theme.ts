import { useColorScheme } from 'react-native';

export type ThemeVariant = 'sage' | 'rose' | 'navy' | 'sand';

const baseTokens = {
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

const variantTokens: Record<ThemeVariant, { light: any; dark: any }> = {
  sage: {
    light: {
      colors: {
        primary: '#4d7c6b',
        primarySoft: '#dcece5',
        secondary: '#c18f54',
        secondarySoft: '#f6ead9',
        backgroundAlt: '#eef4ef',
        cardBorder: 'rgba(77, 124, 107, 0.10)',
      },
      gradients: {
        page: ['#f7f5f0', '#edf4ee', '#f6f1ea'] as const,
        hero: ['#244d43', '#4d7c6b'] as const,
      },
    },
    dark: {
      colors: {
        primary: '#8fd3bb',
        primarySoft: 'rgba(143, 211, 187, 0.15)',
        secondary: '#e3b37e',
        secondarySoft: 'rgba(227, 179, 126, 0.16)',
        backgroundAlt: '#10201c',
        cardBorder: 'rgba(143, 211, 187, 0.10)',
      },
      gradients: {
        page: ['#08110f', '#10231d', '#0f1a18'] as const,
        hero: ['#123c31', '#3a7a63'] as const,
      },
    },
  },
  rose: {
    light: {
      colors: {
        primary: '#b95b74',
        primarySoft: '#f7dde4',
        secondary: '#d98f57',
        secondarySoft: '#f9e7dd',
        backgroundAlt: '#f9eef2',
        cardBorder: 'rgba(185, 91, 116, 0.10)',
      },
      gradients: {
        page: ['#fbf6f8', '#f3e6ea', '#f8f2ef'] as const,
        hero: ['#7c3146', '#b95b74'] as const,
      },
    },
    dark: {
      colors: {
        primary: '#f29ab1',
        primarySoft: 'rgba(242, 154, 177, 0.15)',
        secondary: '#efb07b',
        secondarySoft: 'rgba(239, 176, 123, 0.16)',
        backgroundAlt: '#24151d',
        cardBorder: 'rgba(242, 154, 177, 0.10)',
      },
      gradients: {
        page: ['#120b10', '#23141d', '#20161c'] as const,
        hero: ['#5f2a3a', '#b95b74'] as const,
      },
    },
  },
  navy: {
    light: {
      colors: {
        primary: '#1d4e89',
        primarySoft: '#dce9f7',
        secondary: '#2d8c8c',
        secondarySoft: '#dcefee',
        backgroundAlt: '#eef3f8',
        cardBorder: 'rgba(29, 78, 137, 0.10)',
      },
      gradients: {
        page: ['#f5f8fb', '#e9f1f8', '#f4f8fb'] as const,
        hero: ['#153255', '#1d4e89'] as const,
      },
    },
    dark: {
      colors: {
        primary: '#91b7ea',
        primarySoft: 'rgba(145, 183, 234, 0.16)',
        secondary: '#5dc0c0',
        secondarySoft: 'rgba(93, 192, 192, 0.16)',
        backgroundAlt: '#111d33',
        cardBorder: 'rgba(145, 183, 234, 0.10)',
      },
      gradients: {
        page: ['#08111c', '#102035', '#111d33'] as const,
        hero: ['#132946', '#1d4e89'] as const,
      },
    },
  },
  sand: {
    light: {
      colors: {
        primary: '#8c6b3f',
        primarySoft: '#efe4d1',
        secondary: '#c97446',
        secondarySoft: '#f7e4d7',
        backgroundAlt: '#f6f0e6',
        cardBorder: 'rgba(140, 107, 63, 0.10)',
      },
      gradients: {
        page: ['#fbf7f0', '#f3eadc', '#f8f3ea'] as const,
        hero: ['#5b4427', '#8c6b3f'] as const,
      },
    },
    dark: {
      colors: {
        primary: '#d9b97d',
        primarySoft: 'rgba(217, 185, 125, 0.16)',
        secondary: '#e09c6b',
        secondarySoft: 'rgba(224, 156, 107, 0.16)',
        backgroundAlt: '#201b16',
        cardBorder: 'rgba(217, 185, 125, 0.10)',
      },
      gradients: {
        page: ['#0f0d0a', '#1b1712', '#17120f'] as const,
        hero: ['#3f3120', '#8c6b3f'] as const,
      },
    },
  },
};

export function getThemeTokens(mode: 'light' | 'dark', variant: ThemeVariant = 'sage') {
  const base = baseTokens[mode];
  const override = variantTokens[variant][mode];
  return {
    colors: {
      ...base.colors,
      ...override.colors,
    },
    gradients: {
      ...base.gradients,
      ...override.gradients,
    },
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
