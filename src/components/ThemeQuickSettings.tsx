import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { spacing, radii } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { typography } from '@/typography';
import { themeVariantDescriptions } from '@/theme';

export function ThemeQuickSettings() {
  const { theme, paletteMode, themeStyle, themeVariant, toggleTheme } = useTheme();
  const variantLabel = themeVariantDescriptions[themeVariant]?.label ?? themeVariant;

  return (
    <View style={{ gap: spacing.md }}>
      {/* Quick Theme Toggle */}
      <Pressable
        onPress={() => void toggleTheme()}
        style={[
          {
            backgroundColor: theme.bgCard,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: radii.lg,
            padding: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
        ]}
      >
        <View>
          <Text style={[typography.pill, { color: theme.textPrimary, fontWeight: '700' }]}>
            {paletteMode === 'nuit' ? '🌙 Night Mode' : '☀️ Light Mode'}
          </Text>
          <Text style={[typography.detail, { color: theme.textMuted, marginTop: 2 }]}>
            Tap to toggle
          </Text>
        </View>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.pill,
            backgroundColor: `${theme.accent}22`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 20 }}>
            {paletteMode === 'nuit' ? '🌙' : '☀️'}
          </Text>
        </View>
      </Pressable>

      {/* Current Theme Info */}
      <View
        style={{
          backgroundColor: `${theme.accent}11`,
          borderColor: theme.accent,
          borderWidth: 1,
          borderRadius: radii.lg,
          padding: spacing.md,
          gap: spacing.sm,
        }}
      >
        <Text style={[typography.body, { color: theme.textPrimary, fontWeight: '600' }]}>
          Current Theme
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[typography.detail, { color: theme.textMuted }]}>
            Palette: <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>{variantLabel}</Text>
          </Text>
          <Text style={[typography.detail, { color: theme.textMuted }]}>
            Style: <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>{themeStyle}</Text>
          </Text>
        </View>
      </View>

      {/* Edit Theme Button */}
      <Pressable
        onPress={() => router.push('/settings-theme')}
        style={[
          {
            backgroundColor: theme.accent,
            borderRadius: radii.lg,
            padding: spacing.md,
            alignItems: 'center',
          },
        ]}
      >
        <Text style={[typography.pill, { color: theme.accentText, fontWeight: '800' }]}>
          ✨ Customize Theme
        </Text>
      </Pressable>
    </View>
  );
}
