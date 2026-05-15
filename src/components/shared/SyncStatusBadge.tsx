import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAppData } from '@/context/AppDataContext';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { haptics } from '@/lib/haptics';

/**
 * Compact sync indicator. Renders nothing in the steady "synced" state to
 * avoid visual noise; only appears when the user needs to know something
 * (offline, syncing, queued writes pending).
 */
export const SyncStatusBadge = React.memo(function SyncStatusBadge({
  onPress,
  compact = false,
}: { onPress?: () => void; compact?: boolean }) {
  const { syncState, pendingSyncCount, forceReconnect } = useAppData();
  const { theme } = useTheme();
  const { t, format } = useTranslation();

  // Subtle pulse for the "syncing" spinner — uses native driver via Reanimated.
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (syncState === 'syncing') {
      pulse.value = withRepeat(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      pulse.value = withTiming(0, { duration: 200 });
    }
  }, [pulse, syncState]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + pulse.value * 0.4,
    transform: [{ rotate: `${pulse.value * 360}deg` }],
  }));

  // Haptic when state flips into a non-synced state — small notification so
  // the user feels the change instead of needing to spot a small badge.
  useEffect(() => {
    if (syncState === 'offline') haptics.warning();
  }, [syncState]);

  if (syncState === 'synced') return null;

  const tone =
    syncState === 'offline' ? theme.red
    : syncState === 'syncing' ? theme.blue
    : theme.yellow;

  const icon =
    syncState === 'offline' ? 'cloud-offline-outline'
    : syncState === 'syncing' ? 'sync-outline'
    : 'cloud-upload-outline';

  const label =
    syncState === 'offline' ? t('sync.offline')
    : syncState === 'syncing' ? t('sync.syncing')
    : pendingSyncCount > 0
      ? format('sync.queuedCount', { count: pendingSyncCount })
      : t('sync.queued');

  const handlePress = () => {
    haptics.light();
    if (onPress) onPress();
    else if (syncState === 'offline' || syncState === 'queued') forceReconnect();
  };

  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={8}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', gap: 6,
          paddingHorizontal: compact ? 8 : 10, paddingVertical: compact ? 4 : 6,
          borderRadius: 999,
          borderWidth: 1, borderColor: `${tone}55`,
          backgroundColor: pressed ? `${tone}30` : `${tone}18`,
        })}
      >
        <Animated.View style={syncState === 'syncing' ? pulseStyle : undefined}>
          <Ionicons name={icon as any} size={compact ? 12 : 14} color={tone} />
        </Animated.View>
        {!compact ? (
          <Text style={{ color: tone, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 }} numberOfLines={1}>
            {label}
          </Text>
        ) : pendingSyncCount > 0 ? (
          <Text style={{ color: tone, fontSize: 10, fontWeight: '800' }}>{pendingSyncCount}</Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
});

export default SyncStatusBadge;
