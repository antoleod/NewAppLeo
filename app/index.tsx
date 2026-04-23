import { Redirect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { Page } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function IndexRoute() {
  const { loading, user, profile, guestMode } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <Page scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ color: colors.text, fontSize: 19, fontWeight: '700' }}>Loading...</Text>
        </View>
      </Page>
    );
  }

  if (user || guestMode) {
    // Allow access to home even if onboarding is incomplete.
    // Users can complete onboarding from the Profile tab.
    return <Redirect href="/home" />;
  }

  return <Redirect href="/login" />;
}
