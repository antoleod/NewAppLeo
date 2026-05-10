import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Text, useWindowDimensions } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useLocale } from '@/context/LocaleContext';
import {
  HomeTabIcon,
  HistoryTabIcon,
  InsightsTabIcon,
  ProfileTabIcon,
} from '@/components/TabIcons';

type TabIconComponent = React.ComponentType<{ color: string; size?: number; focused?: boolean }>;

const CUSTOM_ICONS: Record<string, TabIconComponent> = {
  home:     HomeTabIcon,
  history:  HistoryTabIcon,
  insights: InsightsTabIcon,
  profile:  ProfileTabIcon,
};

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const { theme, themeStyle } = useTheme();
  const { t } = useLocale();
  const isPhoto = themeStyle === 'photo';
  const isDesktopWeb = Platform.OS === 'web' && width >= 1280;

  const tabBarBackground = isPhoto ? `${theme.navBg}DD` : theme.navBg;
  const tabBarBorder = isPhoto ? `${theme.navBorder}CC` : theme.navBorder;
  const activeTint = theme.navActive;
  const inactiveTint = theme.navInactive;

  return (
    <Tabs
      screenOptions={({ route }) => {
        const CustomIcon = CUSTOM_ICONS[route.name];
        return {
          headerShown: false,
          tabBarActiveTintColor: activeTint,
          tabBarInactiveTintColor: inactiveTint,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            backgroundColor: tabBarBackground,
            borderTopColor: tabBarBorder,
            height: isDesktopWeb ? 58 : 64,
            paddingTop: isDesktopWeb ? 6 : 8,
            paddingBottom: isDesktopWeb ? 6 : 10,
            marginHorizontal: isDesktopWeb ? 140 : 12,
            marginBottom: isDesktopWeb ? 16 : 10,
            borderRadius: isDesktopWeb ? 18 : 22,
            borderTopWidth: 1,
            borderWidth: 1,
            overflow: 'hidden',
            elevation: 6,
          },
          tabBarItemStyle: {
            borderRadius: isDesktopWeb ? 12 : 16,
            marginHorizontal: 2,
            minWidth: 0,
            flexShrink: 1,
          },
          tabBarIcon: ({ color, focused }) =>
            CustomIcon ? (
              <CustomIcon color={color} size={24} focused={focused} />
            ) : (
              <Ionicons name="ellipse-outline" color={color} size={22} />
            ),
          tabBarLabel: ({ color, focused }) => (
            <Text
              numberOfLines={1}
              style={{
                color,
                fontSize: isDesktopWeb ? 11 : 10,
                fontWeight: focused ? '800' : '600',
                letterSpacing: 0.2,
                marginTop: 1,
              }}
            >
              {t(`tabs.${route.name}`)}
            </Text>
          ),
        };
      }}
    >
      <Tabs.Screen name="home"     options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="history"  options={{ title: t('tabs.history') }} />
      <Tabs.Screen name="insights" options={{ title: t('tabs.insights') }} />
      <Tabs.Screen name="profile"  options={{ title: t('tabs.profile') }} />
      <Tabs.Screen name="settings-theme" options={{ href: null }} />
    </Tabs>
  );
}
