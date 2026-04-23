import { useMemo, useState } from 'react';
import { Share, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Button, EmptyState, Heading, Page } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import { useLocale } from '@/context/LocaleContext';
import { getMeanFeedingInterval } from '@/lib/patterns';
import { useResponsiveMetrics } from '@/lib/responsive';
import { whoHeightTable, whoWeightTable } from '@/lib/who-data';
import { getWeeklyTrend } from '@/utils/entries';
import { dateKey, formatDuration, startOfDay, subtractDays } from '@/utils/date';

const BG = '#0D1117';
const CARD = '#161B22';
const BORDER = '#21262D';
const GOLD = '#C9A227';
const GREEN = '#B88A2A';
const BLUE = '#58A6FF';
const MUTED = '#8B949E';
const TEXT = '#F0F6FC';

type RangeKey = '7d' | '3d' | 'today';

function eyebrowStyle() {
  return { color: GOLD, fontSize: 10, letterSpacing: 1.5, fontWeight: '600' as const, textTransform: 'uppercase' as const };
}

function titleStyle() {
  return { color: TEXT, fontSize: 18, fontWeight: '700' as const, marginTop: 2 };
}

export default function InsightsScreen() {
  const responsive = useResponsiveMetrics();
  const { t, language } = useLocale();
  const { entries, summary } = useAppData();
  const [range, setRange] = useState<RangeKey>('7d');

  const trend = useMemo(() => getWeeklyTrend(entries), [entries]);
  const meanInterval = getMeanFeedingInterval(entries);
  const latestMeasurement = useMemo(() => [...entries].find((entry) => entry.type === 'measurement'), [entries]);
  const latestWeight = Number(latestMeasurement?.payload?.weightKg ?? 0) || null;
  const latestHeight = Number(latestMeasurement?.payload?.heightCm ?? 0) || null;
  const latestHeadCirc = Number(latestMeasurement?.payload?.headCircCm ?? 0) || null;
  const sleepMinutes = summary.today.sleepMinutes;

  const sleepByDay = useMemo(() => {
    const days = range === 'today' ? 1 : range === '3d' ? 3 : 7;
    return Array.from({ length: days }, (_, index) => {
      const day = subtractDays(startOfDay(new Date()), days - 1 - index);
      const key = dateKey(day);
      const minutes = entries
        .filter((entry) => entry.type === 'sleep' && dateKey(entry.occurredAt) === key)
        .reduce((sum, entry) => sum + (entry.payload?.durationMin ?? 0), 0);
      return {
        key,
        label: new Intl.DateTimeFormat(language, { weekday: 'short' }).format(day),
        minutes,
      };
    });
  }, [entries, language, range]);

  const longestSleep = useMemo(
    () => Math.max(0, ...entries.filter((entry) => entry.type === 'sleep').map((entry) => entry.payload?.durationMin ?? 0)),
    [entries],
  );

  async function shareSummary() {
    const digest = [
      language === 'fr' ? 'Resume du jour' : 'Daily summary',
      `${language === 'fr' ? 'Prises' : 'Feeds'}: ${summary.today.feedCount}`,
      `${language === 'fr' ? 'Lait' : 'Bottle'}: ${summary.today.bottleMl} ml`,
      `${language === 'fr' ? 'Sommeil' : 'Sleep'}: ${formatDuration(summary.today.sleepMinutes)}`,
      `${language === 'fr' ? 'Couches' : 'Diapers'}: ${summary.today.diaperCount}`,
      `${language === 'fr' ? 'Repas' : 'Food'}: ${summary.today.foodCount}`,
    ].join('\n');

    await Share.share({
      message: digest,
      title: language === 'fr' ? 'Resume du jour' : 'Daily summary',
    });
  }

  const summaryCards = [
    { label: language === 'fr' ? 'Prises' : 'Feeds', value: String(summary.today.feedCount), color: GOLD },
    { label: language === 'fr' ? 'Lait' : 'Bottle', value: `${summary.today.bottleMl} ml`, color: BLUE },
    { label: language === 'fr' ? 'Sommeil' : 'Sleep', value: formatDuration(summary.today.sleepMinutes), color: GREEN },
    { label: language === 'fr' ? 'Couches' : 'Diapers', value: String(summary.today.diaperCount), color: '#F778BA' },
    { label: language === 'fr' ? 'Repas' : 'Food', value: String(summary.today.foodCount), color: '#F0B85A' },
  ];

  if (!entries.length) {
    return (
      <Page contentStyle={{ width: '100%' }}>
        <Heading eyebrow={t('insights.eyebrow')} title={t('insights.title')} subtitle={t('insights.subtitle.none')} />
        <EmptyState
          title={t('insights.noDataTitle')}
          body={t('insights.noDataBody')}
          action={<Button label={t('insights.createFeed')} onPress={() => router.push('/entry/feed')} />}
        />
      </Page>
    );
  }

  return (
    <Page contentStyle={{ width: '100%' }}>
      <View
        style={{
          backgroundColor: BG,
          borderRadius: 16,
          paddingTop: responsive.isPhone ? 10 : 12,
          paddingHorizontal: responsive.isCompactPhone ? 10 : 12,
          paddingBottom: 80,
        }}
      >
        <Animated.View entering={FadeIn.duration(280)} style={{ marginBottom: 10 }}>
          <Heading
            eyebrow={t('insights.eyebrow')}
            title={t('insights.title')}
            subtitle={meanInterval ? `${Math.round(meanInterval / 36e5)}h` : t('insights.subtitle.none')}
            action={<Button label={language === 'fr' ? 'Partager' : 'Share'} onPress={() => void shareSummary()} variant="ghost" size="sm" fullWidth={false} />}
          />
        </Animated.View>

        <Animated.View entering={FadeIn.duration(280).delay(80)} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: '7J', value: '7d' },
              { label: '3J', value: '3d' },
              { label: '1J', value: 'today' },
            ].map((item) => {
              const active = range === item.value;
              return (
                <View key={item.value} style={{ flex: 1 }}>
                  <Button label={item.label} onPress={() => setRange(item.value as RangeKey)} variant={active ? 'secondary' : 'ghost'} />
                </View>
              );
            })}
          </View>
        </Animated.View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {summaryCards.map((card, index) => (
            <Animated.View
              key={card.label}
              entering={FadeInDown.duration(240).delay(index * 60)}
              style={{
                flexBasis: responsive.isCompactPhone ? '100%' : '48%',
                minWidth: responsive.isCompactPhone ? 0 : 140,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: CARD,
                borderWidth: 1,
                borderColor: BORDER,
                gap: 6,
              }}
            >
              <Text style={{ color: MUTED, fontSize: 10, fontWeight: '600', letterSpacing: 1.2 }}>{card.label.toUpperCase()}</Text>
              <Text style={{ color: card.color, fontSize: 22, fontWeight: '700' }}>{card.value}</Text>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeIn.duration(280).delay(160)} style={{ marginBottom: 10 }}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 10 }}>
            <Text style={eyebrowStyle()}>{t('insights.weeklyOverview')}</Text>
            <Text style={titleStyle()}>{language === 'fr' ? 'Tendance hebdomadaire' : 'Weekly trend'}</Text>
            <View style={{ gap: 10 }}>
              {trend.map((day) => (
                <View key={day.key} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                    <Text style={{ color: TEXT, fontSize: 13, fontWeight: '700' }}>{day.label}</Text>
                    <Text style={{ color: MUTED, fontSize: 11 }}>
                      {day.feedCount} · {day.bottleMl} ml · {day.sleepMinutes} min
                    </Text>
                  </View>
                  <View style={{ height: 8, borderRadius: 999, backgroundColor: BORDER, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.min(100, day.bottleMl / 10)}%`, height: '100%', backgroundColor: GOLD, borderRadius: 999 }} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Animated.View entering={FadeIn.duration(280).delay(240)} style={{ flex: 1, minWidth: responsive.isPhone ? '100%' : 260, marginBottom: 10 }}>
            <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 10 }}>
              <Text style={eyebrowStyle()}>{t('insights.growth')}</Text>
              <Text style={titleStyle()}>{language === 'fr' ? 'Croissance' : 'Growth'}</Text>
              <View style={{ gap: 8 }}>
                <Text style={{ color: TEXT, fontSize: 20, fontWeight: '700' }}>{latestWeight ? `${latestWeight} kg` : '--'}</Text>
                <Text style={{ color: MUTED, fontSize: 11 }}>
                  {latestHeight ? `${latestHeight} cm` : '--'} {latestHeadCirc ? `· ${latestHeadCirc} cm HC` : ''}
                </Text>
                <Text style={{ color: latestWeight && latestWeight <= whoWeightTable[1].p50 ? GOLD : GREEN, fontSize: 13, fontWeight: '700' }}>
                  {latestWeight && latestWeight <= whoWeightTable[1].p50 ? t('insights.lowerMedian') : t('insights.aboveMedian')}
                </Text>
                <Text style={{ color: MUTED, fontSize: 11 }}>
                  {t('insights.whoLoaded')}: {whoWeightTable.length} / {whoHeightTable.length}
                </Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.duration(280).delay(320)} style={{ flex: 1, minWidth: responsive.isPhone ? '100%' : 260, marginBottom: 10 }}>
            <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 10 }}>
              <Text style={eyebrowStyle()}>{t('insights.sleepAnalysis')}</Text>
              <Text style={titleStyle()}>{language === 'fr' ? 'Sommeil' : 'Sleep'}</Text>
              <Text style={{ color: MUTED, fontSize: 11 }}>
                {t('insights.todaySleep')}: {sleepMinutes ? `${sleepMinutes} min` : '0 min'}
              </Text>
              <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700' }}>
                {t('insights.longestStretch')}: {formatDuration(longestSleep)}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-end', height: 96 }}>
                {sleepByDay.map((day) => (
                  <View key={day.key} style={{ flex: 1, gap: 6, alignItems: 'center' }}>
                    <View style={{ height: 80, width: '100%', justifyContent: 'flex-end' }}>
                      <View
                        style={{
                          height: `${Math.min(100, day.minutes)}%`,
                          minHeight: day.minutes ? 8 : 4,
                          borderRadius: 999,
                          backgroundColor: BLUE,
                        }}
                      />
                    </View>
                    <Text style={{ color: MUTED, fontSize: 11 }}>{day.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        </View>
      </View>
    </Page>
  );
}
