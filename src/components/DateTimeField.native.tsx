import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '@/context/ThemeContext';

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
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

  function handleChange(_: DateTimePickerEvent, next?: Date) {
    if (!next) {
      setPickerMode(null);
      return;
    }

    const merged = new Date(value);
    if (pickerMode === 'date') {
      merged.setFullYear(next.getFullYear(), next.getMonth(), next.getDate());
    } else {
      merged.setHours(next.getHours(), next.getMinutes(), 0, 0);
    }
    onChange(merged);
    setPickerMode(null);
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View style={styles.row}>
        <Pressable onPress={() => setPickerMode('date')} style={[styles.pill, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}>
          <Text style={[styles.pillLabel, { color: colors.muted }]}>Date</Text>
          <Text style={[styles.pillValue, { color: colors.text }]}>{formatDate(value)}</Text>
        </Pressable>
        <Pressable onPress={() => setPickerMode('time')} style={[styles.pill, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}>
          <Text style={[styles.pillLabel, { color: colors.muted }]}>Heure</Text>
          <Text style={[styles.pillValue, { color: colors.text }]}>{formatTime(value)}</Text>
        </Pressable>
      </View>
      <Text style={[styles.summary, { color: colors.muted }]}>{formatDateTime(value)}</Text>
      {pickerMode ? <DateTimePicker value={value} mode={pickerMode} display="default" onChange={handleChange} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    flex: 1,
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  pillValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  summary: {
    fontSize: 12,
  },
});
