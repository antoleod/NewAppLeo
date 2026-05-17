import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Input } from '@/components/shared';
import { useTheme } from '@/context/ThemeContext';
import { useLocale } from '@/context/LocaleContext';
import { typeMeta } from '@/lib/entryComposer';

type Props = {
  value: string;
  onChange: (next: string) => void;
};

const PRESETS = ['36.5', '37.5', '38.5'] as const;

export const TemperatureSection = React.memo(function TemperatureSection({ value, onChange }: Props) {
  const { colors, theme } = useTheme();
  const { language } = useLocale();
  const meta = typeMeta.temperature;
  const numeric = Number(value);

  const status = !value
    ? null
    : numeric < 37.5
      ? { color: theme.green, emoji: '✅', text: 'Normal' }
      : numeric < 38
        ? {
            color: theme.yellow,
            emoji: '⚠️',
            text: language === 'fr' ? 'Fébricule' : language === 'es' ? 'Febrícula' : language === 'nl' ? 'Lichte koorts' : 'Mild fever',
          }
        : {
            color: theme.red,
            emoji: '🔥',
            text: language === 'fr' ? 'Fièvre' : language === 'es' ? 'Fiebre' : language === 'nl' ? 'Koorts' : 'Fever',
          };

  const stepBy = (delta: number) => {
    const current = numeric || 37.5;
    onChange(Math.max(35, Math.min(42, current + delta)).toFixed(1));
  };

  return (
    <View style={styles.sectionCard}>
      <View style={styles.presets}>
        {PRESETS.map((preset) => {
          const selected = value === preset;
          return (
            <Pressable
              key={preset}
              onPress={() => onChange(preset)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${preset} °C`}
              style={[
                styles.preset,
                { borderColor: colors.border, backgroundColor: colors.card },
                selected && { backgroundColor: meta.toneSoft, borderColor: meta.tone },
              ]}
            >
              <Text
                style={[
                  styles.presetText,
                  { color: colors.text },
                  selected && { color: meta.tone, fontWeight: '900' },
                ]}
              >
                {preset}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.inputRow}>
        <Pressable
          onPress={() => stepBy(-0.1)}
          accessibilityRole="button"
          accessibilityLabel="−0.1 °C"
          style={[styles.stepBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Text style={[styles.stepBtnText, { color: colors.text }]}>−</Text>
        </Pressable>

        <View style={{ flex: 1 }}>
          <Input
            label="°C"
            value={value}
            onChangeText={(text) => {
              const clean = text.replace(/[^0-9.]/g, '');
              if (clean === '' || /^\d*\.?\d{0,2}$/.test(clean)) onChange(clean);
            }}
            placeholder="37.5"
            keyboardType="decimal-pad"
            inputMode="decimal"
          />
        </View>

        <Pressable
          onPress={() => stepBy(+0.1)}
          accessibilityRole="button"
          accessibilityLabel="+0.1 °C"
          style={[styles.stepBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Text style={[styles.stepBtnText, { color: colors.text }]}>+</Text>
        </Pressable>
      </View>

      {status ? (
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: `${status.color}28`, borderColor: status.color }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.emoji} {status.text}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  sectionCard: { borderRadius: 14, padding: 14, gap: 12 },
  presets: { flexDirection: 'row', gap: 8 },
  preset: {
    flex: 1, minHeight: 44,
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  presetText: { fontSize: 16, fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 44, height: 44, borderRadius: 12,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText: { fontSize: 22, fontWeight: '900' },
  statusContainer: { marginTop: 4 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1,
  },
  statusText: { fontSize: 13, fontWeight: '800' },
});
