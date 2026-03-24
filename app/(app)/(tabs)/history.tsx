import { router } from 'expo-router';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Button, Card, Chip, EmptyState, EntryCard, Heading, Page } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';
import { useState } from 'react';
import { EntryType } from '@/types';
import { getEntrySubtitle, getEntryTitle, getTimelineSections } from '@/utils/entries';

const filters: Array<{ label: string; value: EntryType | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Feed', value: 'feed' },
  { label: 'Sleep', value: 'sleep' },
  { label: 'Diaper', value: 'diaper' },
  { label: 'Pump', value: 'pump' },
  { label: 'Measures', value: 'measurement' },
  { label: 'Meds', value: 'medication' },
  { label: 'Milestones', value: 'milestone' },
];

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { entries, deleteEntry } = useAppData();
  const [filter, setFilter] = useState<EntryType | 'all'>('all');
  const sections = getTimelineSections(entries, filter);

  async function handleDelete(id: string) {
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert('Delete entry?', 'This will remove the record from Firestore.', [
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 12 }}>
          {filters.map((item) => (
            <Chip key={item.value} label={item.label} selected={filter === item.value} onPress={() => setFilter(item.value)} />
          ))}
        </ScrollView>
      </Card>

      {sections.length ? (
        sections.map((section) => (
          <Card key={section.key}>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{section.title}</Text>
            <View style={{ gap: 10 }}>
              {section.entries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  title={getEntryTitle(entry)}
                  subtitle={getEntrySubtitle(entry)}
                  notes={entry.notes}
                  onPress={() => router.push({ pathname: '/entry/[type]', params: { type: entry.type, id: entry.id } })}
                />
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
