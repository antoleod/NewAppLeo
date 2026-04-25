import React, { ComponentProps, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Page, Button, Input } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import { useTheme } from '@/context/ThemeContext';
import { useLocale } from '@/context/LocaleContext';
import { triggerHaptic } from '@/lib/mobile';
import { formatTime } from '@/utils/date';

const LEVELS = [0, 1, 2, 3];

interface LevelSelectorProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  activeColor: string;
  icon: ComponentProps<typeof Ionicons>['name'];
}

function LevelSelector({ label, value, onChange, activeColor, icon }: LevelSelectorProps) {
  const { theme } = useTheme();

  const handlePress = (v: number) => {
    void triggerHaptic('light');
    onChange(v);
  };

  return (
    <View style={styles.selectorContainer}>
      <View style={styles.selectorHeader}>
        <View style={styles.labelRow}>
          <Ionicons name={icon} size={16} color={value > 0 ? activeColor : theme.textMuted} />
          <Text style={[styles.selectorLabel, { color: theme.textPrimary }]}>{label}</Text>
        </View>
        <Text style={[styles.selectorValue, { color: value > 0 ? activeColor : theme.textMuted }]}>
          {value}
        </Text>
      </View>
      <View style={styles.barContainer}>
        {LEVELS.map((level) => {
          const isActive = level > 0 && level <= value;
          const isCurrent = level === value;
          
          return (
            <Pressable
              key={level}
              onPress={() => handlePress(level)}
              style={({ pressed }) => [
                styles.segment,
                {
                  backgroundColor: isActive ? activeColor : `${theme.border}44`,
                  borderColor: isCurrent ? theme.textPrimary : 'transparent',
                  borderWidth: isCurrent ? 1 : 0,
                  opacity: pressed ? 0.7 : 1,
                },
                level === 0 && styles.firstSegment,
                level === 3 && styles.lastSegment,
              ]}
            >
              {level === 0 && <Text style={{ fontSize: 10, color: theme.textMuted }}>None</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function DiaperEntryScreen() {
  const { id } = useLocalSearchParams();
  const { entries, addEntry, updateEntry } = useAppData();
  const { theme } = useTheme();
  const { t } = useLocale();
  const { height } = useWindowDimensions();

  const existingEntry = useMemo(() => entries.find((e) => e.id === id), [entries, id]);

  const [pee, setPee] = useState(existingEntry?.payload?.pee ?? 0);
  const [poop, setPoop] = useState(existingEntry?.payload?.poop ?? 0);
  const [vomit, setVomit] = useState(existingEntry?.payload?.vomit ?? 0);
  const [notes, setNotes] = useState(existingEntry?.notes ?? '');
  const [showNotes, setShowNotes] = useState(!!existingEntry?.notes);
  const [occurredAt] = useState(existingEntry ? new Date(existingEntry.occurredAt) : new Date());

  const handleSave = async () => {
    void triggerHaptic('success');
    const payload = { pee, poop, vomit };
    if (id) {
      await updateEntry(String(id), { payload, notes, occurredAt: occurredAt.toISOString() });
    } else {
      await addEntry({
        type: 'diaper',
        title: 'Diaper Change',
        payload,
        notes,
        occurredAt: occurredAt.toISOString(),
      });
    }
    router.back();
  };

  return (
    <Page contentStyle={styles.page}>
      <Animated.View entering={FadeIn} style={styles.container}>
        {/* Compact Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={[styles.iconCircle, { backgroundColor: `${theme.accent}22` }]}>
              <Ionicons name="cube" size={20} color={theme.accent} />
            </View>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Nouvelle Diaper</Text>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={theme.textMuted} />
          </Pressable>
        </View>

        {/* Inline Metadata */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={theme.textMuted} />
            <Text style={[styles.metaText, { color: theme.textPrimary }]}>{formatTime(occurredAt)}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: `${theme.blue}15` }]}>
            <Text style={{ color: theme.blue, fontSize: 10, fontWeight: '700' }}>GUIDE BELGE</Text>
          </View>
        </View>

        {/* Core Quick Log Controls */}
        <View style={styles.inputStack}>
          <LevelSelector
            label="Pipi"
            value={pee}
            onChange={setPee}
            activeColor={theme.blue}
            icon="water"
          />
          <LevelSelector
            label="Caca"
            value={poop}
            onChange={setPoop}
            activeColor={theme.accent}
            icon="egg"
          />
          <LevelSelector
            label="Vomi"
            value={vomit}
            onChange={setVomit}
            activeColor={theme.red}
            icon="alert-circle"
          />
        </View>

        {/* Notes Toggle */}
        <Pressable 
          onPress={() => setShowNotes(!showNotes)} 
          style={styles.notesToggle}
        >
          <Ionicons name={showNotes ? "chevron-up" : "create-outline"} size={16} color={theme.textMuted} />
          <Text style={{ color: theme.textMuted, fontSize: 13, marginLeft: 4 }}>
            {showNotes ? "Collapse Notes" : "Add Notes..."}
          </Text>
        </Pressable>

        {showNotes && (
          <Animated.View entering={FadeInDown}>
            <Input
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes..."
              multiline
            />
          </Animated.View>
        )}
      </Animated.View>

      {/* Sticky Bottom Action */}
      <View style={[styles.footer, { paddingBottom: 20 }]}>
        <Button label="Save diaper log" onPress={handleSave} />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 16 },
  container: { flex: 1, paddingTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800' },
  closeBtn: { padding: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, fontWeight: '600' },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  inputStack: { gap: 16, marginBottom: 16 },
  selectorContainer: { gap: 6 },
  selectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectorLabel: { fontSize: 14, fontWeight: '700' },
  selectorValue: { fontSize: 14, fontWeight: '800' },
  barContainer: {
    flexDirection: 'row',
    height: 44,
    gap: 4,
  },
  segment: {
    flex: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  firstSegment: {
    flex: 0.6, // "None" button is slightly smaller
  },
  lastSegment: {},
  notesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  footer: { marginTop: 'auto', paddingTop: 12 },
});
