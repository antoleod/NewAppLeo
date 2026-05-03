import { useEffect, useState } from 'react';
import { Text, View, useWindowDimensions, StyleSheet, Image, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Button, Card, Heading, Input, Page } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { createPairingSession, joinPairingSession, getLocalPairingSession, type PairingSession } from '@/services/pairingService';
import { useToast } from '@/components/Toast';
import { haptics } from '@/lib/haptics';

function makeCode() {
  const raw = globalThis.crypto?.getRandomValues ? Array.from(globalThis.crypto.getRandomValues(new Uint8Array(3))) : [1, 2, 3];
  return raw.map((value) => String(value % 10)).join('').padEnd(6, '0').slice(0, 6);
}

export default function PairScreen() {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const [code, setCode] = useState(makeCode);
  const [session, setSession] = useState<PairingSession | null>(null);
  const isTablet = width >= 768;
  const isDesktop = width >= 1280;
  const uiScale = isDesktop ? 0.9 : 1.0;
  const cardMaxWidth = isDesktop ? 460 : isTablet ? 520 : '100%';
  const sessionCode = session?.code ?? code;
  const normalizedCode = sessionCode.replace(/\D/g, '').slice(0, 6);
  const webPairUrl =
    Platform.OS === 'web' && typeof window !== 'undefined' ? `${window.location.origin}/pair?code=${normalizedCode}` : null;
  const pairingPayload = webPairUrl ?? `appleo://pair?code=${normalizedCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(pairingPayload)}`;

  const applyCodeFromUrl = async (urlValue: string | null | undefined) => {
    if (!urlValue) return;
    const parsed = Linking.parse(urlValue);
    const incoming = String(parsed.queryParams?.code ?? '')
      .replace(/\D/g, '')
      .slice(0, 6);
    if (!incoming || incoming.length < 6) return;
    setCode(incoming);
    toast.success(`Pairing code detected: ${incoming}`);
    try {
      const next = await joinPairingSession(incoming, user?.uid ?? 'anonymous');
      setSession(next);
      haptics.success();
      toast.success(`Joined session ${next.code} (${next.status}).`);
    } catch {
      // Keep code prefilled even if join requires manual retry.
    }
  };

  useEffect(() => {
    (async () => {
      setSession(await getLocalPairingSession());
    })();
  }, []);

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      void applyCodeFromUrl(url);
    });
    void Linking.getInitialURL().then((url) => applyCodeFromUrl(url));
    return () => sub.remove();
  }, [user?.uid]);

  return (
    <Page contentStyle={[styles.container, { maxWidth: cardMaxWidth }]}>
      <Heading eyebrow="PAIR LINK" title="Connect Device" subtitle="Secure one-step pairing." />
      <Card style={[styles.heroCard, { borderColor: colors.border }]}>
        <View style={{ gap: 12 * uiScale }}>
          <View style={styles.statusRow}>
            <Text style={[styles.label, { color: colors.muted }]}>Pairing code</Text>
            <View style={[styles.statusPill, { borderColor: colors.border }]}>
              <Text style={[styles.statusText, { color: colors.text }]}>{session?.status ?? 'local only'}</Text>
            </View>
          </View>
          <Text style={[styles.code, { color: colors.text, fontSize: 40 * uiScale }]}>{sessionCode}</Text>
          <View style={[styles.qrWrap, { borderColor: colors.border }]}>
            <Image source={{ uri: qrUrl }} style={styles.qrImage} accessibilityLabel="Pairing QR code" />
          </View>
          <Text style={{ color: colors.muted, fontSize: 12 * uiScale, textAlign: 'center', lineHeight: 18 }}>
            Scan to prefill instantly on the second device.
          </Text>
          <View style={styles.actionsRow}>
            <Button
              label="New code"
              onPress={async () => {
                const next = await createPairingSession(user?.uid ?? 'anonymous');
                setSession(next);
                setCode(next.code);
                haptics.success();
                toast.success(`Pairing code: ${next.code}`);
              }}
              fullWidth
            />
            <Button
              label="Copy"
              onPress={() => toast.info(`Pairing code: ${sessionCode}`)}
              variant="ghost"
              fullWidth
            />
          </View>
        </View>
      </Card>
      <Card style={[styles.joinCard, { borderColor: colors.border }]}>
        <View style={{ gap: 10 * uiScale }}>
          <Input label="Join code" value={code} onChangeText={setCode} placeholder="123456" keyboardType="numeric" inputMode="numeric" />
          <Button
            label="Join"
            onPress={async () => {
              try {
                const next = await joinPairingSession(code, user?.uid ?? 'anonymous');
                setSession(next);
                haptics.success();
                toast.success(`Joined session ${next.code} (${next.status}).`);
              } catch (error: any) {
                haptics.error();
                toast.error(error?.message ?? 'Could not join the session.');
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
    padding: 18,
    gap: 14,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 14,
  },
  joinCard: {
    borderWidth: 1,
    borderRadius: 14,
  },
  label: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusText: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  code: {
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 6,
  },
  qrWrap: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#fff',
  },
  qrImage: {
    width: 186,
    height: 186,
  },
  actionsRow: {
    gap: 8,
  },
});

