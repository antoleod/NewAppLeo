import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, EmptyState, Heading, Page, StatPill } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import { useTheme } from '@/context/ThemeContext';
import { getMeanFeedingInterval } from '@/lib/patterns';
import { whoHeightTable, whoWeightTable } from '@/lib/who-data';
import { getWeeklyTrend } from '@/utils/entries';
import { dateKey, formatDuration, startOfDay, subtractDays } from '@/utils/date';

export default function InsightsScreen() {
  const { colors } = useTheme();
  const { entries, summary } = useAppData();
  const trend = useMemo(() => getWeeklyTrend(entries), [entries]);
  const meanInterval = getMeanFeedingInterval(entries);
  const latestMeasurement = useMemo(() => [...entries].find((entry) => entry.type === 'measurement'), [entries]);
  const sleepMinutes = summary.today.sleepMinutes;
  const sleepByDay = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const day = subtractDays(startOfDay(new Date()), 6 - index);
        const key = dateKey(day);
        const minutes = entries
          .filter((entry) => entry.type === 'sleep' && dateKey(entry.occurredAt) === key)
          .reduce((sum, entry) => sum + (entry.payload.durationMin ?? 0), 0);
        return { key, label: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(day), minutes };
      }),
    [entries],
  );
  const longestSleep = useMemo(
    () => Math.max(0, ...entries.filter((entry) => entry.type === 'sleep').map((entry) => entry.payload.durationMin ?? 0)),
    [entries],
  );
  const latestWeight = Number(latestMeasurement?.payload.weightKg ?? 0) || null;
  const latestHeight = Number(latestMeasurement?.payload.heightCm ?? 0) || null;

  if (!entries.length) {
    return (
      <Page>
        <Heading eyebrow="Insights" title="Actionable signals" subtitle="Trends appear after you log a few entries." />
        <EmptyState
          title="No data yet"
          body="Add feeds, sleep, or measurements to unlock trend cards and growth views."
          action={<Button label="Create feed" onPress={() => router.push('/entry/feed')} />}
        />
      </Page>
    );
  }

  return (
    <Page>
      <Heading
        eyebrow="Insights"
        title="Actionable signals"
        subtitle={meanInterval ? `Mean feeding interval: ${Math.round(meanInterval / 36e5)}h` : 'Log more feeds to estimate cadence.'}
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {summary.cards.map((card) => (
          <StatPill key={card.label} label={card.label} value={card.value} tone={card.tone} />
        ))}
      </View>

      <Card>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Weekly overview</Text>
        <View style={{ gap: 12 }}>
          {trend.map((day) => (
            <View key={day.key} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{day.label}</Text>
                <Text style={{ color: colors.muted }}>
                  {day.feedCount} feeds · {day.bottleMl} ml · {day.sleepMinutes} min
                </Text>
              </View>
              <View style={{ height: 8, borderRadius: 999, backgroundColor: colors.backgroundAlt, overflow: 'hidden' }}>
                <View style={{ width: `${Math.min(100, day.bottleMl / 10)}%`, height: '100%', backgroundColor: colors.primary, borderRadius: 999 }} />
              </View>
            </View>
          ))}
        </View>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Card style={{ flex: 1, minWidth: 250 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Growth</Text>
          {latestMeasurement ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.muted, lineHeight: 20 }}>
                {latestMeasurement.payload.weightKg ? `${latestMeasurement.payload.weightKg} kg` : 'Add weight'}{' '}
                {latestMeasurement.payload.heightCm ? `· ${latestMeasurement.payload.heightCm} cm` : ''}
              </Text>
              <Text style={{ color: colors.text, fontWeight: '800' }}>
                {latestWeight && latestWeight <= whoWeightTable[1].p50 ? 'Around the lower WHO median range.' : 'Around or above the WHO median range.'}
              </Text>
              <Text style={{ color: colors.muted }}>
                WHO tables loaded: {whoWeightTable.length} weight anchors, {whoHeightTable.length} height anchors.
              </Text>
            </View>
          ) : (
            <Text style={{ color: colors.muted }}>Add weight and height to activate this block.</Text>
          )}
        </Card>
        <Card style={{ flex: 1, minWidth: 250 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Sleep analysis</Text>
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.muted }}>{sleepMinutes ? `Today: ${sleepMinutes} minutes.` : 'No sleep logged today yet.'}</Text>
            <Text style={{ color: colors.text, fontWeight: '800' }}>Longest stretch: {formatDuration(longestSleep)}</Text>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-end', height: 96 }}>
              {sleepByDay.map((day) => (
                <View key={day.key} style={{ flex: 1, gap: 6, alignItems: 'center' }}>
                  <View style={{ height: 80, width: '100%', justifyContent: 'flex-end' }}>
                    <View
                      style={{
                        height: `${Math.min(100, day.minutes)}%`,
                        minHeight: day.minutes ? 8 : 4,
                        borderRadius: 999,
                        backgroundColor: colors.secondary,
                      }}
                    />
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>{day.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </Card>
      </View>
    </Page>
  );
}
