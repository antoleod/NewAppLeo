import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';

export default function IndexRoute() {
  const { loading, user, profile, guestMode } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (user && (profile || guestMode)) return <Redirect href="/home" />;
  if (user && !profile && !guestMode) return <Redirect href="/onboarding" />;

  return <Redirect href="/login" />;
}
