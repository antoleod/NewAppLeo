import React, { useEffect } from 'react';
import { TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolate,
  Easing,
} from 'react-native-reanimated';

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
  decimals?: number;
  style?: TextStyle;
}

export function AnimatedNumber({ value, suffix = '', decimals = 1, style }: AnimatedNumberProps) {
  const animatedValue = useSharedValue(value);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration: 300,
      easing: Easing.inOut(Easing.ease),
    });
  }, [value, animatedValue]);

  const animatedStyle = useAnimatedStyle(() => {
    const roundedValue = interpolate(
      animatedValue.value,
      [animatedValue.value - 1, animatedValue.value],
      [value - 1, value],
      Extrapolate.CLAMP
    );

    return {
      opacity: 1,
    };
  });

  return (
    <Animated.Text
      style={[
        animatedStyle,
        {
          fontSize: 18,
          fontWeight: '700',
          ...style,
        },
      ]}
    >
      {animatedValue.value.toFixed(decimals)}
      {suffix}
    </Animated.Text>
  );
}
