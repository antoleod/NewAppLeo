import { useSharedValue, useAnimatedStyle, withTiming, interpolateColor } from 'react-native-reanimated';
import { useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';

export function useThemeTransition(targetColor: string) {
  const { theme } = useTheme();
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(1, { duration: 300 });
  }, [targetColor]);

  const animatedStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      animatedValue.value,
      [0, 1],
      [theme.textPrimary, targetColor]
    );
    return {
      color,
    };
  });

  return animatedStyle;
}

export function useCardPressAnimation() {
  const scaleValue = useSharedValue(1);

  const handlePressIn = () => {
    scaleValue.value = withTiming(0.98, { duration: 100 });
  };

  const handlePressOut = () => {
    scaleValue.value = withTiming(1, { duration: 100 });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleValue.value }],
    };
  });

  return { animatedStyle, handlePressIn, handlePressOut };
}

export function useFadeIn(delay = 0) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withTiming(0, { duration: 400 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  return animatedStyle;
}

export function usePulseAnimation() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withTiming(1.05, {
      duration: 800,
    });

    const interval = setInterval(() => {
      scale.value = withTiming(1, { duration: 400 });
      setTimeout(() => {
        scale.value = withTiming(1.05, { duration: 400 });
      }, 400);
    }, 800);

    return () => clearInterval(interval);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return animatedStyle;
}
