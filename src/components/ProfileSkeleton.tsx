import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { spacing } from '@/theme';

export function ProfileSkeleton() {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.5);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const SkeletonLine = ({ width = '100%', height = 16 }: { width?: string | number; height?: number }) => (
    <Animated.View
      style={[
        animatedStyle,
        {
          width: width as any,
          height,
          borderRadius: 8,
          backgroundColor: colors.border,
          marginBottom: spacing.md,
        },
      ]}
    />
  );

  return (
    <View style={styles.container}>
      {/* Photo + Info section */}
      <View style={styles.headerSection}>
        <Animated.View
          style={[
            animatedStyle,
            {
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: colors.border,
            },
          ]}
        />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <SkeletonLine width="80%" height={14} />
          <SkeletonLine width="60%" height={14} />
        </View>
      </View>

      {/* Basic info section */}
      <View style={styles.section}>
        <SkeletonLine width="40%" height={12} />
        <SkeletonLine width="100%" height={44} />
        <SkeletonLine width="100%" height={44} />
        <SkeletonLine width="100%" height={44} />
      </View>

      {/* Measurements section */}
      <View style={styles.section}>
        <SkeletonLine width="30%" height={12} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <SkeletonLine width="100%" height={44} />
          </View>
          <View style={{ flex: 1 }}>
            <SkeletonLine width="100%" height={44} />
          </View>
        </View>
        <SkeletonLine width="100%" height={44} />
      </View>

      {/* Notes section */}
      <View style={styles.section}>
        <SkeletonLine width="100%" height={60} />
      </View>

      {/* Button section */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <SkeletonLine width="100%" height={44} />
        </View>
        <View style={{ flex: 1 }}>
          <SkeletonLine width="100%" height={44} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  headerSection: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  section: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
});
