import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useLocale } from '@/context/LocaleContext';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
        },
        tabBarLabelStyle: {
          fontSize: isCompactPhone ? 10 : 11,
          fontWeight: '700',
        },
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ color, size, focused }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            home: focused ? 'home' : 'home-outline',
            history: focused ? 'time' : 'time-outline',
            insights: focused ? 'analytics' : 'analytics-outline',
            profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={map[route.name] ?? 'ellipse'} color={color} size={size ?? 20} />;
        },
      })}
    >
      <Tabs.Screen name="home" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="history" options={{ title: t('tabs.history') }} />
      <Tabs.Screen name="insights" options={{ title: t('tabs.insights') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
    </Tabs>
  );
}
