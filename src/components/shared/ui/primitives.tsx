import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { radii, spacing } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { typography } from '@/typography';
import { shadow } from '@/utils/shadow';
import { withColorOpacity } from './_utils';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  icon,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
}: {
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  /** `ghost` is an alias for `tertiary` kept for back-compat. */
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: any;
}) {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1100;
  const tier = variant === 'ghost' ? 'tertiary' : variant;

  const press = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.03 }],
    opacity: disabled ? 0.5 : 1 - press.value * 0.08,
  }));

  let bg: string, borderColor: string, textColor: string, shadowColor: string, shadowOpacity = 0;
  switch (tier) {
    case 'primary':
      bg = theme.accent; borderColor = theme.accent; textColor = theme.accentText;
      shadowColor = theme.accent; shadowOpacity = 0.38; break;
    case 'secondary':
      bg = withColorOpacity(theme.accent, 0.14); borderColor = withColorOpacity(theme.accent, 0.32);
      textColor = theme.accent; shadowColor = theme.accent; break;
    case 'danger':
      bg = theme.red; borderColor = theme.red; textColor = '#ffffff';
      shadowColor = theme.red; shadowOpacity = 0.32; break;
    case 'tertiary':
    default:
      bg = 'transparent'; borderColor = theme.border; textColor = theme.textPrimary;
      shadowColor = theme.textPrimary; break;
  }

  const sizeTokens = {
    sm: { h: isDesktopWeb ? 36 : 40, radius: 12, fontSize: 13, padX: 14, gap: 6, iconSize: 14 },
    md: { h: isDesktopWeb ? 44 : 48, radius: 14, fontSize: 15, padX: 18, gap: 8, iconSize: 16 },
    lg: { h: isDesktopWeb ? 52 : 56, radius: 16, fontSize: 16, padX: 22, gap: 10, iconSize: 18 },
  }[size];

  return (
    <AnimatedPressable
      onPress={disabled || loading ? undefined : onPress}
      onPressIn={() => { press.value = withTiming(1, { duration: 100 }); }}
      onPressOut={() => { press.value = withSpring(0, { damping: 18, stiffness: 280 }); }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
      style={[{ minHeight: sizeTokens.h, width: fullWidth ? '100%' : undefined, paddingHorizontal: sizeTokens.padX, borderRadius: sizeTokens.radius, borderWidth: 1, backgroundColor: bg, borderColor, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sizeTokens.gap, overflow: 'hidden', ...shadow(shadowColor, shadowOpacity, 14, 0, 5) }, animStyle, style]}
    >
      {/* shimmer overlay for primary/danger */}
      {(tier === 'primary' || tier === 'danger') ? (
        <LinearGradient
          colors={[withColorOpacity('#ffffff', 0.18), 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      ) : null}
      {loading ? (
        <ActivityIndicator color={tier === 'primary' || tier === 'danger' ? '#ffffff' : theme.accent} />
      ) : (
        <>
          {icon ? <View style={{ width: sizeTokens.iconSize, height: sizeTokens.iconSize, alignItems: 'center', justifyContent: 'center' }}>{icon}</View> : null}
          <Text style={{ color: textColor, fontSize: sizeTokens.fontSize, fontWeight: '800', letterSpacing: 0.2, includeFontPadding: false }}>{label}</Text>
        </>
      )}
    </AnimatedPressable>
  );
}

export function Segment({
  value, options, onChange,
}: {
  value: string;
  options: { label: string; value: string; icon?: React.ReactNode }[];
  onChange: (value: string) => void;
}) {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const shouldStack = width < 520;
  return (
    <View style={[styles.segment, shouldStack && styles.segmentStack, { borderColor: theme.border, backgroundColor: theme.pillBg }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segmentItem, shouldStack && styles.segmentItemStack, selected && { backgroundColor: theme.bgCard, borderColor: theme.borderActive }]}
          >
            {option.icon ? <View style={styles.segmentIcon}>{option.icon}</View> : null}
            <Text style={[styles.segmentLabel, { color: selected ? theme.textPrimary : theme.textMuted }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StatPill({ label, value, tone = 'primary' }: { label: string; value: string; tone?: 'primary' | 'secondary' | 'success' | 'warning' }) {
  const { theme } = useTheme();
  const toneColor = tone === 'primary' ? theme.accent : tone === 'secondary' ? theme.blue : tone === 'success' ? theme.green : theme.accent;
  const toneBg = `${toneColor}22`;
  return (
    <View style={[styles.stat, { backgroundColor: toneBg, borderColor: theme.border }]}>
      <Text style={[styles.statLabel, { color: theme.textMuted, textAlign: 'center' }]}>{label}</Text>
      <Text style={[styles.statValue, { color: toneColor, textAlign: 'center' }]}>{value}</Text>
    </View>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (value: boolean) => void; label?: string }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={[styles.toggleContainer, { backgroundColor: value ? theme.accent : theme.pillBg, borderColor: value ? theme.accent : theme.border }]}
    >
      <View style={[styles.toggleThumb, { backgroundColor: value ? theme.accentText : theme.textMuted, transform: [{ translateX: value ? 22 : 2 }] }]} />
      {label ? <Text style={[styles.toggleLabel, { color: value ? theme.accentText : theme.textPrimary }]}>{label}</Text> : null}
    </Pressable>
  );
}

export function ColorSwatch({ color, label }: { color: string; label?: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.swatchContainer}>
      <View style={[styles.swatch, { backgroundColor: color, borderColor: theme.border, ...shadow(color, 0.2, 6, 0, 3) }]} />
      {label ? <Text style={[styles.swatchLabel, { color: theme.textMuted }]}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', flexWrap: 'nowrap', borderWidth: 1, borderRadius: radii.pill, padding: 4, gap: 4 },
  segmentStack: { flexDirection: 'column', borderRadius: radii.lg },
  segmentItem: { flex: 1, flexDirection: 'row', borderRadius: radii.pill, gap: 7, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  segmentItemStack: { flex: 0, width: '100%' },
  segmentIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  segmentLabel: { ...typography.pill, fontWeight: '800' },
  stat: { flexBasis: '48%', minWidth: 145, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: 6 },
  statLabel: { ...typography.statLabel, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 },
  statValue: { ...typography.statValue, fontWeight: '800' },
  toggleContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.sm, height: 48, gap: spacing.md },
  toggleThumb: { width: 24, height: 24, borderRadius: radii.pill },
  toggleLabel: { ...typography.pill, fontWeight: '700' },
  swatchContainer: { alignItems: 'center', gap: spacing.xs },
  swatch: { width: 48, height: 48, borderRadius: radii.md, borderWidth: 1, elevation: 2 },
  swatchLabel: { ...typography.detail, fontSize: 11, textAlign: 'center' },
});
