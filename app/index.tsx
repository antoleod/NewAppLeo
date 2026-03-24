import { Redirect } from 'expo-router';
import { ActivityIndicator, View, Text } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { Page } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';

export default function IndexRoute() {
  const { loading, user, profile } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <Page scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Preparing App Leo</Text>
        </View>
      </Page>
    );
  }

  if (!user) return <Redirect href="/login" />;
  if (!profile?.hasCompletedOnboarding) return <Redirect href="/onboarding" />;
  return <Redirect href="/home" />;
}
