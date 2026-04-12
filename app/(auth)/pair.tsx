import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Heading, Input, Page } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { createPairingSession, joinPairingSession, getLocalPairingSession, type PairingSession } from '@/services/pairingService';

function makeCode() {
  const raw = globalThis.crypto?.getRandomValues ? Array.from(globalThis.crypto.getRandomValues(new Uint8Array(3))) : [1, 2, 3];
  return raw.map((value) => String(value % 10)).join('').padEnd(6, '0').slice(0, 6);
}

export default function PairScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { user } = useAuth();
  const [code, setCode] = useState(makeCode);
  const [session, setSession] = useState<PairingSession | null>(null);

  useEffect(() => {
    (async () => {
      setSession(await getLocalPairingSession());
    })();
  }, []);

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      <Heading eyebrow={t('auth.pair', 'Pair device')} title="Connect a partner device" subtitle="Use a short code to share the same baby session." />
      <Card>
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Share this code with the other device:</Text>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '900', letterSpacing: 4, textAlign: 'center' }}>{session?.code ?? code}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Status: {session?.status ?? 'local only'}</Text>
          <Button
            label="Create new code"
            onPress={async () => {
              const next = await createPairingSession(user?.uid ?? 'anonymous');
              setSession(next);
              setCode(next.code);
              Alert.alert('Pairing code created', next.code);
            }}
          />
          <Button
            label="Copy code"
            onPress={() => Alert.alert('Pairing code', session?.code ?? code)}
            variant="ghost"
          />
        </View>
      </Card>
      <Card>
        <View style={{ gap: 12 }}>
          <Input label="Join code" value={code} onChangeText={setCode} placeholder="123456" keyboardType="numeric" inputMode="numeric" />
          <Button
            label="Join session"
            onPress={async () => {
              try {
                const next = await joinPairingSession(code, user?.uid ?? 'anonymous');
                setSession(next);
                Alert.alert('Joined', `Session ${next.code} is now ${next.status}.`);
              } catch (error: any) {
                Alert.alert('Pairing failed', error?.message ?? 'Could not join the session.');
              }
            }}
          />
        </View>
      </Card>
      <Button label="Back to app" onPress={() => router.back()} variant="ghost" />
      </ScrollView>
    </Page>
  );
}
