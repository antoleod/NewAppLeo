import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toTimeInputValue(value: Date) {
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
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

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Date</Text>
          <TextInput
            value={toDateInputValue(value)}
            onChangeText={(next) => {
              const [year, month, day] = next.split('-').map(Number);
              if (!year || !month || !day) return;
              const merged = new Date(value);
              merged.setFullYear(year, month - 1, day);
              onChange(merged);
            }}
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundAlt }]}
            placeholder="YYYY-MM-DD"
          />
        </View>
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Heure</Text>
          <TextInput
            value={toTimeInputValue(value)}
            onChangeText={(next) => {
              const [hours, minutes] = next.split(':').map(Number);
              if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return;
              const merged = new Date(value);
              merged.setHours(hours, minutes, 0, 0);
              onChange(merged);
            }}
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundAlt }]}
            placeholder="HH:mm"
          />
        </View>
      </View>
      <Text style={[styles.summary, { color: colors.muted }]}>{formatDateTime(value)}</Text>
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
  field: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '700',
  },
  summary: {
    fontSize: 12,
  },
});
