import React, { useState } from 'react';
import { View, Text, Image, Pressable, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { spacing, radii } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { typography } from '@/typography';
import { Button, Card, SectionHeader, ButtonGroup } from '@/components/ui';

export function BackgroundPhotoSelector({
  currentPhotoUri,
  onPhotoSelected,
  onPhotoRemoved,
  isLoading = false,
}: {
  currentPhotoUri?: string;
  onPhotoSelected: (uri: string) => void;
  onPhotoRemoved?: () => void;
  isLoading?: boolean;
}) {
  const { theme, colors } = useTheme();
  const [selecting, setSelecting] = useState(false);

  const handlePickPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Allow photo access to set a background.');
        return;
      }
      setSelecting(true);
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.9 });
      if (!result.canceled && result.assets[0]?.uri) {
        onPhotoSelected(result.assets[0].uri);
        Alert.alert('Image saved', 'Background image applied.');
      }
    } finally {
      setSelecting(false);
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert('Remove background', 'Remove the custom background image?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onPhotoRemoved?.() },
    ]);
  };

  return (
    <Card>
      <SectionHeader title="Background Photo" />
      <Text style={[typography.body, { color: colors.muted, marginBottom: spacing.md, fontSize: 12, lineHeight: 17 }]}>
        Use a photo as the app backdrop.
      </Text>
      <View style={{ borderRadius: radii.lg, overflow: 'hidden', height: 160, borderWidth: 1, borderColor: theme.border, marginBottom: spacing.md, backgroundColor: theme.bgCardAlt }}>
        {currentPhotoUri ? (
          <Image source={{ uri: currentPhotoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, backgroundColor: theme.bgCard, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[typography.sectionLabel, { color: theme.accent }]}>No custom background</Text>
          </View>
        )}
      </View>
      {currentPhotoUri ? <Text style={{ color: theme.green, fontSize: 12, fontWeight: '700', marginBottom: spacing.sm }}>Image applied</Text> : null}
      <ButtonGroup buttons={[{ label: selecting ? 'Selecting...' : 'Choose Photo', onPress: handlePickPhoto }, ...(currentPhotoUri ? [{ label: 'Remove', onPress: handleRemovePhoto, variant: 'ghost' as const }] : [])]} direction="column" />
      {isLoading ? (
        <View style={{ position: 'absolute', inset: 0 as any, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : null}
    </Card>
  );
}

export function QuickBackgroundToggle({ hasCustomBackground, onToggleDefault }: { hasCustomBackground: boolean; onToggleDefault: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onToggleDefault} style={{ backgroundColor: theme.bgCard, borderColor: theme.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View>
        <Text style={[typography.pill, { color: theme.textPrimary, fontWeight: '700' }]}>{hasCustomBackground ? 'Custom Background' : 'Default Background'}</Text>
        <Text style={[typography.detail, { color: theme.textMuted, marginTop: 2 }]}>Tap to toggle</Text>
      </View>
    </Pressable>
  );
}
