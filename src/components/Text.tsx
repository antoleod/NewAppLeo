import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { typographyUtils, FONT_FAMILY } from '@/theme/typography';

export interface TextProps extends RNTextProps {
  variant?: 'heading1' | 'heading2' | 'heading3' | 'heading4' | 'title' | 'subtitle' | 'body' | 'caption' | 'label' | 'small' | 'tiny';
  responsive?: 'compact' | 'large';
  weight?: '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  color?: string;
}

/**
 * Text component with mandatory SF Pro Display font
 * All text in the app should use this component instead of RN Text
 */
export const Text: React.FC<TextProps> = ({
  variant = 'body',
  responsive,
  weight,
  style,
  children,
  ...props
}) => {
  const typographyStyle = typographyUtils.getStyle(variant, responsive);

  const textStyle = {
    fontFamily: FONT_FAMILY.primary,
    fontSize: typographyStyle.fontSize,
    fontWeight: (weight || typographyStyle.fontWeight) as any,
    lineHeight: typographyStyle.lineHeight,
    letterSpacing: typographyStyle.letterSpacing,
    textTransform: typographyStyle.textTransform,
  };

  return (
    <RNText
      style={[textStyle, style]}
      {...props}
    >
      {children}
    </RNText>
  );
};

/**
 * Heading components for convenience
 */
export const Heading1: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="heading1" {...props} />
);

export const Heading2: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="heading2" {...props} />
);

export const Heading3: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="heading3" {...props} />
);

export const Heading4: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="heading4" {...props} />
);

/**
 * Other text components for convenience
 */
export const Title: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="title" {...props} />
);

export const Subtitle: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="subtitle" {...props} />
);

export const Body: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="body" {...props} />
);

export const Caption: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="caption" {...props} />
);

export const Label: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="label" {...props} />
);

export const Small: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="small" {...props} />
);

export const Tiny: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="tiny" {...props} />
);

export default Text;
