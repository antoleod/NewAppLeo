import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { DiaperLevelPicker } from '@/components/home';

type Props = {
  pee: string;
  setPee: (v: string) => void;
  poop: string;
  setPoop: (v: string) => void;
  vomit: string;
  setVomit: (v: string) => void;
};

const fmt = (n: number) => (n > 3 ? String(n) : n === 3 ? '3+' : String(n));

export const DiaperSection = React.memo(function DiaperSection({
  pee, setPee, poop, setPoop, vomit, setVomit,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const peeN = Number(pee) || 0;
  const poopN = Number(poop) || 0;
  const vomitN = Number(vomit) || 0;
  const total = peeN + poopN + vomitN;

  return (
    <View style={styles.sectionCard}>
      <Animated.View
        entering={FadeIn.duration(220)}
        style={styles.summaryRow}
      >
        <View style={styles.summaryTextWrap}>
          <Text style={[styles.summaryText, { color: colors.text }]}>
            {peeN > 0 ? `\u{1F4A7} ${fmt(peeN)}` : ''}
            {peeN > 0 && (poopN > 0 || vomitN > 0) ? '  ·  ' : ''}
            {poopN > 0 ? `\u{1F4A9} ${fmt(poopN)}` : ''}
            {poopN > 0 && vomitN > 0 ? '  ·  ' : ''}
            {vomitN > 0 ? `\u{1F92E} ${fmt(vomitN)}` : ''}
          </Text>
        </View>
        {total > 0 ? (
          <View style={[styles.totalChip, { backgroundColor: `${colors.primary}1A`, borderColor: `${colors.primary}55` }]}>
            <Text style={[styles.totalChipText, { color: colors.primary }]}>{total}</Text>
          </View>
        ) : null}
      </Animated.View>

      <View style={styles.stack}>
        <Animated.View entering={FadeInDown.duration(260).delay(60)}>
          <DiaperLevelPicker emoji={'\u{1F4A7}'} label={t('diaper.pee')}
            value={peeN} onChange={(v) => setPee(String(v))} color="#58A6FF" />
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(260).delay(140)}>
          <DiaperLevelPicker emoji={'\u{1F4A9}'} label={t('diaper.poop')}
            value={poopN} onChange={(v) => setPoop(String(v))} color="#A371F7" />
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(260).delay(220)}>
          <DiaperLevelPicker emoji={'\u{1F92E}'} label={t('diaper.vomit')}
            value={vomitN} onChange={(v) => setVomit(String(v))} color="#F0B85A" />
        </Animated.View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  sectionCard: { borderRadius: 14, padding: 14, gap: 12 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingHorizontal: 4 },
  summaryTextWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryText: { fontSize: 14, fontWeight: '700' },
  totalChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  totalChipText: { fontSize: 11, fontWeight: '800' },
  stack: { gap: 18 },
});
