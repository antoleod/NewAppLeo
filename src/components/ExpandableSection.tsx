import React from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

interface ExpandableSectionProps {
  isExpanded: boolean;
  children: React.ReactNode;
}

export function ExpandableSection({ isExpanded, children }: ExpandableSectionProps) {
  const height = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: height.value,
      opacity: interpolate(height.value, [0, 1], [0, 1], Extrapolate.CLAMP),
    };
  });

  React.useEffect(() => {
    height.value = withTiming(isExpanded ? 1 : 0, {
      duration: 300,
      easing: Easing.inOut(Easing.ease),
    });
  }, [isExpanded, height]);

  return (
    <Animated.View
      style={[animatedStyle, { overflow: 'hidden' }]}
      onLayout={(event) => {
        if (isExpanded) {
          // Measure actual height
          const measuredHeight = event.nativeEvent.layout.height;
          height.value = measuredHeight;
        }
      }}
    >
      <View
        onLayout={(event) => {
          if (isExpanded) {
            height.value = event.nativeEvent.layout.height;
          }
        }}
      >
        {children}
      </View>
    </Animated.View>
  );
}
