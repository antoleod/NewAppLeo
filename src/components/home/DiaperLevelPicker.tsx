import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { haptics } from '@/lib/haptics';

type Props = {
  /** Custom SVG glyph node (preferred). Falls back to `emoji` string if not provided. */
  glyph?: React.ReactNode;
  emoji?: string;
  label: string;
  value: number;
  onChange: (next: number) => void;
  color: string;
};

const OPTIONS = [0, 1, 2, 3] as const;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ChipProps = {
  opt: 0 | 1 | 2 | 3;
  selected: boolean;
  color: string;
  borderColor: string;
  bgIdle: string;
  bgPressed: string;
  textIdle: string;
  optLabel: string;
  ariaLabel: string;
  onPress: () => void;
};

const Chip = React.memo(function Chip({
  selected, color, borderColor, bgIdle, bgPressed, textIdle, optLabel, ariaLabel, onPress,
}: ChipProps) {
  const progress = useSharedValue(selected ? 1 : 0);
  const press = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(selected ? 1 : 0, { damping: 18, stiffness: 220, mass: 0.6 });
  }, [progress, selected]);

  const animStyle = useAnimatedStyle(() => {
    const scale = withSpring(1 + progress.value * 0.04 - press.value * 0.06, {
      damping: 14, stiffness: 220, mass: 0.5,
    });
    const bg = interpolateColor(
      progress.value,
      [0, 1],
      [bgIdle, `${color}26`],
    );
    return {
      transform: [{ scale }],
      backgroundColor: bg,
      borderColor: progress.value > 0.5 ? color : borderColor,
      borderWidth: 1 + progress.value,
    };
  });

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [textIdle, color]),
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { press.value = withTiming(1, { duration: 80 }); }}
      onPressOut={() => { press.value = withTiming(0, { duration: 140 }); }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={ariaLabel}
      style={[
        {
          flex: 1,
          minHeight: 46,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
        },
        animStyle,
      ]}
    >
      <Animated.Text style={[{ fontSize: 16, fontWeight: '800' }, textStyle]}>
        {optLabel}
      </Animated.Text>
    </AnimatedPressable>
  );
});

export const DiaperLevelPicker = React.memo(function DiaperLevelPicker({
  glyph, emoji, label, value, onChange, color,
}: Props) {
  const { theme } = useTheme();
  const selectedOpt = value > 3 ? 3 : OPTIONS.includes(value as any) ? value : 0;

  const badgeProgress = useSharedValue(value > 0 ? 1 : 0);
  useEffect(() => {
    badgeProgress.value = withSpring(value > 0 ? 1 : 0, { damping: 14, stiffness: 240, mass: 0.5 });
  }, [badgeProgress, value]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.85 + badgeProgress.value * 0.25 }],
    opacity: 0.5 + badgeProgress.value * 0.5,
  }));

  return (
    <View accessibilityLabel={`${label}: ${value}`} style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Animated.View accessibilityElementsHidden style={[{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }, badgeStyle]}>
          {glyph ?? (emoji ? <Text style={{ fontSize: 22 }}>{emoji}</Text> : null)}
        </Animated.View>
        <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '700', flex: 1 }} numberOfLines={1}>
          {label}
        </Text>
        <Animated.Text style={[{ color, fontSize: 20, fontWeight: '900', minWidth: 34, textAlign: 'right' }, badgeStyle]}>
          {value > 3 ? value : selectedOpt === 3 ? '3+' : selectedOpt}
        </Animated.Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {OPTIONS.map((opt) => {
          const selected = selectedOpt === opt;
          const optLabel = opt === 3 ? '3+' : String(opt);
          return (
            <Chip
              key={opt}
              opt={opt}
              selected={selected}
              color={color}
              borderColor={theme.border}
              bgIdle={theme.bgCard}
              bgPressed={theme.bgCardAlt}
              textIdle={theme.textPrimary}
              optLabel={optLabel}
              ariaLabel={`${label} ${optLabel}`}
              onPress={() => {
                if (selectedOpt !== opt) haptics.selection();
                onChange(opt);
              }}
            />
          );
        })}
      </View>
    </View>
  );
});
