import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { symptomOptions, typeMeta } from '@/lib/entryComposer';

type Props = {
  symptoms: string[];
  onChange: (next: string[]) => void;
};

export const SymptomSection = React.memo(function SymptomSection({ symptoms, onChange }: Props) {
  const { colors } = useTheme();
  const meta = typeMeta.symptom;

  const toggle = (value: string) => {
    const next = symptoms.includes(value)
      ? symptoms.filter((s) => s !== value)
      : Array.from(new Set([value, ...symptoms])).slice(0, 4);
    onChange(next);
  };

  return (
    <View style={styles.sectionCard}>
      <View style={styles.chipRow}>
        {symptomOptions.map((option) => {
          const selected = symptoms.includes(option.value);
          return (
            <Pressable
              key={option.value}
              onPress={() => toggle(option.value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={option.label}
              style={[
                styles.chip,
                { borderColor: colors.border, backgroundColor: colors.card },
                selected && { backgroundColor: meta.toneSoft, borderColor: meta.tone },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: colors.text },
                  selected && { color: meta.tone, fontWeight: '900' },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  sectionCard: {
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
