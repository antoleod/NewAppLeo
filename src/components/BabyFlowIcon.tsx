import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type IconName =
  | 'home'
  | 'history'
  | 'insights'
  | 'profile'
  | 'routines'
  | 'patterns'
  | 'privacy'
  | 'mail'
  | 'eye'
  | 'eye-off'
  | 'hydration'
  | 'growth'
  | 'sleep'
  | 'people';

const glyphMap: Record<IconName, keyof typeof Ionicons.glyphMap> = {
  home: 'home-outline',
  history: 'time-outline',
  insights: 'analytics-outline',
  profile: 'person-outline',
  routines: 'time-outline',
  patterns: 'analytics-outline',
  privacy: 'shield-checkmark-outline',
  mail: 'mail-outline',
  eye: 'eye-outline',
  'eye-off': 'eye-off-outline',
  hydration: 'water-outline',
  growth: 'pulse-outline',
  sleep: 'moon-outline',
  people: 'people-outline',
};

export function BabyFlowIcon({
  name,
  size = 18,
  active = false,
  bare = false,
}: {
  name: IconName;
  size?: number;
  active?: boolean;
  bare?: boolean;
}) {
  const glyph = glyphMap[name];
  const icon = <Ionicons name={glyph} size={size} color={active ? '#F7FBFA' : '#A9DDD2'} />;

  if (bare) {
    return icon;
  }

  return (
    <View style={[styles.shell, active ? styles.shellActive : null]}>
      <LinearGradient
        colors={active ? ['#8FD7C0', '#5CA69B', '#6FB9D4'] : ['rgba(143,215,192,0.24)', 'rgba(92,166,155,0.14)', 'rgba(111,185,212,0.10)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {icon}
    </View>
  );
}

export function BabyFlowGoogleGlyph() {
  return (
    <View style={styles.googleShell}>
      <Text style={styles.googleGlyph}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: 34,
    height: 34,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  shellActive: {
    borderColor: 'rgba(167,227,213,0.44)',
    borderWidth: 6,
    boxShadow: '0px 4px 10px rgba(131, 212, 194, 0.18)',
    elevation: 2,
  },
  googleShell: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleGlyph: {
    color: '#1A73E8',
    fontSize: 18,
    fontWeight: '800',
  },
});
