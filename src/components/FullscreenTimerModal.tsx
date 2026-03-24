import { useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function pad(value: number) {
  return String(Math.max(0, Math.floor(value))).padStart(2, '0');
}

function formatTimer(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function formatClock(timestamp: number) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
}

export function FullscreenTimerModal({
  visible,
  emoji,
  title,
  subtitlePrefix,
  startedAt,
  elapsedSeconds,
  animatePulse = true,
  onStop,
}: {
  visible: boolean;
  emoji: string;
  title: string;
  subtitlePrefix: string;
  startedAt: number;
  elapsedSeconds: number;
  animatePulse?: boolean;
  onStop: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible || !animatePulse) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      pulse.setValue(1);
    };
  }, [animatePulse, pulse, visible]);

  const subtitle = useMemo(() => `${subtitlePrefix} - en cours depuis ${formatClock(startedAt)}`, [startedAt, subtitlePrefix]);

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }} edges={['top', 'bottom']}>
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
          <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 18, textAlign: 'center' }}>{subtitle}</Text>
        </View>
        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <Pressable
            onPress={onStop}
            style={{
              minHeight: 64,
              borderRadius: 20,
              backgroundColor: '#d84c4c',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 17 }}>STOP</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
