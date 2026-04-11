import { useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

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
  const inputRef = useRef<HTMLInputElement | null>(null);

  const dateDisplay = useMemo(() => formatDate(value), [value]);
  const timeDisplay = useMemo(() => formatTime(value), [value]);
  const inputValue = useMemo(
    () => `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}T${pad2(value.getHours())}:${pad2(value.getMinutes())}`,
    [value],
  );

  function openDateTimePicker() {
    inputRef.current?.showPicker?.();
    inputRef.current?.click();
  }

  function handleChange(raw: string) {
    if (!raw) return;
    const next = new Date(raw);
    if (Number.isNaN(next.getTime())) return;
    onChange(next);
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
      <input
        ref={inputRef}
        type="datetime-local"
        value={inputValue}
        onChange={(event) => handleChange(event.target.value)}
        style={styles.hiddenInput as any}
      />
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
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    pointerEvents: 'none',
    width: 1,
    height: 1,
  },
});
