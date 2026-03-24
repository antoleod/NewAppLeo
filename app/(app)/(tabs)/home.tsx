import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Card, EmptyState, EntryCard, Heading, Page, StatPill } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { getEntrySubtitle, getEntryTitle, getNextFeedSuggestion } from '@/utils/entries';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { summary } = useAppData();

  return (
    <Page>
      <Heading
        eyebrow="Dashboard"
        title={`Hello ${profile?.displayName ?? 'there'}`}
        subtitle={`${profile?.babyName ?? 'Leo'} · ${getNextFeedSuggestion(summary.recent)}`}
        action={<Button label="New entry" onPress={() => router.push('/entry/feed')} fullWidth={false} />}
      />

      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {summary.cards.map((card) => (
            <StatPill key={card.label} label={card.label} value={card.value} tone={card.tone} />
          ))}
        </View>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
          The target app now runs on Firebase auth and a user-centric profile model instead of a shared local snapshot.
        </Text>
      </Card>

      <Card>
        <Heading eyebrow="Quick actions" title="Log activity" subtitle="Common flows from the legacy app are now grouped in one composer." />
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Button label="Feed" onPress={() => router.push('/entry/feed')} fullWidth={false} />
            <Button label="Sleep" onPress={() => router.push('/entry/sleep')} variant="secondary" fullWidth={false} />
            <Button label="Diaper" onPress={() => router.push('/entry/diaper')} variant="ghost" fullWidth={false} />
            <Button label="Pump" onPress={() => router.push('/entry/pump')} variant="ghost" fullWidth={false} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Button label="Measurement" onPress={() => router.push('/entry/measurement')} variant="ghost" fullWidth={false} />
            <Button label="Medication" onPress={() => router.push('/entry/medication')} variant="ghost" fullWidth={false} />
            <Button label="Milestone" onPress={() => router.push('/entry/milestone')} variant="ghost" fullWidth={false} />
          </View>
        </View>
      </Card>

      <Card>
        <Heading eyebrow="Recent" title="Latest records" subtitle="Tap any record to edit it." />
        <View style={{ gap: 10 }}>
          {summary.recent.length ? (
            summary.recent.map((entry) => (
              <EntryCard
                key={entry.id}
                title={getEntryTitle(entry)}
                subtitle={getEntrySubtitle(entry)}
                notes={entry.notes}
                onPress={() => router.push({ pathname: '/entry/[type]', params: { type: entry.type, id: entry.id } })}
              />
            ))
          ) : (
            <EmptyState
              title="No activity yet"
              body="Start with a feed, diaper log, or sleep session to populate the dashboard."
              action={<Button label="Create first entry" onPress={() => router.push('/entry/feed')} />}
            />
          )}
        </View>
      </Card>
    </Page>
  );
}
