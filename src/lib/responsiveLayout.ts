import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/**
 * Enhanced responsive layout system for mobile-first design.
 * Provides consistent spacing, sizing, and layout patterns across the app.
 */

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isPhone = width < 768;
    const isCompactPhone = width < 390;
    const isSmallPhone = width < 360;
    const isTablet = width >= 768 && width < 1120;
    const isDesktop = width >= 1120;

    // Horizontal spacing - based on phone-first principle
    const horizontalPaddingPhone = isSmallPhone ? 12 : isCompactPhone ? 14 : 16;
    const horizontalPaddingTablet = 20;
    const horizontalPaddingDesktop = 24;
    const horizontalPadding = isPhone ? horizontalPaddingPhone : isTablet ? horizontalPaddingTablet : horizontalPaddingDesktop;

    // Vertical spacing - use consistent increments
    const gapXs = 6;
    const gapSm = 8;
    const gapMd = 12;
    const gapLg = 16;
    const gapXl = 20;
    const gapXxl = 24;

    // Section spacing (top/bottom padding and gap between sections)
    const sectionGap = isCompactPhone ? gapMd : isPhone ? gapLg : gapXl;
    const sectionPadding = isCompactPhone ? 12 : isPhone ? 14 : 16;

    // Card styling
    const cardPadding = isCompactPhone ? 12 : isPhone ? 14 : 18;
    const cardBorderRadius = isPhone ? 16 : 18;
    const cardGap = isCompactPhone ? gapSm : gapMd;

    // Touch targets - minimum 48pt on all platforms
    const minTouchTarget = 48;
    const touchTargetCompact = 44;
    const touchTarget = isPhone ? minTouchTarget : 52;
    const smallTouchTarget = isPhone ? touchTargetCompact : minTouchTarget;

    // Container max-widths
    const maxWidth = isDesktop ? 1100 : isTablet ? 940 : isPhone ? 680 : width;
    const formMaxWidth = isDesktop ? 440 : isTablet ? 480 : 560;
    const compactFormMaxWidth = isDesktop ? 380 : isTablet ? 420 : 520;

    // Hero / header sizing
    const heroHeadingScale = isCompactPhone ? 0.85 : isPhone ? 0.92 : isTablet ? 1 : 1.04;
    const heroHeadingSize = 28 * heroHeadingScale; // Base 28
    const heroSubtitleSize = 14 * (heroHeadingScale * 0.95);

    // Button sizing
    const buttonHeightPrimary = touchTarget;
    const buttonHeightSecondary = smallTouchTarget;
    const buttonBorderRadius = 12;
    const buttonPaddingHorizontal = isPhone ? 16 : 18;
    const buttonPaddingVertical = isPhone ? 12 : 14;

    // Input field sizing
    const inputHeight = minTouchTarget;
    const inputPadding = isPhone ? 12 : 14;
    const inputLabelSize = 12;
    const inputFontSize = 16;

    // Typography
    const textBase = 16;
    const textSm = 14;
    const textXs = 12;
    const textXxs = 11;
    const textLg = 18;
    const textXl = 20;
    const textXxl = 24;

    // Heading sizes
    const h1Size = 28 * heroHeadingScale;
    const h2Size = 20 * heroHeadingScale;
    const h3Size = 18 * heroHeadingScale;

    // Safe margins - consistent spacing around edges
    const safeMarginPhone = horizontalPaddingPhone;
    const safeMarginTablet = horizontalPaddingTablet;
    const safeMarginDesktop = horizontalPaddingDesktop;

    // Responsive grid layouts
    const gridCols = isPhone ? 1 : isTablet ? 2 : 3;
    const gridGap = isCompactPhone ? gapSm : isPhone ? gapMd : gapLg;

    return {
      // Flags
      isPhone,
      isCompactPhone,
      isSmallPhone,
      isTablet,
      isDesktop,

      // Spacing system
      gapXs,
      gapSm,
      gapMd,
      gapLg,
      gapXl,
      gapXxl,

      // Sections
      sectionGap,
      sectionPadding,
      horizontalPadding,

      // Cards
      cardPadding,
      cardBorderRadius,
      cardGap,

      // Touch targets
      minTouchTarget,
      touchTargetCompact,
      touchTarget,
      smallTouchTarget,

      // Containers
      maxWidth,
      formMaxWidth,
      compactFormMaxWidth,

      // Hero
      heroHeadingScale,
      heroHeadingSize,
      heroSubtitleSize,

      // Buttons
      buttonHeightPrimary,
      buttonHeightSecondary,
      buttonBorderRadius,
      buttonPaddingHorizontal,
      buttonPaddingVertical,

      // Input
      inputHeight,
      inputPadding,
      inputLabelSize,
      inputFontSize,

      // Typography
      textBase,
      textSm,
      textXs,
      textXxs,
      textLg,
      textXl,
      textXxl,
      h1Size,
      h2Size,
      h3Size,

      // Safe margins
      safeMarginPhone,
      safeMarginTablet,
      safeMarginDesktop,

      // Grids
      gridCols,
      gridGap,

      // Computed values
      width,
      height,
    };
  }, [width, height]);
}

/**
 * Helper to get responsive values based on device size.
 * Use this for one-off responsive calculations.
 */
export function responsiveValue<T>(width: number, values: { phone?: T; tablet?: T; desktop?: T }, defaultValue: T): T {
  if (width >= 1120 && values.desktop !== undefined) return values.desktop;
  if (width >= 768 && values.tablet !== undefined) return values.tablet;
  if (values.phone !== undefined) return values.phone;
  return defaultValue;
}

/**
 * Calculate responsive dimensions with consistent aspect ratios.
 */
export function responsiveAspect(containerWidth: number, aspectRatio: number, maxWidth?: number) {
  let width = containerWidth;
  if (maxWidth && width > maxWidth) {
    width = maxWidth;
  }
  return { width, height: width / aspectRatio };
}
