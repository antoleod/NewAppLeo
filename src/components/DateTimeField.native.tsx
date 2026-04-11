import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '@/context/ThemeContext';

function formatDate(value: Date, locale = 'fr-FR') {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value);
}

function formatTime(value: Date, locale = 'fr-FR') {
  return new Intl.DateTimeFormat(locale, {
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
  const { theme } = useTheme();
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [draftValue, setDraftValue] = useState<Date | null>(null);

  const dateDisplay = useMemo(() => formatDate(value), [value]);
  const timeDisplay = useMemo(() => formatTime(value), [value]);

  function openDateTimePicker() {
    setDraftValue(new Date(value));
    setPickerMode('date');
  }

  function handleChange(event: DateTimePickerEvent, next?: Date) {
    if (event.type === 'dismissed' || !next) {
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
      <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text>
      <Pressable
        onPress={openDateTimePicker}
        style={({ pressed }) => [
          styles.control,
          {
            borderColor: theme.border,
            backgroundColor: theme.bgCardAlt,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.headerText, { color: theme.textMuted }]}>Date & time</Text>
          <View style={styles.headerIcons}>
            <Ionicons name="calendar-outline" size={15} color={theme.textMuted} />
            <Ionicons name="time-outline" size={15} color={theme.textMuted} />
          </View>
        </View>
        <View style={styles.valueRow}>
          <View style={[styles.valuePill, { borderColor: theme.border, backgroundColor: theme.bgCard }]}>
            <Text style={[styles.valueText, { color: theme.textPrimary }]}>{dateDisplay}</Text>
          </View>
          <Text style={[styles.dot, { color: theme.textMuted }]}>•</Text>
          <View style={[styles.valuePill, { borderColor: theme.border, backgroundColor: theme.bgCard }]}>
            <Text style={[styles.valueText, { color: theme.textPrimary }]}>{timeDisplay}</Text>
          </View>
        </View>
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valuePill: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '800',
  },
  dot: {
    fontSize: 16,
    fontWeight: '900',
  },
});
