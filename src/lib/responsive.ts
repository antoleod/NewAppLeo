import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

export const breakpoints = {
  phone: 0,
  tablet: 768,
  desktop: 1120,
} as const;

export function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function useResponsiveMetrics() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isPhone = width < breakpoints.tablet;
    const isTablet = width >= breakpoints.tablet && width < breakpoints.desktop;
    const isDesktop = width >= breakpoints.desktop;
    const isCompactPhone = width < 390;
    const isLargePhone = width >= 430 && width < breakpoints.tablet;
    const horizontalPadding = isCompactPhone ? 14 : isPhone ? 18 : isTablet ? 24 : 28;
    const verticalGap = isCompactPhone ? 14 : isPhone ? 18 : 22;
    const containerMaxWidth = isDesktop ? 1100 : isTablet ? 940 : 680;
    const formMaxWidth = isDesktop ? 420 : isTablet ? 460 : 560;
    const cardPadding = isCompactPhone ? 16 : isPhone ? 18 : 22;
    const touchTarget = isCompactPhone ? 48 : 52;

    return {
      width,
      height,
      isPhone,
      isTablet,
      isDesktop,
      isCompactPhone,
      isLargePhone,
      horizontalPadding,
      verticalGap,
      containerMaxWidth,
      formMaxWidth,
      cardPadding,
      touchTarget,
    };
  }, [height, width]);
}

export function responsiveType(width: number, values: { phone: number; tablet?: number; desktop?: number }) {
  if (width >= breakpoints.desktop) return values.desktop ?? values.tablet ?? values.phone;
  if (width >= breakpoints.tablet) return values.tablet ?? values.phone;
  return values.phone;
}
