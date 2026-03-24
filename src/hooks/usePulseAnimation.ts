import { useEffect } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type PulseConfig = {
  active: boolean;
  intensity?: 'soft' | 'strong';
};

export function usePulseAnimation({ active, intensity = 'soft' }: PulseConfig) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      scale.value = withSpring(1);
      opacity.value = withTiming(1);
      glowOpacity.value = withTiming(0);
      return;
    }

    const scaleRange = intensity === 'strong' ? 1.06 : 1.03;
    const duration = intensity === 'strong' ? 800 : 1400;

    scale.value = withRepeat(
      withSequence(
        withTiming(scaleRange, { duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );

    opacity.value = withRepeat(withSequence(withTiming(0.85, { duration }), withTiming(1, { duration })), -1, false);
    glowOpacity.value = withRepeat(withSequence(withTiming(0.4, { duration: 900 }), withTiming(0, { duration: 900 })), -1, false);
  }, [active, intensity, glowOpacity, opacity, scale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return { pulseStyle, glowStyle };
}
