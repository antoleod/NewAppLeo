import { useEffect, useState } from 'react';
import { Alert, Text, View, useWindowDimensions, StyleSheet } from 'react-native';
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
  const isTablet = width >= 768;
  const isDesktop = width >= 1280;
  const uiScale = isDesktop ? 0.8 : 1.0;
  const cardMaxWidth = isDesktop ? 400 : isTablet ? 480 : '100%';

  useEffect(() => {
    (async () => {
      setSession(await getLocalPairingSession());
    })();
  }, []);

  return (
    <Page contentStyle={[styles.container, { maxWidth: cardMaxWidth }]}>
      <Heading eyebrow="Pairing" title="Connect a partner device" subtitle="Use a short code to share the same baby session." />
      <Card gap={10}>
        <View style={{ gap: 8 * uiScale }}>
          <Text style={{ color: colors.muted, fontSize: 14 * uiScale }}>Share this code with the other device:</Text>
          <Text style={[styles.code, { color: colors.text, fontSize: 32 * uiScale }]}>{session?.code ?? code}</Text>
          <Text style={{ color: colors.muted, fontSize: 13 * uiScale }}>Status: {session?.status ?? 'local only'}</Text>
          <Button
            label="Create new code"
            onPress={async () => {
              const next = await createPairingSession(user?.uid ?? 'anonymous');
              setSession(next);
              setCode(next.code);
              Alert.alert('Pairing code created', next.code);
            }}
            fullWidth
          />
          <Button
            label="Copy code"
            onPress={() => Alert.alert('Pairing code', session?.code ?? code)}
            variant="ghost"
            fullWidth
          />
        </View>
      </Card>
      <Card gap={10}>
        <View style={{ gap: 8 * uiScale }}>
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
            fullWidth
          />
        </View>
      </Card>
      <Button label="Back to app" onPress={() => router.back()} variant="ghost" fullWidth />
    </Page>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    width: '100%',
    padding: 20,
    gap: 16,
  },
  code: {
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 4,
  },
});
