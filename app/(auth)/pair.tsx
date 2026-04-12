import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Heading, Input, Page } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { createPairingSession, joinPairingSession, getLocalPairingSession, type PairingSession } from '@/services/pairingService';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

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
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1.03, { duration: 900 }), withTiming(1, { duration: 900 })), -1, true);
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  useEffect(() => {
    (async () => {
      setSession(await getLocalPairingSession());
    })();
  }, []);

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <Heading
          eyebrow={t('auth.pair', 'Pair device')}
          title={t('pair.title', 'Share app access')}
          subtitle={t('pair.subtitle', 'Use a code to sync baby data and session between devices.')}
        />
        <Card>
          <Animated.View entering={FadeInDown.duration(240)} style={{ gap: 12 }}>
            <View style={{ alignItems: 'center', gap: 10, paddingVertical: 4 }}>
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center' }}>{t('pair.current_code', 'Current shared code')}</Text>
              <Animated.View style={[pulseStyle, { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 22, backgroundColor: colors.backgroundAlt, borderWidth: 1, borderColor: colors.border }]}>
                <Text style={{ color: colors.text, fontSize: 32, fontWeight: '900', letterSpacing: 6, textAlign: 'center' }}>{session?.code ?? code}</Text>
              </Animated.View>
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center' }}>
                {t('pair.status', 'Status')}: {session?.status ?? t('pair.local_only', 'local only')}
              </Text>
            </View>
            <Button
              label={t('pair.create_code', 'Create new code')}
              onPress={async () => {
                const next = await createPairingSession(user?.uid ?? 'anonymous');
                setSession(next);
                setCode(next.code);
                Alert.alert(t('pair.created', 'Pairing code created'), next.code);
              }}
            />
            <Button
              label={t('pair.copy_code', 'Copy code')}
              onPress={() => Alert.alert(t('pair.code', 'Pairing code'), session?.code ?? code)}
              variant="ghost"
            />
          </Animated.View>
        </Card>
        <Card>
          <View style={{ gap: 12 }}>
            <Input
              label={t('pair.join_code', 'Join code')}
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              keyboardType="numeric"
              inputMode="numeric"
            />
            <Button
              label={t('pair.join_session', 'Join session')}
              onPress={async () => {
                try {
                  const next = await joinPairingSession(code, user?.uid ?? 'anonymous');
                  setSession(next);
                  Alert.alert(t('pair.joined', 'Joined'), `${t('pair.session', 'Session')} ${next.code} ${t('pair.status_is', 'is now')} ${next.status}.`);
                } catch (error: any) {
                  Alert.alert(t('pair.failed', 'Pairing failed'), error?.message ?? t('pair.failed_body', 'Could not join the session.'));
                }
              }}
            />
          </View>
        </Card>
        <Button label={t('pair.back', 'Back to app')} onPress={() => router.back()} variant="ghost" />
      </ScrollView>
    </Page>
  );
}
