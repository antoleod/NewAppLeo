import { useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocale } from '@/context/LocaleContext';
import { useTranslation } from '@/hooks/useTranslation';

function pad(value: number) {
  return String(Math.max(0, Math.floor(value))).padStart(2, '0');
}

function formatTimer(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function localeTag(language: string) {
  if (language === 'es') return 'es-ES';
  if (language === 'en') return 'en-US';
  if (language === 'nl') return 'nl-BE';
  return 'fr-FR';
}

const CAN_USE_NATIVE_ANIMATION_DRIVER = Platform.OS !== 'web';

export function FullscreenTimerModal({
  visible,
  emoji,
  title,
  subtitlePrefix,
  startedAt,
  elapsedSeconds,
  animatePulse = true,
  onStop,
  onCancel,
  cancelLabel,
  onMinimize,
}: {
  visible: boolean;
  emoji: string;
  title: string;
  subtitlePrefix: string;
  startedAt: number;
  elapsedSeconds: number;
  animatePulse?: boolean;
  onStop: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  onMinimize?: () => void;
}) {
  const { language } = useLocale();
  const { t } = useTranslation();
  const locale = localeTag(language);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible || !animatePulse) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 500, useNativeDriver: CAN_USE_NATIVE_ANIMATION_DRIVER }),
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: CAN_USE_NATIVE_ANIMATION_DRIVER }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      pulse.setValue(1);
    };
  }, [animatePulse, pulse, visible]);

  const startedLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(startedAt));
    return `${subtitlePrefix} · ${fmt}`;
  }, [locale, startedAt, subtitlePrefix]);

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }} edges={['top', 'bottom']}>
        {onMinimize ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 8, paddingHorizontal: 8, zIndex: 10 }}>
            <SafeAreaView edges={['top']}>
              <Pressable
                onPress={onMinimize}
                accessibilityRole="button"
                accessibilityLabel={t('timer.minimize')}
                hitSlop={12}
                style={({ pressed }) => ({
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: pressed ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.10)',
                })}
              >
                <Ionicons name="chevron-down" size={18} color="#ffffff" />
                <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '700' }}>{t('timer.minimize')}</Text>
              </Pressable>
            </SafeAreaView>
          </View>
        ) : null}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, gap: 22 }}>
          <Animated.Text style={{ fontSize: 72, transform: [{ scale: pulse }] }}>{emoji}</Animated.Text>
          <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '700' }}>{title}</Text>
          <Text
            style={{
              color: '#ffffff',
              fontSize: 80,
              lineHeight: 88,
              fontWeight: '200',
              textAlign: 'center',
              ...(Platform.OS === 'ios' ? { fontFamily: 'SF Pro Display' } : null),
            }}
          >
            {formatTimer(elapsedSeconds)}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 18, textAlign: 'center' }}>{startedLabel}</Text>
        </View>
        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <Pressable
            onPress={onStop}
            accessibilityRole="button"
            accessibilityLabel={t('timer.stop')}
            style={{
              minHeight: 64,
              borderRadius: 20,
              backgroundColor: '#d84c4c',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 17 }}>{t('timer.stop').toUpperCase()}</Text>
          </Pressable>
          {onCancel && (
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel ?? 'Cancel'}
              style={{ alignItems: 'center', paddingVertical: 14, marginTop: 4 }}
              hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' }}>
                {cancelLabel ?? 'Cancel'}
              </Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
