import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useActiveSleepDraft } from '@/hooks/useActiveSleepDraft';
import { shadow } from '@/lib/shadow';

function pad(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

function formatElapsed(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${pad(m)}m`;
  return `${pad(m)}:${pad(s)}`;
}

/**
 * Floating pill that surfaces an active sleep session from anywhere in the
 * app. Tapping it returns the user to the sleep entry screen, where the
 * full-screen timer picks up the same draft automatically. Hidden when
 * the user is already on the sleep entry screen (would be redundant).
 */
export function MinimizedSleepTimer() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const active = useActiveSleepDraft();

  if (!active) return null;
  if (pathname?.includes('/entry/')) return null;

  // Tab bar height (~74) + bottom safe area + small gap. The (tabs) layout
  // already pads the tab bar via marginBottom, so we add a few extra pixels.
  const bottomOffset = 74 + insets.bottom + 10;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: bottomOffset,
        alignItems: 'center',
      }}
    >
      <Pressable
        onPress={() => router.push('/entry/sleep')}
        accessibilityRole="button"
        accessibilityLabel={`${t('timer.sleeping')} · ${formatElapsed(active.elapsedSeconds)}. ${t('timer.tapToExpand')}`}
        style={({ pressed }) => ({
          width: '100%',
          maxWidth: 420,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 999,
          backgroundColor: theme.bgCard,
          borderWidth: 1,
          borderColor: theme.accent,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          ...shadow(theme.textPrimary, 0.18, 18, 0, 6),
        })}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            backgroundColor: `${theme.accent}22`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 16 }}>💤</Text>
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
            {t('timer.sleeping')}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 11 }} numberOfLines={1}>
            {t('timer.tapToExpand')}
          </Text>
        </View>
        <Text
          style={{
            color: theme.accent,
            fontSize: 16,
            fontWeight: '800',
            ...(Platform.OS === 'web' ? ({ fontVariantNumeric: 'tabular-nums' } as any) : null),
          }}
        >
          {formatElapsed(active.elapsedSeconds)}
        </Text>
        <Ionicons name="chevron-up" size={16} color={theme.accent} />
      </Pressable>
    </View>
  );
}
