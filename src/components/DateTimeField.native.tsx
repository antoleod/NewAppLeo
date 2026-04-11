import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '@/context/ThemeContext';

function formatCompactDateTime(value: Date, locale = 'fr-FR') {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

export function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date;
  onChange: (value: Date) => void;
}) {
  const { colors } = useTheme();
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [draftValue, setDraftValue] = useState<Date | null>(null);

  const displayValue = useMemo(() => formatCompactDateTime(value), [value]);

  function openDatePicker() {
    setDraftValue(new Date(value));
    setPickerMode('date');
  }

  function handleChange(_: DateTimePickerEvent, next?: Date) {
    if (!next) {
      setPickerMode(null);
      setDraftValue(null);
      return;
    }

    if (pickerMode === 'date') {
      const merged = new Date(draftValue ?? value);
      merged.setFullYear(next.getFullYear(), next.getMonth(), next.getDate());
      setDraftValue(merged);
      setPickerMode('time');
      return;
    }

    const merged = new Date(draftValue ?? value);
    merged.setHours(next.getHours(), next.getMinutes(), 0, 0);
    onChange(merged);
    setPickerMode(null);
    setDraftValue(null);
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Pressable
        onPress={openDatePicker}
        style={({ pressed }) => [
          styles.control,
          {
            borderColor: colors.border,
            backgroundColor: colors.backgroundAlt,
            opacity: pressed ? 0.88 : 1,
          },
        ]}
      >
        <Text style={[styles.controlLabel, { color: colors.muted }]}>Date & time</Text>
        <Text style={[styles.controlValue, { color: colors.text }]}>{displayValue}</Text>
      </Pressable>
      {pickerMode ? <DateTimePicker value={draftValue ?? value} mode={pickerMode} display="default" onChange={handleChange} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  control: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
  },
  controlLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  controlValue: {
    fontSize: 14,
    fontWeight: '800',
  },
});
