import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { QuantityPicker, Segment } from '@/components/shared';
import { TimerWidget } from '@/components/home';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { typeMeta } from '@/lib/entryComposer';
import { BottleIcon, BreastfeedingIcon } from '@/components/history/FeedingIcons';

type Props = {
  mode: 'breast' | 'bottle';
  setMode: (m: 'breast' | 'bottle') => void;
  amountMl: string;
  setAmountMl: (v: string) => void;
  durationMin: string;
  setDurationMin: (v: string) => void;
  side: string;
  setSide: (s: string) => void;
  largeTouchMode?: boolean;
};

const BOTTLE_PRESETS = ['150', '180', '240'] as const;

export const FeedSection = React.memo(function FeedSection({
  mode, setMode, amountMl, setAmountMl, durationMin, setDurationMin, side, setSide, largeTouchMode,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const meta = typeMeta.feed;

  return (
    <View style={styles.sectionCard}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('entry.type')}</Text>
      <Segment
        value={mode}
        onChange={(v) => {
          const next = v as 'breast' | 'bottle';
          // Reset the amount on an actual mode switch so a bottle volume never
          // bleeds into a breast "estimated amount" (which would inflate the
          // daily milk total) and vice-versa. Bottle gets a sane default;
          // breast starts empty (estimate is optional). This only fires on a
          // user tap, not when loading an existing entry for editing.
          if (next !== mode) setAmountMl(next === 'bottle' ? '150' : '');
          setMode(next);
        }}
        options={[
          { label: t('entry.breast'), value: 'breast', icon: <BreastfeedingIcon size={22} color={mode === 'breast' ? meta.tone : colors.muted} /> },
          { label: t('entry.bottle'), value: 'bottle', icon: <BottleIcon size={22} color={mode === 'bottle' ? meta.tone : colors.muted} /> },
        ]}
      />
      {mode === 'bottle' ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>{t('entry.amount')}</Text>
          <View style={styles.chipRow}>
            {BOTTLE_PRESETS.map((preset) => {
              const selected = amountMl === preset;
              return (
                <Pressable
                  key={preset}
                  onPress={() => setAmountMl(preset)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${preset} ml`}
                  style={[
                    styles.quickChip,
                    { borderColor: colors.border, backgroundColor: colors.card },
                    selected && { backgroundColor: meta.toneSoft, borderColor: meta.tone },
                  ]}
                >
                  <Text style={[styles.quickChipText, { color: colors.text }, selected && { color: meta.tone, fontWeight: '900' }]}>
                    {preset}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <QuantityPicker
            value={Number(amountMl) || 0}
            onChange={(v) => setAmountMl(String(v))}
            largeTouchMode={largeTouchMode}
          />
        </>
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>{t('entry.duration')}</Text>
          <TimerWidget
            label={t('entry.durationMin')}
            valueMinutes={Number(durationMin) || 0}
            onChangeMinutes={(minutes) => setDurationMin(String(minutes))}
            allowSides
            side={side as 'left' | 'right' | 'both'}
            onSideChange={(nextSide) => setSide(nextSide)}
            largeTouchMode={largeTouchMode}
          />
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>{t('entry.estimatedAmount')}</Text>
          <QuantityPicker
            value={Number(amountMl) || 0}
            onChange={(v) => setAmountMl(String(v))}
            largeTouchMode={largeTouchMode}
          />
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  sectionCard: { borderRadius: 14, padding: 14, gap: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quickChip: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 999, borderWidth: 1,
    minHeight: 44, justifyContent: 'center', alignItems: 'center',
  },
  quickChipText: { fontSize: 12, fontWeight: '700' },
});
