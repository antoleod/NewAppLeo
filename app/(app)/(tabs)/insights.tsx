import { useMemo, useState } from 'react';
import { Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Button, EmptyState, Heading, Page } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { useTranslation } from '@/hooks/useTranslation';
import { getMeanFeedingInterval } from '@/lib/patterns';
import { whoHeightTable, whoWeightTable } from '@/lib/who-data';
import {
  getSuggestedValues,
  getWeightCategory,
  getHeightCategory,
  getAgeInMonths
} from '@/lib/who-recommendations';
import { getWeeklyTrend } from '@/utils/entries';
import { dateKey, formatDuration, startOfDay, subtractDays } from '@/utils/date';

const BG = '#0D1117';
const CARD = '#161B22';
const BORDER = '#21262D';
const GOLD = '#C9A227';
const GREEN = '#3FB950';
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
  const { language } = useLocale();
  const { t } = useTranslation();
  const { entries, summary } = useAppData();
  const { profile } = useAuth();
  const [range, setRange] = useState<RangeKey>('7d');

  const trend = useMemo(() => getWeeklyTrend(entries), [entries]);
  const meanInterval = getMeanFeedingInterval(entries);
  const latestMeasurement = useMemo(() => [...entries].find((entry) => entry.type === 'measurement'), [entries]);
  const latestWeight = Number(latestMeasurement?.payload?.weightKg ?? 0) || null;
  const latestHeight = Number(latestMeasurement?.payload?.heightCm ?? 0) || null;
  const latestHeadCirc = Number(latestMeasurement?.payload?.headCircCm ?? 0) || null;
  const sleepMinutes = summary.today.sleepMinutes;

  // WHO Recommendations
  const whoSuggested = profile?.babyBirthDate ? getSuggestedValues(profile.babyBirthDate) : null;
  const ageMonths = profile?.babyBirthDate ? getAgeInMonths(profile.babyBirthDate) : null;
  const weightCategory = latestWeight && profile?.babyBirthDate ? getWeightCategory(latestWeight, profile.babyBirthDate) : null;
  const heightCategory = latestHeight && profile?.babyBirthDate ? getHeightCategory(latestHeight, profile.babyBirthDate) : null;

  // Weight measurements history
  const weightHistory = useMemo(() => {
    return [...entries]
      .filter((e) => e.type === 'measurement' && e.payload?.weightKg)
      .slice(0, 7)
      .reverse()
      .map((e) => ({
        weight: e.payload.weightKg,
        date: new Date(e.occurredAt),
      }));
  }, [entries]);

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

  const summaryCards = [
    { label: t('insights.feeds'), value: String(summary.today.feedCount), color: GOLD },
    { label: t('insights.bottle'), value: `${summary.today.bottleMl} ml`, color: BLUE },
    { label: t('insights.sleep'), value: formatDuration(summary.today.sleepMinutes), color: GREEN },
    { label: t('insights.diapers'), value: String(summary.today.diaperCount), color: '#F778BA' },
    { label: t('insights.food'), value: String(summary.today.foodCount), color: '#F0B85A' },
  ];

  if (!entries.length) {
    return (
      <Page contentStyle={{ width: '100%' }}>
        <Heading eyebrow={t('insights.eyebrow')} title={t('insights.title')} subtitle={t('insights.subtitle.none')} />
        <EmptyState
          icon="bar-chart-outline"
          title={t('insights.noDataTitle')}
          body={t('insights.noDataBody')}
          action={<Button label={t('insights.createFeed')} onPress={() => router.push('/entry/feed')} />}
        />
      </Page>
    );
  }

  return (
    <Page contentStyle={{ width: '100%' }}>
      <View style={{ backgroundColor: BG, borderRadius: 16, paddingTop: 12, paddingHorizontal: 12, paddingBottom: 80 }}>
        <Animated.View entering={FadeIn.duration(280)} style={{ marginBottom: 10 }}>
          <Heading
            eyebrow={t('insights.eyebrow')}
            title={t('insights.title')}
            subtitle={meanInterval ? `${Math.round(meanInterval / 36e5)}h` : t('insights.subtitle.none')}
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
                flexBasis: '48%',
                minWidth: 140,
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
          <Animated.View entering={FadeIn.duration(280).delay(240)} style={{ flex: 1, minWidth: 260, marginBottom: 10 }}>
            <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 10 }}>
              <Text style={eyebrowStyle()}>{t('insights.growth')}</Text>
              <Text style={titleStyle()}>{language === 'fr' ? 'Croissance' : 'Growth'}</Text>

              {whoSuggested && ageMonths !== null && (
                <View style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: `${GREEN}15`, borderWidth: 1, borderColor: `${GREEN}40`, gap: 6, marginBottom: 4 }}>
                  <Text style={{ color: GREEN, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    💡 {language === 'fr' ? 'Selon OMS' : 'WHO Reference'}
                  </Text>
                  <Text style={{ color: TEXT, fontSize: 12, lineHeight: 18 }}>{whoSuggested.message}</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: MUTED, fontSize: 9, fontWeight: '600' }}>
                        {language === 'fr' ? 'POIDS' : 'WEIGHT'}
                      </Text>
                      <Text style={{ color: GREEN, fontSize: 14, fontWeight: '700' }}>
                        {whoSuggested.weight.value.toFixed(1)} kg
                      </Text>
                      <Text style={{ color: MUTED, fontSize: 9, marginTop: 2 }}>
                        {whoSuggested.weight.min.toFixed(1)} - {whoSuggested.weight.max.toFixed(1)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: MUTED, fontSize: 9, fontWeight: '600' }}>
                        {language === 'fr' ? 'TAILLE' : 'HEIGHT'}
                      </Text>
                      <Text style={{ color: GREEN, fontSize: 14, fontWeight: '700' }}>
                        {whoSuggested.height.value.toFixed(1)} cm
                      </Text>
                      <Text style={{ color: MUTED, fontSize: 9, marginTop: 2 }}>
                        {whoSuggested.height.min.toFixed(1)} - {whoSuggested.height.max.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={{ gap: 8 }}>
                <View>
                  <Text style={{ color: MUTED, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                    {language === 'fr' ? 'Mesures actuelles' : 'Current'}
                  </Text>
                  <Text style={{ color: TEXT, fontSize: 20, fontWeight: '700' }}>{latestWeight ? `${latestWeight} kg` : '--'}</Text>
                  <Text style={{ color: MUTED, fontSize: 11 }}>
                    {latestHeight ? `${latestHeight} cm` : '--'} {latestHeadCirc ? `· ${latestHeadCirc} cm HC` : ''}
                  </Text>
                </View>

                {weightCategory && (
                  <View style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: `${weightCategory.category === 'healthy' ? GREEN : '#F2C86F'}15`, borderWidth: 1, borderColor: `${weightCategory.category === 'healthy' ? GREEN : '#F2C86F'}40` }}>
                    <Text style={{ color: weightCategory.category === 'healthy' ? GREEN : '#F2C86F', fontSize: 11, fontWeight: '600', lineHeight: 16 }}>
                      {weightCategory.emoji} {weightCategory.message}
                    </Text>
                  </View>
                )}

                {heightCategory && (
                  <View style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: `${heightCategory.category === 'healthy' ? GREEN : '#F2C86F'}15`, borderWidth: 1, borderColor: `${heightCategory.category === 'healthy' ? GREEN : '#F2C86F'}40` }}>
                    <Text style={{ color: heightCategory.category === 'healthy' ? GREEN : '#F2C86F', fontSize: 11, fontWeight: '600', lineHeight: 16 }}>
                      {heightCategory.emoji} {heightCategory.message}
                    </Text>
                  </View>
                )}
              </View>

              {weightHistory.length > 0 && (
                <View style={{ gap: 8, marginTop: 8 }}>
                  <Text style={{ color: MUTED, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {language === 'fr' ? 'Historique' : 'Trend'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 50, justifyContent: 'center' }}>
                    {(() => {
                      const weights = weightHistory.map((w) => w.weight ?? 0).filter((w) => w > 0);
                      if (weights.length === 0) return null;
                      const maxWeight = Math.max(...weights);
                      const minWeight = Math.min(...weights);
                      const range = maxWeight - minWeight || 1;
                      return weightHistory.map((m, i) => {
                        const w = m.weight ?? 0;
                        const height = ((w - minWeight) / range) * 40 + 10;
                        return (
                          <View
                            key={i}
                            style={{
                              flex: 1,
                              height,
                              borderRadius: 4,
                              backgroundColor: GREEN,
                              opacity: 0.5 + (i / weightHistory.length) * 0.5,
                            }}
                          />
                        );
                      });
                    })()}
                  </View>
                </View>
              )}

              <Pressable onPress={() => router.push('/entry/measurement')} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: `${GREEN}20`, borderWidth: 1, borderColor: `${GREEN}40`, marginTop: 4 }}>
                <Text style={{ color: GREEN, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                  {language === 'fr' ? '📏 Ajouter une mesure' : '📏 Add Measurement'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.duration(280).delay(320)} style={{ flex: 1, minWidth: 260, marginBottom: 10 }}>
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
