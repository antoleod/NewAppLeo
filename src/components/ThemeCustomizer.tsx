import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { spacing, radii } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { typography } from '@/typography';
import { themeVariantDescriptions, type ThemeVariant } from '@/theme';

export function ThemeVariantGrid({
  value,
  onChange,
}: {
  value: ThemeVariant;
  onChange: (variant: ThemeVariant) => void;
}) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const columnCount = width >= 900 ? 4 : width >= 600 ? 2 : 1;

  const variants: ThemeVariant[] = ['sage', 'rose', 'navy', 'sand'];

  return (
    <View style={styles.gridContainer}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {variants.map((variant) => {
          const isSelected = variant === value;
          const desc = themeVariantDescriptions[variant];
          return (
            <Pressable
              key={variant}
              onPress={() => onChange(variant)}
              style={[
                styles.variantCard,
                {
                  flex: columnCount === 1 ? undefined : 1,
                  borderColor: isSelected ? theme.accent : theme.border,
                  borderWidth: isSelected ? 2 : 1,
                  backgroundColor: theme.bgCard,
                  opacity: isSelected ? 1 : 0.7,
                  shadowColor: isSelected ? theme.accent : 'transparent',
                  shadowOpacity: isSelected ? 0.3 : 0,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: isSelected ? 4 : 0,
                },
              ]}
            >
              <View style={styles.variantPreview}>
                <VariantColorPill variant={variant} />
              </View>
              <Text style={[styles.variantEmoji, { fontSize: 24 }]}>
                {desc.emoji}
              </Text>
              <Text style={[styles.variantLabel, { color: theme.textPrimary }]}>
                {desc.label}
              </Text>
              <Text style={[styles.variantDescription, { color: theme.textMuted }]}>
                {desc.description}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function VariantColorPill({ variant }: { variant: ThemeVariant }) {
  const colors: Record<ThemeVariant, [string, string, string]> = {
    sage: ['#4d7c6b', '#c18f54', '#2F7D57'],
    rose: ['#D08BA0', '#66C28F', '#B95B74'],
    navy: ['#8EB5EA', '#1A5FA5', '#1D4E89'],
    sand: ['#D9B97D', '#7AB58E', '#8C6B3F'],
  };

  const variantColors = colors[variant];

  return (
    <View style={styles.colorPill}>
      {variantColors.map((color, idx) => (
        <View
          key={idx}
          style={[
            styles.colorBit,
            { backgroundColor: color, flex: 1 },
          ]}
        />
      ))}
    </View>
  );
}

export function ThemePreview() {
  const { theme, themeStyle, paletteMode } = useTheme();

  return (
    <View style={[styles.preview, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
      <View style={{ gap: spacing.sm }}>
        <View
          style={[
            styles.previewElement,
            {
              backgroundColor: theme.accent,
              borderRadius: radii.md,
              height: 24,
            },
          ]}
        />
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.xs,
          }}
        >
          <View
            style={[
              styles.previewElement,
              {
                flex: 1,
                backgroundColor: theme.blue,
                borderRadius: radii.sm,
                height: 12,
              },
            ]}
          />
          <View
            style={[
              styles.previewElement,
              {
                flex: 1,
                backgroundColor: theme.green,
                borderRadius: radii.sm,
                height: 12,
              },
            ]}
          />
        </View>
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text style={[styles.previewLabel, { color: theme.textPrimary }]}>
          Style: {themeStyle}
        </Text>
        <Text style={[styles.previewLabel, { color: theme.textMuted }]}>
          Mode: {paletteMode}
        </Text>
      </View>
    </View>
  );
}

export function HexColorInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const { theme } = useTheme();
  const [isValid, setIsValid] = useState(true);

  const handleChange = (text: string) => {
    onChange(text);
    // Validate hex color
    const valid = /^#([0-9a-f]{6})?$/i.test(text) || text === '';
    setIsValid(valid);
  };

  return (
    <View style={styles.hexInputContainer}>
      <View style={[styles.hexInputWrapper, { borderColor: !isValid ? theme.red : theme.border }]}>
        <Text
          style={[
            styles.hexPrefix,
            { color: isValid ? theme.textMuted : theme.red },
          ]}
        >
          #
        </Text>
        <View
          style={[
            styles.hexPreview,
            {
              backgroundColor: isValid && value.startsWith('#') ? value : 'transparent',
              borderColor: theme.border,
            },
          ]}
        />
        <Text
          style={[
            styles.hexValue,
            {
              color: theme.textPrimary,
              flex: 1,
              fontFamily: 'x',
            },
          ]}
        >
          {value.replace('#', '')}
        </Text>
      </View>
      <Text style={[styles.hexLabel, { color: theme.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

export function ThemeSurfaceSelector({
  value,
  onChange,
}: {
  value: 'classic' | 'default' | 'photo';
  onChange: (value: 'classic' | 'default' | 'photo') => void;
}) {
  const { theme } = useTheme();

  const options: Array<{
    value: 'classic' | 'default' | 'photo';
    label: string;
    description: string;
  }> = [
    {
      value: 'classic',
      label: 'Dark Classic',
      description: 'Solid, clean backgrounds',
    },
    {
      value: 'default',
      label: 'AppLeo Default',
      description: 'Subtle gradients & depth',
    },
    {
      value: 'photo',
      label: 'Transparent Photo',
      description: 'Blurred photo backdrop',
    },
  ];

  return (
    <View style={styles.surfaceSelectorContainer}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.surfaceOption,
              {
                borderColor: isSelected ? theme.accent : theme.border,
                borderWidth: isSelected ? 2 : 1,
                backgroundColor: isSelected ? `${theme.accent}11` : theme.bgCardAlt,
              },
            ]}
          >
            <Text style={[styles.surfaceLabel, { color: theme.textPrimary }]}>
              {option.label}
            </Text>
            <Text style={[styles.surfaceDescription, { color: theme.textMuted }]}>
              {option.description}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    gap: spacing.md,
  },
  variantCard: {
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  variantPreview: {
    width: '100%',
    height: 80,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  colorPill: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  colorBit: {
    flex: 1,
  },
  variantLabel: {
    ...typography.sectionTitle,
    fontWeight: '800',
  },
  variantEmoji: {
    textAlign: 'center',
  },
  variantDescription: {
    ...typography.body,
    fontSize: 12,
  },
  preview: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    gap: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewElement: {
    opacity: 0.8,
  },
  previewLabel: {
    ...typography.detail,
    fontWeight: '600',
  },
  hexInputContainer: {
    gap: spacing.xs,
  },
  hexInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    height: 48,
    gap: spacing.sm,
  },
  hexPrefix: {
    ...typography.body,
    fontWeight: '700',
  },
  hexPreview: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  hexValue: {
    ...typography.body,
    fontFamily: 'Courier New',
  },
  hexLabel: {
    ...typography.detail,
    marginLeft: spacing.xs,
  },
  surfaceSelectorContainer: {
    gap: spacing.md,
  },
  surfaceOption: {
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
  },
  surfaceLabel: {
    ...typography.sectionTitle,
    fontWeight: '700',
  },
  surfaceDescription: {
    ...typography.body,
    fontSize: 12,
  },
});
