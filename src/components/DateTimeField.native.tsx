import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
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
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={() => setPickerMode('date')}
          style={{ flex: 1, minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundAlt, justifyContent: 'center', paddingHorizontal: 14 }}
        >
          <Text style={{ color: colors.text, fontWeight: '700' }}>{formatDate(value)}</Text>
        </Pressable>
        <Pressable
          onPress={() => setPickerMode('time')}
          style={{ flex: 1, minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundAlt, justifyContent: 'center', paddingHorizontal: 14 }}
        >
          <Text style={{ color: colors.text, fontWeight: '700' }}>{formatTime(value)}</Text>
        </Pressable>
      </View>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{formatDateTime(value)}</Text>
      {pickerMode ? <DateTimePicker value={value} mode={pickerMode} display="default" onChange={handleChange} /> : null}
    </View>
  );
}
