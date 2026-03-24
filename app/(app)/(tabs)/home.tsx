import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, EmptyState, Heading, Page, StatPill } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getEntryTitle, getEntrySubtitle } from '@/utils/entries';
import { getMeanFeedingInterval } from '@/lib/patterns';
import { defaultAppSettings, defaultModuleVisibility, getActiveBaby, getAppSettings, getModuleVisibility, getMomHydration, setMomHydration } from '@/lib/storage';
import { buildWidgetSnapshot } from '@/lib/widget';

function hoursSince(timestamp?: string) {
  if (!timestamp) return null;
  const diff = Date.now() - new Date(timestamp).getTime();
  return Math.max(0, diff / 36e5);
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { entries, summary } = useAppData();
  const [hydration, setHydration] = useState(0);
  const [babyId, setBabyId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState(defaultModuleVisibility);
  const [appSettings, setAppSettingsState] = useState(defaultAppSettings);

  const lastFeed = useMemo(() => [...entries].find((entry) => entry.type === 'feed'), [entries]);
  const lastDiaper = useMemo(() => [...entries].find((entry) => entry.type === 'diaper'), [entries]);
  const sleepToday = summary.today.sleepMinutes;
  const meanInterval = getMeanFeedingInterval(entries);
  const widgetSnapshot = useMemo(() => buildWidgetSnapshot({ babyName: profile?.babyName, entries, summary, profile }), [entries, profile, summary]);
  const nextFeedText =
    meanInterval && lastFeed
      ? `Approx. ${Math.round(meanInterval / 36e5)}h after the last feed`
      : 'Log two feeds to estimate the next one.';

  useEffect(() => {
    (async () => {
      const activeBaby = await getActiveBaby();
      if (!activeBaby) return;
      setBabyId(activeBaby.id);
      setHydration(await getMomHydration(activeBaby.id));
      setVisibility(await getModuleVisibility());
      setAppSettingsState(await getAppSettings());
    })();
  }, []);

  return (
    <Page>
      <Heading
        eyebrow="Dashboard"
        title={`Hello ${profile?.displayName ?? 'there'}`}
        subtitle={`${profile?.babyName ?? 'Leo'} · ${nextFeedText}`}
        action={<Button label="New entry" onPress={() => router.push('/entry/feed')} fullWidth={false} />}
      />

      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {summary.cards.map((card) => (
            <StatPill key={card.label} label={card.label} value={card.value} tone={card.tone} />
          ))}
        </View>
      </Card>

      <Card>
        <Heading eyebrow="Timeline" title="24h strip" subtitle="A compact visual history of today's activity." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {entries.slice(0, 24).map((entry) => {
            const tone =
              entry.type === 'feed' ? colors.primary : entry.type === 'sleep' ? colors.secondary : entry.type === 'diaper' ? colors.warning : colors.success;
            return (
              <Pressable
                key={entry.id}
                onPress={() => router.push({ pathname: '/entry/[type]', params: { type: entry.type, id: entry.id } })}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: tone,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 11 }}>{entry.type.slice(0, 3)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Card>

      <Card>
        <Heading eyebrow="Quick actions" title="Log activity" />
        {[
          ['Feed', '/entry/feed'],
          ['Diaper', '/entry/diaper'],
          ['Sleep', '/entry/sleep'],
          ['Pump', '/entry/pump'],
          ['Medication', '/entry/medication'],
          ['Measure', '/entry/measurement'],
          ['Milestone', '/entry/milestone'],
        ].some(([label]) => {
          const keyMap: Record<string, string> = {
            Feed: 'feed',
            Diaper: 'diaper',
            Sleep: 'sleep',
            Pump: 'pump',
            Medication: 'medication',
            Measure: 'measurement',
            Milestone: 'milestone',
          };
          return visibility[keyMap[label] ?? 'feed'];
        }) ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {[
              ['Feed', '/entry/feed'],
              ['Diaper', '/entry/diaper'],
              ['Sleep', '/entry/sleep'],
              ['Pump', '/entry/pump'],
              ['Medication', '/entry/medication'],
              ['Measure', '/entry/measurement'],
              ['Milestone', '/entry/milestone'],
            ]
              .filter(([label]) => {
                const keyMap: Record<string, string> = {
                  Feed: 'feed',
                  Diaper: 'diaper',
                  Sleep: 'sleep',
                  Pump: 'pump',
                  Medication: 'medication',
                  Measure: 'measurement',
                  Milestone: 'milestone',
                };
                return visibility[keyMap[label] ?? 'feed'];
              })
              .map(([label, href]) => (
                <Pressable
                  key={label}
                  onPress={() => router.push(href as any)}
                  style={{
                    minWidth: appSettings.largeTouchMode ? 132 : 110,
                    paddingVertical: appSettings.largeTouchMode ? 18 : 14,
                    paddingHorizontal: appSettings.largeTouchMode ? 18 : 14,
                    borderRadius: 18,
                    backgroundColor: colors.backgroundAlt,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '800' }}>{label}</Text>
                </Pressable>
              ))}
          </ScrollView>
        ) : (
          <EmptyState
            title="All modules hidden"
            body="Turn one module back on from Profile to restore quick actions."
            action={<Button label="Open profile" onPress={() => router.push('/profile')} />}
          />
        )}
      </Card>

      <Card>
        <Heading eyebrow="Presets" title="Quick log templates" subtitle="One tap opens the composer with a prefilled value." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {[
            { label: 'Bottle 150ml', href: '/entry/feed?presetMode=bottle&presetAmount=150' },
            { label: 'Bottle 180ml', href: '/entry/feed?presetMode=bottle&presetAmount=180' },
            { label: 'Breast left', href: '/entry/feed?presetMode=breast&presetSide=left' },
            { label: 'Pump 20m', href: '/entry/pump' },
          ].map((preset) => (
            <Pressable
              key={preset.label}
              onPress={() => router.push(preset.href as any)}
              style={{
                paddingVertical: appSettings.largeTouchMode ? 16 : 12,
                paddingHorizontal: appSettings.largeTouchMode ? 18 : 14,
                borderRadius: 16,
                backgroundColor: colors.backgroundAlt,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '800' }}>{preset.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Card>

      <Card>
        <Heading eyebrow="Timeline" title="Last 24h" subtitle="A compact view of the latest activity." />
        {entries.length ? (
          <View style={{ gap: 10 }}>
            {entries.slice(0, 6).map((entry) => (
              <Pressable
                key={entry.id}
                onPress={() => router.push({ pathname: '/entry/[type]', params: { type: entry.type, id: entry.id } })}
                style={{
                  padding: 14,
                  borderRadius: 18,
                  backgroundColor: colors.backgroundAlt,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '800' }}>{getEntryTitle(entry)}</Text>
                <Text style={{ color: colors.muted, marginTop: 4 }}>{getEntrySubtitle(entry)}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyState
            title="No activity yet"
            body="Start with a feed, diaper log, or sleep session to populate the dashboard."
            action={<Button label="Create first entry" onPress={() => router.push('/entry/feed')} />}
          />
        )}
      </Card>

      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <Card style={{ flex: 1, minWidth: 240 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Sleep summary</Text>
          <Text style={{ color: colors.muted }}>{sleepToday ? `${sleepToday} min today` : 'No sleep logged today yet.'}</Text>
        </Card>
        <Card style={{ flex: 1, minWidth: 240 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Last diaper</Text>
          <Text style={{ color: colors.muted }}>
            {lastDiaper ? `${Math.round(hoursSince(lastDiaper.occurredAt) ?? 0)}h ago` : 'No diaper logged yet.'}
          </Text>
        </Card>
      </View>

      <Card>
        <Heading eyebrow="Mom" title="Hydration" subtitle="Separate from baby tracking." />
        <Text style={{ color: colors.muted }}>{hydration} ml today / 2500 ml goal</Text>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          {[250, 500].map((amount) => (
            <Button
              key={amount}
              label={`+${amount} ml`}
              onPress={async () => {
                if (!babyId) return;
                const next = hydration + amount;
                setHydration(next);
                await setMomHydration(babyId, next);
              }}
              variant="ghost"
              fullWidth={false}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Heading eyebrow="Widget" title="Lock screen preview" subtitle="This is the payload we would hand to a native widget." />
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>{widgetSnapshot.babyName}</Text>
        <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 24 }}>{widgetSnapshot.headline}</Text>
        <Text style={{ color: colors.muted, lineHeight: 20 }}>{widgetSnapshot.subheadline}</Text>
        <Text style={{ color: colors.muted }}>{widgetSnapshot.lastFeedLabel}</Text>
        <Text style={{ color: colors.muted }}>{widgetSnapshot.lastDiaperLabel}</Text>
        <Text style={{ color: colors.muted }}>{widgetSnapshot.sleepLabel}</Text>
      </Card>

      <Card>
        <Heading eyebrow="Weekly" title="Digest" subtitle="A simple week-over-week snapshot." />
        <Text style={{ color: colors.muted, lineHeight: 20 }}>
          {summary.today.feedCount} feeds today, {summary.today.bottleMl} ml bottle milk, {summary.today.sleepMinutes} minutes of sleep, and{' '}
          {summary.today.diaperCount} diapers.
        </Text>
      </Card>
    </Page>
  );
}
