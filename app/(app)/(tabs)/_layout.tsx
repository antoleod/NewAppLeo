import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useLocale } from '@/context/LocaleContext';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useLocale();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: 'rgba(22, 27, 34, 0.34)',
          borderTopColor: 'rgba(255,255,255,0.08)',
          height: 66,
          paddingTop: 6,
          paddingBottom: 8,
          marginHorizontal: 10,
          marginBottom: 10,
          borderRadius: 22,
          borderTopWidth: 1,
          borderWidth: 1,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ color, size }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            home: 'home-outline',
            history: 'time-outline',
            insights: 'analytics-outline',
            profile: 'person-outline',
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
