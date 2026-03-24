import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Segment } from '@/components/ui';
import { formatDuration } from '@/utils/date';
import { useTheme } from '@/context/ThemeContext';

function pad(value: number) {
  return String(Math.max(0, Math.floor(value))).padStart(2, '0');
}

export function TimerWidget({
  label = 'Timer',
  valueMinutes,
  onChangeMinutes,
  allowSides = false,
  side,
  onSideChange,
  largeTouchMode = false,
}: {
  label?: string;
  valueMinutes: number;
  onChangeMinutes: (minutes: number) => void;
  allowSides?: boolean;
  side?: 'left' | 'right' | 'both';
  onSideChange?: (side: 'left' | 'right' | 'both') => void;
  largeTouchMode?: boolean;
}) {
  const { colors } = useTheme();
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [liveSeconds, setLiveSeconds] = useState(0);

  useEffect(() => {
    if (!running || !startedAt) {
      setLiveSeconds(0);
      return;
    }

    setLiveSeconds(Math.floor((Date.now() - startedAt) / 1000));
    const timer = setInterval(() => {
      setLiveSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [running, startedAt]);

  const displayMinutes = useMemo(() => {
    if (running) return Math.max(0, Math.round(liveSeconds / 60));
    return valueMinutes;
  }, [liveSeconds, running, valueMinutes]);

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>{label}</Text>
        <Text style={{ color: colors.muted, fontWeight: '700' }}>{formatDuration(displayMinutes)}</Text>
      </View>

      {allowSides && onSideChange ? (
        <Segment
          value={side ?? 'left'}
          onChange={(value) => onSideChange(value as 'left' | 'right' | 'both')}
          options={[
            { label: 'Left', value: 'left' },
            { label: 'Right', value: 'right' },
            { label: 'Both', value: 'both' },
          ]}
        />
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <Pressable
          onPress={() => {
            if (running) {
              const elapsed = Math.max(0, Math.round(((Date.now() - (startedAt ?? Date.now())) / 60000) * 10) / 10);
              onChangeMinutes(Math.max(1, Math.round(elapsed)));
              setRunning(false);
              setStartedAt(null);
              return;
            }

            setStartedAt(Date.now());
            setRunning(true);
          }}
          style={{
            paddingHorizontal: largeTouchMode ? 18 : 14,
            paddingVertical: largeTouchMode ? 16 : 12,
            borderRadius: 16,
            backgroundColor: running ? colors.danger : colors.primary,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>{running ? 'Stop' : 'Start'}</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setRunning(false);
            setStartedAt(null);
            setLiveSeconds(0);
            onChangeMinutes(0);
          }}
          style={{
            paddingHorizontal: largeTouchMode ? 18 : 14,
            paddingVertical: largeTouchMode ? 16 : 12,
            borderRadius: 16,
            backgroundColor: colors.backgroundAlt,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '800' }}>Reset</Text>
        </Pressable>
        <Pressable
          onPress={() => onChangeMinutes(Math.max(0, valueMinutes - 5))}
          style={{
            paddingHorizontal: largeTouchMode ? 18 : 14,
            paddingVertical: largeTouchMode ? 16 : 12,
            borderRadius: 16,
            backgroundColor: colors.backgroundAlt,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '800' }}>-5m</Text>
        </Pressable>
        <Pressable
          onPress={() => onChangeMinutes(valueMinutes + 5)}
          style={{
            paddingHorizontal: largeTouchMode ? 18 : 14,
            paddingVertical: largeTouchMode ? 16 : 12,
            borderRadius: 16,
            backgroundColor: colors.backgroundAlt,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '800' }}>+5m</Text>
        </Pressable>
      </View>
    </View>
  );
}
