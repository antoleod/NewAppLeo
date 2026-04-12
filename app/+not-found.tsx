import { Stack, router } from 'expo-router';
import { View, Text } from 'react-native';
import { Button, Page } from '@/components/ui';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Page>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 }}>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900' }}>Page not found</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>The requested web route is not available.</Text>
          <Button label="Go home" onPress={() => router.replace('/home')} />
        </View>
      </Page>
    </>
  );
}
