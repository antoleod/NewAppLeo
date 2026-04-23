import React from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { useResponsiveLayout } from '@/lib/responsiveLayout';
import { useTheme } from '@/context/ThemeContext';
import { typography } from '@/typography';

/**
 * ResponsiveSection - Standardized section container for consistent spacing.
 * Replaces hardcoded sectionCard styling throughout the app.
 */
export function ResponsiveSection({
  children,
  label,
  title,
  subtitle,
  gap,
}: {
  children: React.ReactNode;
  label?: string;
  title?: string;
  subtitle?: string;
  gap?: number;
}) {
  const layout = useResponsiveLayout();
  const { theme } = useTheme();

  return (
    <View style={{ gap: gap ?? layout.cardGap }}>
      {label && (
        <Text
          style={[
            typography.body,
            {
              fontSize: layout.textXxs,
              fontWeight: '900',
              letterSpacing: 1.1,
              textTransform: 'uppercase',
              color: theme.accent,
            },
          ]}
        >
          {label}
        </Text>
      )}
      {title && (
        <Text
          style={[
            typography.sectionTitle,
            {
              fontSize: layout.h3Size,
              color: theme.textPrimary,
              marginTop: label ? -layout.gapSm : 0,
            },
          ]}
        >
          {title}
        </Text>
      )}
      {subtitle && (
        <Text
          style={[
            typography.body,
            {
              fontSize: layout.textSm,
              color: theme.textMuted,
              marginTop: title ? -layout.gapSm : 0,
            },
          ]}
        >
          {subtitle}
        </Text>
      )}
      {children}
    </View>
  );
}

/**
 * ResponsiveFormGroup - Groups form inputs with consistent spacing.
 * Replaces hardcoded .stack and form layouts.
 */
export function ResponsiveFormGroup({
  children,
  horizontal = false,
}: {
  children: React.ReactNode;
  horizontal?: boolean;
}) {
  const layout = useResponsiveLayout();

  return (
    <View
      style={{
        gap: layout.gapMd,
        flexDirection: horizontal ? 'row' : 'column',
        flexWrap: horizontal ? 'wrap' : 'nowrap',
      }}
    >
      {horizontal && React.Children.map(children, (child) => (
        <View style={{ flex: 1, minWidth: 160 }}>{child}</View>
      ))}
      {!horizontal && children}
    </View>
  );
}

/**
 * ResponsiveGrid - Flexible grid for buttons, chips, and card layouts.
 * Auto-adjusts columns based on screen size.
 */
export function ResponsiveGrid({
  children,
  minItemWidth = 140,
}: {
  children: React.ReactNode;
  minItemWidth?: number;
}) {
  const layout = useResponsiveLayout();

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: layout.gridGap,
        marginHorizontal: -layout.gridGap / 2,
      }}
    >
      {React.Children.map(children, (child) => (
        <View
          style={{
            flexBasis: layout.isPhone ? '50%' : layout.isTablet ? '33.333%' : '25%',
            minWidth: minItemWidth,
            paddingHorizontal: layout.gridGap / 2,
            marginBottom: layout.gridGap,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

/**
 * ResponsiveButtonGroup - Stacks buttons with consistent spacing.
 */
export function ResponsiveButtonGroup({
  children,
  vertical = true,
  spacing,
}: {
  children: React.ReactNode;
  vertical?: boolean;
  spacing?: number;
}) {
  const layout = useResponsiveLayout();
  const gap = spacing ?? layout.gapMd;

  return (
    <View style={{ gap, flexDirection: vertical ? 'column' : 'row' }}>
      {React.Children.map(children, (child) => (
        <View style={vertical ? {} : { flex: 1 }}>{child}</View>
      ))}
    </View>
  );
}

/**
 * ResponsiveCard - Enhanced card with responsive padding and border radius.
 */
export function ResponsiveCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  const layout = useResponsiveLayout();
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          padding: layout.cardPadding,
          borderRadius: layout.cardBorderRadius,
          backgroundColor: theme.bgCard,
          borderWidth: 1,
          borderColor: theme.border,
          gap: layout.cardGap,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * ResponsiveHeroSection - Mobile-optimized hero header.
 */
export function ResponsiveHeroSection({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  const layout = useResponsiveLayout();
  const { theme } = useTheme();

  return (
    <View
      style={{
        gap: layout.gapSm,
        alignItems: 'center',
        marginBottom: layout.sectionGap,
      }}
    >
      {eyebrow && (
        <Text
          style={[
            typography.body,
            {
              fontSize: layout.textXs,
              color: theme.accent,
              fontWeight: '700',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
            },
          ]}
        >
          {eyebrow}
        </Text>
      )}
      <Text
        style={[
          typography.heroName,
          {
            fontSize: layout.heroHeadingSize,
            color: theme.textPrimary,
            textAlign: 'center',
            lineHeight: layout.heroHeadingSize * 1.2,
          },
        ]}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={[
            typography.body,
            {
              fontSize: layout.heroSubtitleSize,
              color: theme.textMuted,
              textAlign: 'center',
              lineHeight: layout.heroSubtitleSize * 1.4,
              marginTop: -layout.gapXs,
            },
          ]}
        >
          {subtitle}
        </Text>
      )}
      {children}
    </View>
  );
}

/**
 * ResponsiveContentWrapper - Wraps content with consistent max-width and padding.
 */
export function ResponsiveContentWrapper({
  children,
  maxWidth,
  spacing,
}: {
  children: React.ReactNode;
  maxWidth?: 'compact' | 'form' | 'full';
  spacing?: 'tight' | 'normal' | 'loose';
}) {
  const layout = useResponsiveLayout();

  const getMaxWidth = () => {
    if (maxWidth === 'compact') return layout.compactFormMaxWidth;
    if (maxWidth === 'form') return layout.formMaxWidth;
    return layout.maxWidth;
  };

  const getGap = () => {
    if (spacing === 'tight') return layout.gapLg;
    if (spacing === 'loose') return layout.gapXl;
    return layout.sectionGap;
  };

  return (
    <View
      style={{
        width: '100%',
        maxWidth: getMaxWidth(),
        alignSelf: 'center',
        gap: getGap(),
      }}
    >
      {children}
    </View>
  );
}
