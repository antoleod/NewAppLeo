import { useCallback, useEffect, useState } from 'react';
import { Text, View, useWindowDimensions, StyleSheet, Image, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Button, Card, Heading, Input, Page , useToast } from '@/components/shared';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { createPairingSession, createCode, joinPairingSession, getLocalPairingSession, type PairingSession } from '@/services/pairingService';
import { registerSessionForHost } from '@/services/sessionService';
import { haptics } from '@/lib/haptics';
import { getDeviceDisplayName, setDeviceDisplayName } from '@/lib/storage';
import { useTranslation } from '@/hooks/useTranslation';

export default function PairScreen() {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const { t, format } = useTranslation();
  const [code, setCode] = useState(() => createCode());
  const [participantName, setParticipantName] = useState('');
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

  const applyCodeFromUrl = useCallback(async (urlValue: string | null | undefined) => {
    if (!urlValue) return;
    const parsed = Linking.parse(urlValue);
    const incoming = String(parsed.queryParams?.code ?? '')
      .replace(/\D/g, '')
      .slice(0, 6);
    if (!incoming || incoming.length < 6) return;
    setCode(incoming);
    toast.success(format('pairing.codeDetected', { code: incoming }));
    try {
      const next = await joinPairingSession(incoming, user?.uid ?? 'anonymous');
      setSession(next);
      haptics.success();
      toast.success(format('pairing.joinedSession', { code: next.code }));
    } catch {
      // Keep code prefilled even if join requires manual retry.
    }
  }, [user?.uid, toast, format]);

  useEffect(() => {
    (async () => {
      setSession(await getLocalPairingSession());
      setParticipantName(await getDeviceDisplayName());
    })();
  }, []);

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      void applyCodeFromUrl(url);
    });
    void Linking.getInitialURL().then((url) => applyCodeFromUrl(url));
    return () => sub.remove();
  }, [applyCodeFromUrl]);

  return (
    <Page contentStyle={[styles.container, { maxWidth: cardMaxWidth }]}>
      <Heading eyebrow={t('pairing.eyebrow')} title={t('pairing.title')} subtitle={t('pairing.subtitle')} />
      <Card style={[styles.heroCard, { borderColor: colors.border }]}>
        <View style={{ gap: 12 * uiScale }}>
          <View style={styles.statusRow}>
            <Text style={[styles.label, { color: colors.muted }]}>{t('pairing.codeLabel')}</Text>
            <View style={[styles.statusPill, { borderColor: colors.border }]}>
              <Text style={[styles.statusText, { color: colors.text }]}>{session?.status ?? t('pairing.statusLocal')}</Text>
            </View>
          </View>
          <Text style={[styles.code, { color: colors.text, fontSize: 40 * uiScale }]}>{sessionCode}</Text>
          <View style={[styles.qrWrap, { borderColor: colors.border }]}>
            <Image source={{ uri: qrUrl }} style={styles.qrImage} accessibilityLabel={t('pairing.qrAlt')} />
          </View>
          <Text style={{ color: colors.muted, fontSize: 12 * uiScale, textAlign: 'center', lineHeight: 18 }}>
            {t('pairing.qrHint')}
          </Text>
          <View style={styles.actionsRow}>
            <Button
              label={t('pairing.newCode')}
              onPress={async () => {
                const next = await createPairingSession(user?.uid ?? 'anonymous');
                setSession(next);
                setCode(next.code);
                haptics.success();
                toast.success(format('pairing.codeCreated', { code: next.code }));
              }}
              fullWidth
            />
            <Button
              label={t('common.copy')}
              onPress={() => toast.info(format('pairing.codeCreated', { code: sessionCode }))}
              variant="ghost"
              fullWidth
            />
          </View>
        </View>
      </Card>
      <Card style={[styles.joinCard, { borderColor: colors.border }]}>
        <View style={{ gap: 10 * uiScale }}>
          <Input label={t('pairing.yourName')} value={participantName} onChangeText={setParticipantName} placeholder={t('pairing.namePlaceholder')} />
          <Input label={t('pairing.joinCode')} value={code} onChangeText={setCode} placeholder="123456" keyboardType="numeric" inputMode="numeric" />
          <Button
            label={t('pairing.join')}
            onPress={async () => {
              try {
                const cleanName = participantName.trim();
                if (!cleanName) {
                  toast.warning(t('pairing.nameRequired'));
                  return;
                }
                await setDeviceDisplayName(cleanName);
                const next = await joinPairingSession(code, user?.uid ?? 'anonymous');
                setSession(next);
                if (user && next.hostUid && next.hostUid !== user.uid) {
                  registerSessionForHost(next.hostUid, user.email ?? cleanName, next.code).catch(() => {});
                }
                haptics.success();
                toast.success(format('pairing.joinedSession', { code: next.code }));
                router.replace('/(app)/(tabs)/home');
              } catch (error: any) {
                haptics.error();
                toast.error(error?.message ?? t('pairing.joinError'));
              }
            }}
            fullWidth
          />
        </View>
      </Card>
      <Button label={t('pairing.backToApp')} onPress={() => router.back()} variant="ghost" fullWidth />
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
