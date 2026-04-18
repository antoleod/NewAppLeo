import { useEffect, useState } from 'react';
import { Alert, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Heading, Input, Page } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { createPairingSession, joinPairingSession, getLocalPairingSession, type PairingSession } from '@/services/pairingService';

function makeCode() {
  const raw = globalThis.crypto?.getRandomValues ? Array.from(globalThis.crypto.getRandomValues(new Uint8Array(3))) : [1, 2, 3];
  return raw.map((value) => String(value % 10)).join('').padEnd(6, '0').slice(0, 6);
}

export default function PairScreen() {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [code, setCode] = useState(makeCode);
  const [session, setSession] = useState<PairingSession | null>(null);
  const isCompact = width >= 768;

  useEffect(() => {
    (async () => {
      setSession(await getLocalPairingSession());
    })();
  }, []);

  return (
    <Page>
      <Heading eyebrow="Pairing" title="Connect a partner device" subtitle="Use a short code to share the same baby session." />
      <Card style={isCompact ? { gap: 10, paddingVertical: 14 } : undefined}>
        <View style={{ gap: isCompact ? 10 : 12 }}>
          <Text style={{ color: colors.muted }}>Share this code with the other device:</Text>
          <Text style={{ color: colors.text, fontSize: isCompact ? 28 : 34, fontWeight: '900', letterSpacing: isCompact ? 5 : 6 }}>{session?.code ?? code}</Text>
          <Text style={{ color: colors.muted }}>Status: {session?.status ?? 'local only'}</Text>
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
      <Card style={isCompact ? { gap: 10, paddingVertical: 14 } : undefined}>
        <View style={{ gap: isCompact ? 10 : 12 }}>
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
    </Page>
  );
}
