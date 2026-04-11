import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export function QuantityPicker({
  label = 'Amount',
  value,
  onChange,
  presets = [100, 130, 150, 180],
  largeTouchMode = false,
}: {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  presets?: number[];
  largeTouchMode?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View style={styles.amountRow}>
        <Pressable
          onPress={() => onChange(Math.max(0, value - 10))}
          style={[
            styles.stepperButton,
            {
              width: largeTouchMode ? 52 : 44,
              height: largeTouchMode ? 52 : 44,
              backgroundColor: colors.backgroundAlt,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.stepperLabel, { color: colors.text }]}>-</Text>
        </Pressable>

        <View style={[styles.amountValue, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.amountText, { color: colors.text }]}>{value} ml</Text>
        </View>

        <Pressable
          onPress={() => onChange(value + 10)}
          style={[
            styles.stepperButton,
            {
              width: largeTouchMode ? 52 : 44,
              height: largeTouchMode ? 52 : 44,
              backgroundColor: colors.backgroundAlt,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.stepperLabel, { color: colors.text }]}>+</Text>
        </Pressable>
      </View>

      <View style={styles.chipsRow}>
        {presets.map((preset) => {
          const selected = preset === value;
          return (
            <Pressable
              key={preset}
              onPress={() => onChange(preset)}
              style={[
                styles.chip,
                {
                  paddingHorizontal: largeTouchMode ? 14 : 12,
                  paddingVertical: largeTouchMode ? 10 : 8,
                  backgroundColor: selected ? colors.primarySoft : colors.backgroundAlt,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={{ color: selected ? colors.primary : colors.muted, fontWeight: '700' }}>{preset} ml</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'left',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'nowrap',
  },
  stepperButton: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stepperLabel: {
    fontSize: 20,
    fontWeight: '900',
  },
  amountValue: {
    minWidth: 96,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  amountText: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
