import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { QuantityPicker } from '@/components/shared';
import { TimerWidget } from '@/components/home';

type Props = {
  durationMin: string;
  setDurationMin: (v: string) => void;
  amountMl: string;
  setAmountMl: (v: string) => void;
  largeTouchMode?: boolean;
};

export const PumpSection = React.memo(function PumpSection({
  durationMin, setDurationMin, amountMl, setAmountMl, largeTouchMode,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.sectionCard}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('entry.duration')}</Text>
      <TimerWidget
        label={t('entry.sessionMin')}
        valueMinutes={Number(durationMin) || 0}
        onChangeMinutes={(minutes) => setDurationMin(String(minutes))}
        largeTouchMode={largeTouchMode}
      />
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>{t('entry.amount')}</Text>
      <QuantityPicker
        value={Number(amountMl) || 0}
        onChange={(v) => setAmountMl(String(v))}
        largeTouchMode={largeTouchMode}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  sectionCard: { borderRadius: 14, padding: 14, gap: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
});
