import React, { useMemo } from 'react';
import { Image, Pressable, Text } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';

function hashStringToColor(str: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }

  const colors: [string, string][] = [
    ['#FF6B6B', '#FFE66D'],
    ['#4ECDC4', '#95E1D3'],
    ['#95E1D3', '#FF9A76'],
    ['#A8E6CF', '#FFD3B6'],
    ['#FFD3B6', '#FFAAA5'],
    ['#FF8B94', '#FF6E7F'],
    ['#BDB2FF', '#A0C4FF'],
    ['#CAFFBF', '#FFE66D'],
  ];

  const index = Math.abs(hash % colors.length);
  return colors[index];
}

interface AvatarInitialsProps {
  name: string;
  photoUri?: string;
  size?: number;
  onPress?: () => void;
}

export function AvatarInitials({ name, photoUri, size = 72, onPress }: AvatarInitialsProps) {
  const { colors: themeColors } = useTheme();
  const [gradientStart, gradientEnd] = useMemo(() => hashStringToColor(name), [name]);
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  if (photoUri) {
    return (
      <Pressable
        onPress={onPress}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          overflow: 'hidden',
          backgroundColor: themeColors.backgroundAlt,
        }}
      >
        <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </Pressable>
    );
  }

  return (
    <Animated.View entering={ZoomIn}>
      <Pressable
        onPress={onPress}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LinearGradient
          colors={[gradientStart, gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: size * 0.35, fontWeight: '800', letterSpacing: 0.5 }}>
            {initials}
          </Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
