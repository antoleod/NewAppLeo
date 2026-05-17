import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useTimer, TimerKind } from '@/context/TimerContext';
import { shadow } from '@/lib/shadow';
import { BottleIcon, BreastfeedingIcon } from '@/components/history/FeedingIcons';
import { PumpIcon, SleepIcon } from '@/components/history/EntryTypeIcons';

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

const KIND_LABEL: Record<TimerKind, string> = {
  breast: 'timer.feedingBreast',
  bottle: 'timer.feedingBottle',
  sleep: 'timer.sleeping',
  pump: 'timer.pumping',
};

export function MiniTimerBar() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { active, elapsedSeconds, expand } = useTimer();

  if (!active || !active.minimized) return null;

  const onEntryScreenForKind =
    (active.kind === 'sleep' && pathname?.includes('/entry/sleep')) ||
    (active.kind === 'pump' && pathname?.includes('/entry/pump'));
  if (onEntryScreenForKind) return null;

  const bottomOffset = 74 + insets.bottom + 10;
  const labelKey = KIND_LABEL[active.kind];
  const timerIcon =
    active.kind === 'breast' ? <BreastfeedingIcon size={22} color={theme.accent} /> :
    active.kind === 'bottle' ? <BottleIcon size={22} color={theme.accent} /> :
    active.kind === 'pump' ? <PumpIcon size={22} color={theme.accent} /> :
    <SleepIcon size={22} color={theme.accent} />;

  const onPress = () => {
    expand();
    if (active.kind === 'sleep' && !pathname?.includes('/entry/sleep')) {
      router.push('/entry/sleep');
    } else if (active.kind === 'pump' && !pathname?.includes('/entry/pump')) {
      router.push('/entry/pump');
    } else if ((active.kind === 'breast' || active.kind === 'bottle') && !pathname?.includes('/home')) {
      router.push('/home');
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(180)}
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
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${t(labelKey)} · ${formatElapsed(elapsedSeconds)}. ${t('timer.tapToExpand')}`}
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
            width: 30,
            height: 30,
            borderRadius: 999,
            backgroundColor: `${theme.accent}22`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {timerIcon}
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
            {t(labelKey)}
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
          {formatElapsed(elapsedSeconds)}
        </Text>
        <Ionicons name="chevron-up" size={16} color={theme.accent} />
      </Pressable>
    </Animated.View>
  );
}
