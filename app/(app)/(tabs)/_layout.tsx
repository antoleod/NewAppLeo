import { Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useLocale } from '@/context/LocaleContext';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerHaptic } from '@/lib/mobile';
import { BabyFlowIcon } from '@/components/BabyFlowIcon';

export default function TabsLayout() {
  const { theme, paletteMode, themeStyle } = useTheme();
  const { t } = useLocale();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDark = paletteMode === 'nuit';
  const isPhoto = themeStyle === 'photo';
  const isCompactPhone = width < 390;
  const isLargePhone = width >= 430;
  const bottomInset = Math.max(insets.bottom, isCompactPhone ? 6 : 10);
  const tabHeight = (isCompactPhone ? 56 : isLargePhone ? 64 : 60) + bottomInset;

  const tabBarBackground = isPhoto
    ? (isDark ? 'rgba(10, 14, 20, 0.72)' : 'rgba(255, 255, 255, 0.76)')
    : isDark
      ? 'rgba(18, 23, 31, 0.96)'
      : 'rgba(255, 255, 255, 0.97)';

  const tabBarBorder = isPhoto ? `${theme.border}CC` : theme.border;
  const activeTint = theme.accent;
  const inactiveTint = isDark ? theme.textMuted : '#5F6772';

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: inactiveTint,
        tabBarStyle: {
          backgroundColor: tabBarBackground,
          borderTopColor: tabBarBorder,
          height: tabHeight,
          paddingTop: isCompactPhone ? 4 : 6,
          paddingBottom: bottomInset,
          marginHorizontal: isCompactPhone ? 8 : 10,
          marginBottom: Math.max(8, insets.bottom ? insets.bottom - 2 : 8),
          borderRadius: isCompactPhone ? 18 : 22,
          borderTopWidth: 1,
          borderWidth: 1,
          overflow: 'hidden',
          elevation: 6,
        },
        tabBarItemStyle: {
          borderRadius: isCompactPhone ? 12 : 16,
          marginHorizontal: isCompactPhone ? 1 : 2,
          minHeight: 48,
        },
        tabBarButton: (props) => {
          const { onPress, style, ref: _ref, ...rest } = props as any;
          return (
          <Pressable
            {...rest}
            onPress={(event) => {
              void triggerHaptic('selection');
              onPress?.(event);
            }}
            style={[style, { minHeight: isCompactPhone ? 54 : 58, justifyContent: 'center' }]}
          />
          );
        },
        tabBarLabelStyle: {
          fontSize: isCompactPhone ? 10 : 11,
          fontWeight: '700',
        },
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ color, size, focused }) => {
          const map: Record<string, 'home' | 'history' | 'insights' | 'profile'> = {
            home: 'home',
            history: 'history',
            insights: 'insights',
            profile: 'profile',
          };
          return <BabyFlowIcon name={map[route.name] ?? 'home'} size={(size ?? 20) - 2} active={focused} />;
        },
      })}
    >
      <Tabs.Screen name="home" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="history" options={{ title: t('tabs.history') }} />
      <Tabs.Screen name="insights" options={{ title: t('tabs.insights') }} />
      <Tabs.Screen name="profile" options={{ title: 'Config' }} />
    </Tabs>
  );
}
