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
  SettingsThemeTabIcon,
} from '@/components/navigation';

type TabIconComponent = React.ComponentType<{ color: string; size?: number; focused?: boolean }>;

const CUSTOM_ICONS: Record<string, TabIconComponent> = {
  home:             HomeTabIcon,
  history:          HistoryTabIcon,
  insights:         InsightsTabIcon,
  profile:          ProfileTabIcon,
  'settings-theme': SettingsThemeTabIcon,
};

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const { theme, themeStyle } = useTheme();
  const { t } = useLocale();
  const isPhoto = themeStyle === 'photo';
  const isDesktopWeb = Platform.OS === 'web' && width >= 1280;
  const isMobile = !isDesktopWeb;

  const tabBarBackground = isPhoto ? `${theme.navBg}DD` : theme.navBg;
  const tabBarBorder = isPhoto ? `${theme.navBorder}CC` : theme.navBorder;
  const activeTint = isMobile && isPhoto ? '#FFFFFF' : theme.navActive;
  const inactiveTint = isMobile && isPhoto ? 'rgba(255,255,255,0.82)' : theme.navInactive;

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
            height: isDesktopWeb ? 54 : 74,
            paddingTop: isDesktopWeb ? 8 : 5,
            paddingBottom: isDesktopWeb ? 8 : 5,
            marginHorizontal: isDesktopWeb ? 140 : 12,
            marginBottom: isDesktopWeb ? 6 : 5,
            borderRadius: isDesktopWeb ? 8 : 12,
            borderTopWidth: 1,
            borderWidth: 1,
            overflow: 'visible',
            elevation: 6,
          },
          tabBarItemStyle: {
            borderRadius: isDesktopWeb ? 12 : 16,
            marginHorizontal: 2,
            minWidth: 0,
            flexShrink: 1,
            paddingVertical: isDesktopWeb ? 2 : 4,
          },
          tabBarLabelPosition: 'below-icon',
          tabBarIcon: ({ color, focused }) =>
            CustomIcon ? (
              <CustomIcon color={color} size={22} focused={focused} />
            ) : (
              <Ionicons name="ellipse-outline" color={color} size={20} />
            ),
          tabBarLabel: ({ color, focused }) => (
            <Text
              numberOfLines={1}
              style={{
                color,
                fontSize: isDesktopWeb ? 11 : 12,
                fontWeight: focused ? '800' : '600',
                letterSpacing: 0.2,
                marginTop: 3,
                includeFontPadding: false,
              }}
            >
              {route.name === 'settings-theme'
                ? t('header.settings')
                : route.name === 'profile'
                  ? t('header.profile')
                  : t(`tabs.${route.name}`)}
            </Text>
          ),
        };
      }}
    >
      <Tabs.Screen name="home"     options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="history"  options={{ title: t('tabs.history') }} />
      <Tabs.Screen name="insights" options={{ title: t('tabs.insights') }} />
      <Tabs.Screen name="profile"  options={{ title: t('header.profile') }} />
      <Tabs.Screen name="settings-theme" options={{ title: t('header.settings') }} />
    </Tabs>
  );
}
