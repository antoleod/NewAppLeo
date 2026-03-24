import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { typography } from '@/typography';
import { useNextFeeding } from '@/hooks/useNextFeeding';
import { usePulseAnimation } from '@/hooks/usePulseAnimation';

export function NextFeedingCard() {
  const { theme } = useTheme();
  const { status, hoursAgo, lastTime } = useNextFeeding();
  const isPossible = status === 'possible';
  const isSoon = status === 'soon';
  const { pulseStyle, glowStyle } = usePulseAnimation({ active: isPossible, intensity: 'soft' });

  const statusColor = isPossible ? theme.green : isSoon ? theme.accent : theme.muted;
  const statusLabel = isPossible ? 'Possible maintenant' : isSoon ? 'Bientot' : 'Pas encore';

  return (
    <View
      style={{
        borderRadius: 12,
        borderWidth: 1,
        padding: 14,
        marginBottom: 10,
        overflow: 'hidden',
        backgroundColor: theme.bgCard,
        borderColor: theme.border,
      }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: -20,
            right: -20,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: statusColor,
          },
          glowStyle,
        ]}
      />

      <Text style={[typography.sectionLabel, { color: theme.accent }]}>PRISE</Text>
      <Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>Next feeding</Text>

      <Animated.View style={[{ alignSelf: 'flex-start', marginTop: 8 }, pulseStyle]}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: statusColor,
            backgroundColor: `${statusColor}22`,
          }}
        >
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: statusColor }} />
          <Text style={[typography.pill, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </Animated.View>

      {lastTime ? (
        <Text style={[typography.detail, { color: theme.textMuted, marginTop: 6 }]}>Derniere prise a {lastTime} · il y a {hoursAgo} h</Text>
      ) : (
        <Text style={[typography.detail, { color: theme.textMuted, marginTop: 6 }]}>Aucune prise enregistree</Text>
      )}
    </View>
  );
}
