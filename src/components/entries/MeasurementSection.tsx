import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Input } from '@/components/shared';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocale } from '@/context/LocaleContext';
import { typeMeta } from '@/lib/entryComposer';
import { getSuggestedValues, getWeightCategory, getHeightCategory } from '@/lib/who-recommendations';
import type { EntryRecord } from '@/types';

type Props = {
  weightKg: string;
  setWeightKg: (v: string) => void;
  heightCm: string;
  setHeightCm: (v: string) => void;
  headCircCm: string;
  setHeadCircCm: (v: string) => void;
  tempC: string;
  setTempC: (v: string) => void;
  babyBirthDate?: string | null;
  lastMeasurementEntry?: EntryRecord;
};

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', es: 'es-ES', nl: 'nl-BE', en: 'en-US' };

export const MeasurementSection = React.memo(function MeasurementSection({
  weightKg, setWeightKg,
  heightCm, setHeightCm,
  headCircCm, setHeadCircCm,
  tempC, setTempC,
  babyBirthDate, lastMeasurementEntry,
}: Props) {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const { language } = useLocale();
  const meta = typeMeta.measurement;

  const suggested = babyBirthDate ? getSuggestedValues(babyBirthDate, t) : null;
  const weightCat = weightKg && babyBirthDate ? getWeightCategory(Number(weightKg), babyBirthDate, t) : null;
  const heightCat = heightCm && babyBirthDate ? getHeightCategory(Number(heightCm), babyBirthDate, t) : null;

  const dateLocale = LOCALE_MAP[language] ?? 'en-US';

  const clearAll = () => {
    setWeightKg('');
    setHeightCm('');
    setHeadCircCm('');
    setTempC('');
  };

  const applySuggestion = () => {
    if (!suggested) return;
    setWeightKg(suggested.weight.value.toFixed(1));
    setHeightCm(suggested.height.value.toFixed(1));
  };

  return (
    <View style={styles.sectionCard}>
      {lastMeasurementEntry ? (
        <View style={[styles.metaStrip, { borderColor: colors.border }]}>
          <Text style={[styles.metaText, { color: colors.muted }]}>
            {t('measurement.lastMeasurement')}{' '}
            {new Date(lastMeasurementEntry.occurredAt).toLocaleDateString(dateLocale)}
          </Text>
        </View>
      ) : null}

      {suggested ? (
        <View style={[styles.whoBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.whoTitle, { color: meta.tone }]}>{t('entry.whoSuggested')}</Text>
          <Text style={[styles.whoMessage, { color: colors.muted }]}>{suggested.message}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={applySuggestion}
              accessibilityRole="button"
              accessibilityLabel={t('measurement.useSuggestion')}
              style={[styles.quickBtn, { borderColor: meta.tone, backgroundColor: `${meta.tone}12` }]}
            >
              <Text style={[styles.quickBtnText, { color: meta.tone }]}>{t('measurement.useSuggestion')}</Text>
            </Pressable>
            <Pressable
              onPress={clearAll}
              accessibilityRole="button"
              accessibilityLabel={t('measurement.clear')}
              style={[styles.quickBtn, { borderColor: colors.border, backgroundColor: 'transparent' }]}
            >
              <Text style={[styles.quickBtnText, { color: colors.muted }]}>{t('measurement.clear')}</Text>
            </Pressable>
          </View>
          <View style={styles.whoRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.whoLabel, { color: colors.muted }]}>{t('entry.weight')}</Text>
              <Text style={[styles.whoValue, { color: meta.tone }]}>{suggested.weight.value.toFixed(1)} kg</Text>
              <Text style={[styles.whoRange, { color: colors.muted }]}>
                {suggested.weight.min.toFixed(1)} - {suggested.weight.max.toFixed(1)} kg
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.whoLabel, { color: colors.muted }]}>{t('entry.height')}</Text>
              <Text style={[styles.whoValue, { color: meta.tone }]}>{suggested.height.value.toFixed(1)} cm</Text>
              <Text style={[styles.whoRange, { color: colors.muted }]}>
                {suggested.height.min.toFixed(1)} - {suggested.height.max.toFixed(1)} cm
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={{ marginTop: suggested ? 12 : 0 }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('entry.currentMeasurements')}</Text>

        <View style={{ marginTop: 12 }}>
          <Input
            label={t('entry.weight')}
            value={weightKg}
            onChangeText={setWeightKg}
            keyboardType="decimal-pad"
            placeholder={suggested ? suggested.weight.value.toFixed(1) : '5.2'}
          />
          {weightCat ? (
            <Text style={[styles.feedback, { color: weightCat.category === 'healthy' ? theme.green : theme.yellow, marginTop: 8 }]}>
              {weightCat.emoji} {weightCat.message}
            </Text>
          ) : null}
        </View>

        <View style={{ marginTop: 12 }}>
          <Input
            label={t('entry.height')}
            value={heightCm}
            onChangeText={setHeightCm}
            keyboardType="decimal-pad"
            placeholder={suggested ? suggested.height.value.toFixed(1) : '52'}
          />
          {heightCat ? (
            <Text style={[styles.feedback, { color: heightCat.category === 'healthy' ? theme.green : theme.yellow, marginTop: 8 }]}>
              {heightCat.emoji} {heightCat.message}
            </Text>
          ) : null}
        </View>

        <Input label={t('entry.headCirc')} value={headCircCm} onChangeText={setHeadCircCm} keyboardType="decimal-pad" placeholder="35" />
        <Input label={t('entry.temperatureLabel')} value={tempC} onChangeText={setTempC} keyboardType="decimal-pad" placeholder="37.5" />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  sectionCard: { borderRadius: 14, padding: 14, gap: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  metaStrip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 },
  metaText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.1 },
  whoBox: { paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, marginBottom: 12 },
  whoTitle: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  whoMessage: { fontSize: 12, lineHeight: 18, marginBottom: 10, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  quickBtn: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickBtnText: { fontSize: 12, fontWeight: '800' },
  whoRow: { flexDirection: 'row', gap: 12 },
  whoLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  whoValue: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  whoRange: { fontSize: 10, fontWeight: '500' },
  feedback: { fontSize: 11, fontWeight: '600', lineHeight: 16 },
});
