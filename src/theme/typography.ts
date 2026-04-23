/**
 * Typography system with mandatory SF Pro Display font
 * All text components must use these typography styles
 */

export interface TypographyVariant {
  fontFamily: string;
  fontSize: number;
  fontWeight: string | number;
  lineHeight: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export interface TypographyScale {
  heading1: TypographyVariant;
  heading2: TypographyVariant;
  heading3: TypographyVariant;
  heading4: TypographyVariant;
  title: TypographyVariant;
  subtitle: TypographyVariant;
  body: TypographyVariant;
  caption: TypographyVariant;
  label: TypographyVariant;
  small: TypographyVariant;
  tiny: TypographyVariant;
}

/**
 * SF Pro Display font weights
 */
export const FONT_WEIGHTS = {
  ultralight: '100',
  thin: '200',
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
  black: '900',
} as const;

/**
 * SF Pro Display font family
 * Using system font stack with SF Pro Display as primary
 */
export const FONT_FAMILY = {
  primary: 'SF Pro Display', // Primary font
  system: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif', // Fallback stack
  mono: '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace', // Monospace fallback
} as const;

/**
 * Typography scale with SF Pro Display
 * All sizes are optimized for mobile readability
 */
export const TYPOGRAPHY: TypographyScale = {
  heading1: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: 32,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 40,
  },
  heading2: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: 28,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 36,
  },
  heading3: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: 24,
    fontWeight: FONT_WEIGHTS.semibold,
    lineHeight: 32,
  },
  heading4: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: 20,
    fontWeight: FONT_WEIGHTS.semibold,
    lineHeight: 28,
  },
  title: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: 18,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: 24,
  },
  subtitle: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: 16,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: 22,
  },
  body: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: 15,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: 20,
  },
  caption: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: 13,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: 18,
  },
  label: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.semibold,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  small: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: 11,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: 14,
  },
  tiny: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: 12,
  },
};

/**
 * Responsive typography adjustments
 */
export const RESPONSIVE_TYPOGRAPHY = {
  compact: {
    heading1: { ...TYPOGRAPHY.heading1, fontSize: 28 },
    heading2: { ...TYPOGRAPHY.heading2, fontSize: 24 },
    heading3: { ...TYPOGRAPHY.heading3, fontSize: 20 },
    heading4: { ...TYPOGRAPHY.heading4, fontSize: 18 },
    title: { ...TYPOGRAPHY.title, fontSize: 16 },
    subtitle: { ...TYPOGRAPHY.subtitle, fontSize: 15 },
    body: { ...TYPOGRAPHY.body, fontSize: 14 },
  },
  large: {
    heading1: { ...TYPOGRAPHY.heading1, fontSize: 36 },
    heading2: { ...TYPOGRAPHY.heading2, fontSize: 32 },
    heading3: { ...TYPOGRAPHY.heading3, fontSize: 28 },
    heading4: { ...TYPOGRAPHY.heading4, fontSize: 22 },
    title: { ...TYPOGRAPHY.title, fontSize: 20 },
    subtitle: { ...TYPOGRAPHY.subtitle, fontSize: 18 },
    body: { ...TYPOGRAPHY.body, fontSize: 16 },
  },
};

/**
 * Typography utilities
 */
export const typographyUtils = {
  /**
   * Get typography style for a variant
   */
  getStyle: (variant: keyof TypographyScale, responsive?: 'compact' | 'large'): TypographyVariant => {
    if (responsive && RESPONSIVE_TYPOGRAPHY[responsive]) {
      const responsiveStyles = RESPONSIVE_TYPOGRAPHY[responsive];
      return responsiveStyles[variant as keyof typeof responsiveStyles] || TYPOGRAPHY[variant];
    }
    return TYPOGRAPHY[variant];
  },

  /**
   * Create custom typography style
   */
  create: (overrides: Partial<TypographyVariant>): TypographyVariant => {
    return {
      fontFamily: FONT_FAMILY.primary,
      fontSize: 15,
      fontWeight: FONT_WEIGHTS.regular,
      lineHeight: 20,
      ...overrides,
    };
  },

  /**
   * Validate if a font weight is valid for SF Pro Display
   */
  isValidWeight: (weight: string | number): boolean => {
    return Object.values(FONT_WEIGHTS).includes(weight as typeof FONT_WEIGHTS[keyof typeof FONT_WEIGHTS]);
  },

  /**
   * Get font family with fallbacks
   */
  getFontFamily: (variant: 'primary' | 'system' | 'mono' = 'primary'): string => {
    return FONT_FAMILY[variant];
  },
};

/**
 * Typography hooks for React components
 */
export const useTypography = () => {
  return {
    typography: TYPOGRAPHY,
    responsive: RESPONSIVE_TYPOGRAPHY,
    utils: typographyUtils,
    weights: FONT_WEIGHTS,
    families: FONT_FAMILY,
  };
};

/**
 * CSS-in-JS typography helpers
 */
export const cssTypography = {
  /**
   * Generate CSS style object for typography variant
   */
  style: (variant: keyof TypographyScale, responsive?: 'compact' | 'large') => {
    const style = typographyUtils.getStyle(variant, responsive);
    return {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      textTransform: style.textTransform,
    };
  },

  /**
   * Generate responsive typography styles
   */
  responsive: (variant: keyof TypographyScale) => {
    return {
      ...cssTypography.style(variant),
      ...cssTypography.style(variant, 'compact'),
    };
  },
};
