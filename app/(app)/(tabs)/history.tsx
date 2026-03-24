import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Chip, EmptyState, EntryCard, Heading, Page } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import { useTheme } from '@/context/ThemeContext';
import { getEntrySubtitle, getEntryTitle, getTimelineSections } from '@/utils/entries';
import { EntryType } from '@/types';
import { generateWeeklyPdf } from '@/lib/pdf';
import { formatLongDate, isSameDay, startOfDay, subtractDays } from '@/utils/date';
import { Swipeable } from 'react-native-gesture-handler';

const filters: Array<{ label: string; value: EntryType | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Feed', value: 'feed' },
  { label: 'Sleep', value: 'sleep' },
  { label: 'Diaper', value: 'diaper' },
  { label: 'Pump', value: 'pump' },
  { label: 'Measures', value: 'measurement' },
  { label: 'Meds', value: 'medication' },
  { label: 'Milestones', value: 'milestone' },
  { label: 'Symptoms', value: 'symptom' },
];

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { entries, deleteEntry } = useAppData();
  const [filter, setFilter] = useState<EntryType | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const dayEntries = useMemo(() => entries.filter((entry) => isSameDay(entry.occurredAt, selectedDate)), [entries, selectedDate]);
  const sections = useMemo(() => getTimelineSections(dayEntries, filter), [dayEntries, filter]);
  const csv = useMemo(
    () =>
      ['type,title,occurredAt,notes', ...entries.map((entry) => [entry.type, entry.title, entry.occurredAt, entry.notes ?? ''].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))].join('\n'),
    [entries],
  );

  async function handleDelete(id: string) {
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert('Delete entry?', 'This will remove the record.', [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
    if (confirmed) {
      await deleteEntry(id);
    }
  }

  return (
    <Page>
      <Heading eyebrow="Timeline" title="History" subtitle="Browse, edit, and delete records by day." />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Button label="←" onPress={() => setSelectedDate((current) => subtractDays(current, 1))} variant="ghost" fullWidth={false} />
          <Text style={{ color: colors.text, fontWeight: '800' }}>{formatLongDate(selectedDate)}</Text>
          <Button label="→" onPress={() => setSelectedDate((current) => subtractDays(current, -1))} variant="ghost" fullWidth={false} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <Button
            label="Export CSV"
            onPress={() => {
              if (globalThis.navigator?.clipboard?.writeText) {
                globalThis.navigator.clipboard.writeText(csv);
                Alert.alert('CSV copied', 'The export was copied to clipboard.');
              } else {
                Alert.alert('CSV export', csv);
              }
            }}
            variant="secondary"
            fullWidth={false}
          />
          <Button
            label="Export PDF"
            onPress={async () => {
              const pdf = await generateWeeklyPdf(entries);
              Alert.alert('PDF ready', pdf.summary);
            }}
            variant="ghost"
            fullWidth={false}
          />
        </View>
        <Button label="Today" onPress={() => setSelectedDate(startOfDay(new Date()))} variant="ghost" fullWidth={false} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 12 }}>
          {filters.map((item) => (
            <Chip key={item.value} label={item.label} selected={filter === item.value} onPress={() => setFilter(item.value)} />
          ))}
        </ScrollView>
      </Card>

      {sections.length ? (
        sections.map((section) => (
          <Card key={section.key}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{section.title}</Text>
            <View style={{ gap: 10 }}>
              {section.entries.map((entry) => (
                <Swipeable
                  key={entry.id}
                  renderRightActions={() => (
                    <Pressable
                      onPress={() => handleDelete(entry.id)}
                      style={{
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: 92,
                        borderRadius: 18,
                        marginVertical: 4,
                        backgroundColor: colors.danger,
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '900' }}>Delete</Text>
                    </Pressable>
                  )}
                >
                  <EntryCard
                    title={getEntryTitle(entry)}
                    subtitle={getEntrySubtitle(entry)}
                    notes={entry.notes}
                    onPress={() => router.push({ pathname: '/entry/[type]', params: { type: entry.type, id: entry.id } })}
                  />
                </Swipeable>
              ))}
            </View>
          </Card>
        ))
      ) : (
        <EmptyState
          title="Nothing matches this filter"
          body="Create a record or switch filters to reveal the timeline."
          action={<Button label="Log feed" onPress={() => router.push('/entry/feed')} />}
        />
      )}
    </Page>
  );
}
