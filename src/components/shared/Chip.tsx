import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { haptics } from '@/utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * BabyFlow Chip — the unified pill/tag/filter primitive.
 *
 * Why this exists:
 *   The app had ~40 ad-hoc inline pill styles (filter rows, meal-time picker,
 *   sync badge body, food chips, etc.) each reinventing padding/radius/state
 *   styles slightly differently. This component is the canonical version so
 *   the whole app speaks one chip dialect.
 *
 * Visual rules:
 *   - Radius 10 (not 8, not 999) — signature soft-square shape that pairs
 *     with the Button's 14 px without being identical.
 *   - Tone-driven coloring: pass any colour as `tone` and the chip computes
 *     a calm idle (tone @ 8% bg, tone @ 30% border, textPrimary) and a
 *     selected state (tone @ 18% bg, tone solid border, tone text). One
 *     parameter drives the whole palette per chip.
 *   - Native press spring via Reanimated — scale + opacity micro-feedback.
 *   - Optional icon slot for emoji or AppIcon SVG, balanced with text.
 */

export type ChipSize = 'sm' | 'md' | 'lg';

interface ChipProps {
  label: string;
  /** Selection state — drives full tonal swap. */
  selected?: boolean;
  /** Override tone (any hex). Defaults to theme accent. */
  tone?: string;
  /** Optional emoji or SVG node before the label. */
  icon?: React.ReactNode;
  /** Trailing element (e.g. close X, counter). */
  trailing?: React.ReactNode;
  onPress?: () => void;
  /** Selection toggle handler — convenience when used as a radio. */
  onToggle?: (nextSelected: boolean) => void;
  size?: ChipSize;
  disabled?: boolean;
  /** Full-width fills the parent flex container. */
  fullWidth?: boolean;
  /** Adds a haptic selection tick on press. Default true. */
  haptic?: boolean;
  accessibilityLabel?: string;
  style?: any;
}

const SIZE_TOKENS: Record<ChipSize, { h: number; padX: number; gap: number; font: number; iconSize: number }> = {
  sm: { h: 28, padX: 10, gap: 4, font: 11, iconSize: 12 },
  md: { h: 34, padX: 12, gap: 6, font: 12, iconSize: 14 },
  lg: { h: 44, padX: 14, gap: 8, font: 13, iconSize: 16 },
};

function withOpacity(hex: string, alpha: number): string {
  // Accept 6-char hex; quietly fall back to the original string otherwise so
  // theme.accent (could be rgba already in some themes) keeps working.
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const Chip = React.memo(function Chip({
  label,
  selected = false,
  tone,
  icon,
  trailing,
  onPress,
  onToggle,
  size = 'md',
  disabled = false,
  fullWidth = false,
  haptic = true,
  accessibilityLabel,
  style,
}: ChipProps) {
  const { theme } = useTheme();
  const t = SIZE_TOKENS[size];
  const effectiveTone = tone ?? theme.accent;

  const bg = selected ? withOpacity(effectiveTone, 0.18) : withOpacity(effectiveTone, 0.08);
  const borderColor = selected ? effectiveTone : withOpacity(effectiveTone, 0.30);
  const textColor = selected ? effectiveTone : theme.textPrimary;

  const press = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.04 }],
    opacity: disabled ? 0.45 : 1 - press.value * 0.08,
  }));

  const handlePress = () => {
    if (disabled) return;
    if (haptic) haptics.selection();
    onPress?.();
    onToggle?.(!selected);
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => { if (!disabled) press.value = withTiming(1, { duration: 90 }); }}
      onPressOut={() => { press.value = withSpring(0, { damping: 18, stiffness: 280 }); }}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        {
          minHeight: t.h,
          paddingHorizontal: t.padX,
          borderRadius: 10,
          borderWidth: selected ? 1.5 : 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: t.gap,
          backgroundColor: bg,
          borderColor,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          flex: fullWidth ? 1 : undefined,
        },
        animStyle,
        style,
      ]}
    >
      {icon ? (
        <View style={{ width: t.iconSize, height: t.iconSize, alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </View>
      ) : null}
      <Text
        numberOfLines={1}
        style={{
          color: textColor,
          fontSize: t.font,
          fontWeight: selected ? '800' : '600',
          letterSpacing: 0.2,
          includeFontPadding: false,
        }}
      >
        {label}
      </Text>
      {trailing ? <View>{trailing}</View> : null}
    </AnimatedPressable>
  );
});

export default Chip;
