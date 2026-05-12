import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, Card, Heading, Page, useToast } from '@/components/shared';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { flushQueuedOperations, loadQueuedOperations } from '@/lib/sync';
import { haptics } from '@/lib/haptics';
import {
  deleteSession,
  getCurrentSessionId,
  getSessionsOnce,
  registerCurrentSession,
  watchSessions,
  type SessionItem,
} from '@/services/sessionService';

function formatRelativeTime(iso: string, t: (key: string) => string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '?';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t('profile.justNow');
  if (mins < 60) return `${mins}${t('profile.relMin')}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}${t('profile.relHour')}`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}${t('profile.relDay')}`;
  return date.toLocaleDateString();
}

export default function ProfileSessionsScreen() {
  const { colors } = useTheme();
  const { t, format } = useTranslation();
  const { profile, guestMode, user } = useAuth();
  const toast = useToast();

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [queuedSyncCount, setQueuedSyncCount] = useState(0);

  useEffect(() => {
    void loadQueuedOperations().then((ops) => setQueuedSyncCount(ops.length));
  }, []);

  useEffect(() => {
    if (!user || guestMode) return;
    void getSessionsOnce(user.uid).then((initial) => { if (initial.length) setSessions(initial); });
    const unsub = watchSessions(user.uid, setSessions);
    registerCurrentSession(user.uid, user.email ?? profile?.authEmail ?? '')
      .then((id) => setCurrentSessionId(id))
      .catch(() => {
        getCurrentSessionId(user.uid).then((id) => { if (id) setCurrentSessionId(id); });
      });
    return () => unsub();
  }, [user, guestMode, profile?.authEmail]);

  const handleSyncNow = useCallback(async () => {
    if (!profile) {
      toast.error(t('profile.signInRequired'));
      return;
    }
    setSyncing(true);
    try {
      const result = await flushQueuedOperations(profile.uid);
      const ops = await loadQueuedOperations();
      setQueuedSyncCount(ops.length);
      haptics.success();
      toast.success(format('profile.syncFlushed', { count: result.flushed }));
    } catch (error: any) {
      haptics.error();
      const message = String(error?.message ?? '');
      const code = String(error?.code ?? '');
      if (code.includes('permission-denied') || /insufficient permissions|missing or insufficient/i.test(message)) {
        toast.error(t('profile.syncPermissionError'));
      } else {
        toast.error(error?.message ?? t('profile.syncError'));
      }
      const ops = await loadQueuedOperations();
      setQueuedSyncCount(ops.length);
    } finally {
      setSyncing(false);
    }
  }, [format, profile, t, toast]);

  const handleRemoveSession = useCallback(
    async (sessionId: string) => {
      haptics.light();
      if (!user) return;
      const target = sessions.find((item) => item.id === sessionId);
      if (!target) return;
      try {
        await deleteSession(user.uid, target);
        haptics.success();
        toast.success(t('profile.sessionRemoved'));
      } catch (error: any) {
        haptics.error();
        toast.error(error?.message ?? t('errors.saveFailed'));
      }
    },
    [sessions, t, toast, user],
  );

  if (guestMode) {
    return (
      <Page>
        <Heading
          eyebrow={t('tabs.profile')}
          title={t('profile.sessionsPageTitle')}
          align="left"
        />
        <Card>
          <Text style={{ color: colors.muted }}>{t('profile.guestSessionInfo')}</Text>
          <View style={{ marginTop: 12 }}>
            <Button label={t('common.back')} onPress={() => router.back()} variant="ghost" />
          </View>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <Heading
        eyebrow={t('tabs.profile')}
        title={t('profile.sessionsPageTitle')}
        align="left"
      />

      <Card>
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
          {user?.email ?? profile?.authEmail ?? t('profile.emailUnknown')}
        </Text>

        {queuedSyncCount > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              padding: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: `${colors.primary}40`,
              backgroundColor: `${colors.primary}10`,
              marginBottom: 12,
            }}
          >
            <Ionicons name="cloud-upload-outline" size={14} color={colors.primary} />
            <Text style={{ flex: 1, color: colors.text, fontSize: 12, lineHeight: 17 }}>
              {format(queuedSyncCount === 1 ? 'profile.queuedSyncCalm' : 'profile.queuedSyncCalmPlural', { count: queuedSyncCount })}
            </Text>
          </View>
        ) : null}

        <Button
          label={t('profile.syncNow')}
          onPress={handleSyncNow}
          variant="secondary"
          loading={syncing}
          disabled={syncing}
        />
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 12 }}>
          {t('profile.openSessions')}
        </Text>

        {sessions.length > 0 ? (
          sessions.map((item) => {
            const isCurrent = item.id === currentSessionId;
            const canRevoke = !item.isOwner && !isCurrent;
            const timeLabel = item.lastActiveAt ?? item.createdAt;
            return (
              <View
                key={item.id}
                style={{
                  borderWidth: 1,
                  borderColor: isCurrent ? colors.primary : colors.border,
                  borderRadius: 14,
                  padding: 12,
                  marginTop: 6,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: `${colors.primary}18`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons
                      name={item.platform === 'web' ? 'laptop-outline' : 'phone-portrait-outline'}
                      size={18}
                      color={isCurrent ? colors.primary : colors.muted}
                    />
                  </View>

                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14, flexShrink: 1 }}>
                        {item.device}
                      </Text>
                      {isCurrent && (
                        <View
                          style={{
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            borderRadius: 8,
                            backgroundColor: `${colors.primary}22`,
                          }}
                        >
                          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '800' }}>
                            {t('profile.thisDevice')}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{item.email}</Text>
                    {timeLabel ? (
                      <Text style={{ color: colors.muted, fontSize: 11 }}>
                        {t('profile.sessionStarted')}: {formatRelativeTime(timeLabel, t)}
                      </Text>
                    ) : null}
                  </View>

                  {canRevoke && (
                    <Pressable
                      onPress={() => void handleRemoveSession(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={t('profile.revokeSession')}
                      style={({ pressed }) => ({
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: colors.danger,
                        opacity: pressed ? 0.5 : 1,
                        marginTop: 1,
                      })}
                      hitSlop={8}
                    >
                      <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '700' }}>
                        {t('profile.revokeSession')}
                      </Text>
                    </Pressable>
                  )}
                </View>

                {item.isOwner && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, paddingLeft: 46 }}>
                    <Ionicons name="shield-checkmark-outline" size={11} color={colors.muted} />
                    <Text style={{ color: colors.muted, fontSize: 11 }}>{t('profile.ownerSession')}</Text>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <Text style={{ color: colors.muted, fontSize: 13 }}>{t('profile.noSessions')}</Text>
        )}
      </Card>

      <View style={{ marginHorizontal: 16, marginTop: 8 }}>
        <Button label={t('common.back')} onPress={() => router.back()} variant="ghost" />
      </View>
    </Page>
  );
}
