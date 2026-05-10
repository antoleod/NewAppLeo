import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '@/context/ThemeContext';

function safeDate(value: Date) {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value : new Date();
}

function formatDate(value: Date, locale = 'fr-FR') {
  const date = safeDate(value);
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatTime(value: Date, locale = 'fr-FR') {
  const date = safeDate(value);
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
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
  const [open, setOpen] = useState(false);
  // Android only: step through date then time
  const [androidMode, setAndroidMode] = useState<'date' | 'time'>('date');
  const [draft, setDraft] = useState<Date | null>(null);

  const dateDisplay = useMemo(() => formatDate(value), [value]);
  const timeDisplay = useMemo(() => formatTime(value), [value]);

  function openPicker() {
    setDraft(new Date(safeDate(value)));
    if (Platform.OS === 'android') setAndroidMode('date');
    setOpen(true);
  }

  // ── iOS: spinner fires on every scroll, only commit on Done ──────────────────
  function handleIOSChange(_event: DateTimePickerEvent, next?: Date) {
    if (next) setDraft(next);
  }

  function handleIOSConfirm() {
    if (draft) onChange(draft);
    setOpen(false);
    setDraft(null);
  }

  function handleIOSCancel() {
    setOpen(false);
    setDraft(null);
  }

  // ── Android: date dialog → time dialog → commit ───────────────────────────
  function handleAndroidChange(event: DateTimePickerEvent, next?: Date) {
    if (event.type === 'dismissed' || !next) {
      setOpen(false);
      setDraft(null);
      return;
    }
    if (androidMode === 'date') {
      const merged = new Date(draft ?? safeDate(value));
      merged.setFullYear(next.getFullYear(), next.getMonth(), next.getDate());
      setDraft(merged);
      setAndroidMode('time');
      return;
    }
    const merged = new Date(draft ?? safeDate(value));
    merged.setHours(next.getHours(), next.getMinutes(), 0, 0);
    onChange(merged);
    setOpen(false);
    setDraft(null);
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text>
      <Pressable
        onPress={openPicker}
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

      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="slide" onRequestClose={handleIOSCancel}>
          <View style={styles.iosBackdrop}>
            <View style={[styles.iosCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
              <View style={styles.iosHeader}>
                <Pressable onPress={handleIOSCancel} hitSlop={8}>
                  <Text style={[styles.iosBtn, { color: theme.textMuted }]}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleIOSConfirm} hitSlop={8}>
                  <Text style={[styles.iosBtn, { color: theme.accent, fontWeight: '700' }]}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={draft ?? safeDate(value)}
                mode="datetime"
                display="spinner"
                onChange={handleIOSChange}
              />
            </View>
          </View>
        </Modal>
      ) : (
        open ? (
          <DateTimePicker
            value={draft ?? safeDate(value)}
            mode={androidMode}
            display="default"
            onChange={handleAndroidChange}
          />
        ) : null
      )}
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
  // iOS Modal styles
  iosBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  iosCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingBottom: 24,
  },
  iosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.3)',
  },
  iosBtn: {
    fontSize: 16,
  },
});
