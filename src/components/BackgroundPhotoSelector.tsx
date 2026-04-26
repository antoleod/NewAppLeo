import React, { useState } from 'react';
import { View, Text, Image, Pressable, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { spacing, radii } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useLocale } from '@/context/LocaleContext';
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
  const { t } = useLocale();
  const [selecting, setSelecting] = useState(false);

  const handlePickPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('settings.photo.permission_title', 'Permission required'), t('settings.photo.permission_body', 'Allow photo access to set a background.'));
        return;
      }
      setSelecting(true);
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.9 });
      if (!result.canceled && result.assets[0]?.uri) {
        onPhotoSelected(result.assets[0].uri);
        Alert.alert(t('settings.photo.saved_title', 'Image saved'), t('settings.photo.saved_body', 'Background image applied.'));
      }
    } finally {
      setSelecting(false);
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert(t('settings.photo.remove_title', 'Remove background'), t('settings.photo.remove_body', 'Remove the custom background image?'), [
      { text: t('common.cancel', 'Cancel'), style: 'cancel' },
      { text: t('common.remove', 'Remove'), style: 'destructive', onPress: () => onPhotoRemoved?.() },
    ]);
  };

  return (
    <Card>
      <SectionHeader title={t('settings.photo.title', 'Background Photo')} />
      <Text style={[typography.body, { color: colors.muted, marginBottom: spacing.md, fontSize: 12, lineHeight: 17 }]}>
        {t('settings.photo.body', 'Use a photo as the app backdrop.')}
      </Text>
      <View style={{ borderRadius: radii.lg, overflow: 'hidden', height: 160, borderWidth: 1, borderColor: theme.border, marginBottom: spacing.md, backgroundColor: theme.bgCardAlt }}>
        {currentPhotoUri ? (
          <Image source={{ uri: currentPhotoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, backgroundColor: theme.bgCard, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[typography.sectionLabel, { color: theme.accent }]}>{t('settings.photo.none', 'No custom background')}</Text>
          </View>
        )}
      </View>
      {currentPhotoUri ? <Text style={{ color: theme.green, fontSize: 12, fontWeight: '700', marginBottom: spacing.sm }}>{t('settings.photo.applied', 'Image applied')}</Text> : null}
      <ButtonGroup buttons={[{ label: selecting ? t('settings.photo.selecting', 'Selecting...') : t('settings.photo.choose', 'Choose Photo'), onPress: handlePickPhoto }, ...(currentPhotoUri ? [{ label: t('common.remove', 'Remove'), onPress: handleRemovePhoto, variant: 'ghost' as const }] : [])]} direction="column" />
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
  const { t } = useLocale();
  return (
    <Pressable onPress={onToggleDefault} style={{ backgroundColor: theme.bgCard, borderColor: theme.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View>
        <Text style={[typography.pill, { color: theme.textPrimary, fontWeight: '700' }]}>{hasCustomBackground ? t('settings.photo.custom', 'Custom Background') : t('settings.photo.default', 'Default Background')}</Text>
        <Text style={[typography.detail, { color: theme.textMuted, marginTop: 2 }]}>{t('settings.photo.tap_toggle', 'Tap to toggle')}</Text>
      </View>
    </Pressable>
  );
}
