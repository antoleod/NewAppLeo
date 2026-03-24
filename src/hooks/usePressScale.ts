import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

export function usePressScale(to = 0.94) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(to, { damping: 10, stiffness: 300 });
  };

  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
  };

  return { animatedStyle, onPressIn, onPressOut };
}
