import { Text, View } from 'react-native';
import { Button, Card, EmptyState, Heading, Page, StatPill } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';
import { getNextFeedSuggestion, getWeeklyTrend } from '@/utils/entries';
import { router } from 'expo-router';

export default function InsightsScreen() {
  const { colors } = useTheme();
  const { entries, summary } = useAppData();
  const trend = getWeeklyTrend(entries);
  const latestMeasurement = [...entries].find((entry) => entry.type === 'measurement');
  const latestMilestone = [...entries].find((entry) => entry.type === 'milestone');

  return (
    <Page>
      <Heading eyebrow="Insights" title="Actionable signals" subtitle={getNextFeedSuggestion(entries)} />

      {trend.some((item) => item.feedCount || item.bottleMl || item.sleepMinutes) ? (
        <>
          <Card>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>Weekly overview</Text>
            <View style={{ gap: 12 }}>
              {trend.map((day) => (
                <View key={day.key} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{day.label}</Text>
                    <Text style={{ color: colors.muted }}>{day.feedCount} feeds · {day.bottleMl} ml · {day.sleepMinutes} min</Text>
                  </View>
                  <View style={{ height: 8, borderRadius: 999, backgroundColor: colors.backgroundAlt, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.min(100, day.bottleMl / 10)}%`, height: '100%', backgroundColor: colors.primary, borderRadius: 999 }} />
                  </View>
                </View>
              ))}
            </View>
          </Card>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {summary.cards.map((card) => (
              <StatPill key={card.label} label={card.label} value={card.value} tone={card.tone} />
            ))}
          </View>
        </>
      ) : (
        <EmptyState
          title="No data yet"
          body="Add feeds, sleep, or measurements to unlock trend cards and growth views."
          action={<Button label="Create feed" onPress={() => router.push('/entry/feed')} />}
        />
      )}

      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <Card style={{ flex: 1, minWidth: 250 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Growth</Text>
          {latestMeasurement ? (
            <Text style={{ color: colors.muted, lineHeight: 20 }}>
              {latestMeasurement.payload.weightKg ? `${latestMeasurement.payload.weightKg} kg` : 'Add weight'}{' '}
              {latestMeasurement.payload.heightCm ? ` · ${latestMeasurement.payload.heightCm} cm` : ''}
            </Text>
          ) : (
            <Text style={{ color: colors.muted }}>Add weight and height to activate this block.</Text>
          )}
        </Card>
        <Card style={{ flex: 1, minWidth: 250 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Milestones</Text>
          {latestMilestone ? (
            <Text style={{ color: colors.muted, lineHeight: 20 }}>{latestMilestone.payload.title}</Text>
          ) : (
            <Text style={{ color: colors.muted }}>Milestones are shown here once recorded.</Text>
          )}
        </Card>
      </View>
    </Page>
  );
}
