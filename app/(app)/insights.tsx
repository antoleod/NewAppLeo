import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Card, Heading, Page } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';
import { Ionicons } from '@expo/vector-icons';

export default function InsightsScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { entries } = useAppData();
  const isDesktop = width >= 1280;
  const uiScale = isDesktop ? 0.8 : 1.0;

  // Cálculos de ejemplo para los Insights
  const feedingEntries = entries.filter(e => e.type === 'feeding');
  const solidEntries = entries.filter(e => e.type === 'solids');
  
  const totalVolume = feedingEntries.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const avgVolume = feedingEntries.length > 0 ? (totalVolume / feedingEntries.length).toFixed(0) : 0;
  
  const mealCount = solidEntries.filter(e => e.foodType === 'meal').length;
  const dessertCount = solidEntries.filter(e => e.foodType === 'dessert').length;

  return (
    <Page contentStyle={[styles.container, { maxWidth: isDesktop ? 900 : '100%' }]}>
      <Heading 
        eyebrow="Analysis" 
        title="Baby Insights" 
        subtitle="Understand habits and patterns to optimize the routine." 
      />

      <View style={[styles.grid, { gap: 16 * uiScale }]}>
        <Card style={styles.metricCard}>
          <Ionicons name="water" size={24 * uiScale} color={colors.primary} />
          <Text style={[styles.metricValue, { color: colors.text, fontSize: 24 * uiScale }]}>{avgVolume}ml</Text>
          <Text style={[styles.metricLabel, { color: colors.muted, fontSize: 13 * uiScale }]}>Avg. Feeding Volume</Text>
        </Card>

        <Card style={styles.metricCard}>
          <Ionicons name="restaurant" size={24 * uiScale} color="#FF9500" />
          <Text style={[styles.metricValue, { color: colors.text, fontSize: 24 * uiScale }]}>{mealCount + dessertCount}</Text>
          <Text style={[styles.metricLabel, { color: colors.muted, fontSize: 13 * uiScale }]}>Solid Meals Today</Text>
        </Card>

        <Card style={styles.metricCard}>
          <Ionicons name="moon" size={24 * uiScale} color={colors.primary} />
          <Text style={[styles.metricValue, { color: colors.text, fontSize: 24 * uiScale }]}>12h 40m</Text>
          <Text style={[styles.metricLabel, { color: colors.muted, fontSize: 13 * uiScale }]}>Daily Sleep Avg.</Text>
        </Card>
      </View>

      <Card style={{ marginTop: 8 * uiScale }}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 * uiScale }]}>Weekly Trend</Text>
        <View style={[styles.chartPlaceholder, { backgroundColor: colors.backgroundAlt }]}>
           <Text style={{ color: colors.muted }}>[ Visual Chart Content ]</Text>
        </View>
        <Text style={{ color: colors.muted, fontSize: 12 * uiScale, marginTop: 8 * uiScale }}>
          Feeding frequency has increased by 12% compared to last week.
        </Text>
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    padding: 20,
    gap: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricCard: {
    flex: 1,
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  metricValue: {
    fontWeight: '900',
    marginTop: 8,
  },
  metricLabel: {
    fontWeight: '600',
  },
  sectionTitle: {
    fontWeight: '800',
    marginBottom: 12,
  },
  chartPlaceholder: {
    height: 150,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  }
});