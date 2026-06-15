import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { radii, spacing } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { typography } from '@/typography';

export function EmptyState({
  title, body, action, icon,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.empty, { backgroundColor: theme.bgCardAlt, borderColor: theme.border }]}>
      {icon ? (
        <View style={[styles.emptyIcon, { backgroundColor: `${theme.accent}1A`, borderColor: `${theme.accent}33` }]}>
          <Ionicons name={icon} size={32} color={theme.accent} />
        </View>
      ) : null}
      <Text style={[styles.emptyTitle, { color: theme.textPrimary, textAlign: 'center' }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: theme.textMuted, textAlign: 'center' }]}>{body}</Text>
      {action}
    </View>
  );
}

export function Skeleton({
  width, height = 16, radius = 8, style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: any;
}) {
  const { theme } = useTheme();
  const shimmer = useSharedValue(0.5);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));

  return (
    <Animated.View
      style={[{ width: (width as any) ?? '100%', height, borderRadius: radius, backgroundColor: theme.bgCardAlt, borderWidth: 1, borderColor: theme.border }, animatedStyle, style]}
    />
  );
}

const styles = StyleSheet.create({
  empty: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  emptyTitle: { ...typography.sectionTitle, fontWeight: '800' },
  emptyBody: { ...typography.body, lineHeight: 20 },
});
