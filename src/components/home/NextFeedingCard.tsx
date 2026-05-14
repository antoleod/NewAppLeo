import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { typography } from '@/typography';
import { useNextFeeding } from '@/hooks/useNextFeeding';
import { usePulseAnimation } from '@/hooks/usePulseAnimation';
import { useTranslation } from '@/hooks/useTranslation';

export function NextFeedingCard({ onPress }: { onPress?: () => void }) {
  const { theme } = useTheme();
  const { t, format } = useTranslation();
  const { status, hoursAgo, lastTime, nextFeedLabel, nextFeedInMin, meanIntervalMin, recommendedAmount } = useNextFeeding();
  const isPossible = status === 'possible';
  const isSoon = status === 'soon';
  const { pulseStyle, glowStyle } = usePulseAnimation({ active: isPossible, intensity: 'soft' });

  const statusColor = isPossible ? theme.green : isSoon ? theme.accent : theme.blue;
  const statusLabel = isPossible ? t('nextFeeding.possible') : isSoon ? t('nextFeeding.soon') : t('nextFeeding.waiting');
  const statusIcon = isPossible ? 'checkmark-circle' : isSoon ? 'time' : 'hourglass-outline';

  const interval = meanIntervalMin ?? 180;
  const progressPct = isPossible
    ? 100
    : nextFeedInMin !== null
      ? Math.max(0, Math.min(100, ((interval - nextFeedInMin) / interval) * 100))
      : 0;

  const bigCountdown = isPossible ? t('nextFeeding.possible') : nextFeedLabel ?? '—';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('nextFeeding.title')}
      accessibilityHint={statusLabel}
      style={({ pressed }) => ({ opacity: pressed && onPress ? 0.85 : 1 })}
    >
      <View
        style={{
          borderRadius: 14,
          borderWidth: 1,
          padding: 16,
          marginBottom: 10,
          overflow: 'hidden',
          backgroundColor: theme.bgCard,
          borderColor: isPossible ? `${statusColor}66` : theme.border,
          borderLeftWidth: 3,
          borderLeftColor: statusColor,
        }}
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: -30,
              right: -30,
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: statusColor,
            },
            glowStyle,
          ]}
        />

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[typography.sectionLabel, { color: theme.accent }]}>{t('nextFeeding.eyebrow')}</Text>
            <Text style={[typography.sectionTitle, { color: theme.textPrimary }]} numberOfLines={1}>{t('nextFeeding.title')}</Text>
          </View>
          <Animated.View style={pulseStyle}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: statusColor,
                backgroundColor: `${statusColor}22`,
              }}
            >
              <Ionicons name={statusIcon as any} size={12} color={statusColor} />
              <Text style={[typography.pill, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </Animated.View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 4 }}>
          <Text style={{ color: theme.textMuted, fontFamily: 'DMSans_500Medium', fontSize: 11, marginBottom: 6 }}>
            {isPossible ? '' : t('feeding.nextIn')}
          </Text>
          <Text style={{ color: theme.textPrimary, fontFamily: 'DMSans_700Bold', fontSize: 28, letterSpacing: -0.5 }} numberOfLines={1}>
            {bigCountdown}
          </Text>
          {recommendedAmount ? (
            <View style={{ marginLeft: 'auto', marginBottom: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: `${theme.accent}1A`, borderWidth: 1, borderColor: `${theme.accent}55` }}>
              <Text style={{ color: theme.accent, fontFamily: 'DMSans_700Bold', fontSize: 12 }}>
                {`~${recommendedAmount.min}–${recommendedAmount.max} ml`}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ height: 4, borderRadius: 2, backgroundColor: `${theme.border}`, overflow: 'hidden', marginTop: 8, marginBottom: 8 }}>
          <View style={{ width: `${progressPct}%`, height: '100%', backgroundColor: statusColor, borderRadius: 2 }} />
        </View>

        {lastTime ? (
          <Text style={[typography.detail, { color: theme.textMuted }]} numberOfLines={1}>
            {format('nextFeeding.lastFeedDetail', { time: lastTime, hours: hoursAgo })}
          </Text>
        ) : (
          <Text style={[typography.detail, { color: theme.textMuted }]}>{t('nextFeeding.noFeed')}</Text>
        )}
      </View>
    </Pressable>
  );
}
