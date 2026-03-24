import { Text, View } from 'react-native';
import { Input } from '@/components/ui';
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
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{label}</Text>
      <Input
        label="Date"
        value={toDateInputValue(value)}
        onChangeText={(next) => {
          const [year, month, day] = next.split('-').map(Number);
          if (!year || !month || !day) return;
          const merged = new Date(value);
          merged.setFullYear(year, month - 1, day);
          onChange(merged);
        }}
        placeholder="YYYY-MM-DD"
      />
      <Input
        label="Heure"
        value={toTimeInputValue(value)}
        onChangeText={(next) => {
          const [hours, minutes] = next.split(':').map(Number);
          if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return;
          const merged = new Date(value);
          merged.setHours(hours, minutes, 0, 0);
          onChange(merged);
        }}
        placeholder="HH:mm"
      />
      <Text style={{ color: colors.muted, fontSize: 12 }}>{formatDateTime(value)}</Text>
    </View>
  );
}
