import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { spacing, radii } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { typography } from '@/typography';
import { Button, Card, SectionHeader, ButtonGroup } from '@/components/ui';

export interface BackgroundPhotoSelectorProps {
  currentPhotoUri?: string;
  onPhotoSelected: (uri: string) => void;
  onPhotoRemoved?: () => void;
  isLoading?: boolean;
}

export function BackgroundPhotoSelector({
  currentPhotoUri,
  onPhotoSelected,
  onPhotoRemoved,
  isLoading = false,
}: BackgroundPhotoSelectorProps) {
  const { theme, colors } = useTheme();
  const [selecting, setSelecting] = useState(false);

  const handlePickPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission required',
          'Allow photo access to set a custom app background.'
        );
        return;
      }

      setSelecting(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        onPhotoSelected(uri);
        Alert.alert('Success', 'Background photo updated!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick image');
    } finally {
      setSelecting(false);
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert(
      'Remove Background',
      'Remove custom background photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            onPhotoRemoved?.();
            Alert.alert('Success', 'Background photo removed');
          },
        },
      ]
    );
  };

  return (
    <Card>
      <SectionHeader title="📸 Background Photo" />
      <Text style={[typography.body, { color: colors.muted, marginBottom: spacing.md }]}>
        Customize your app background with a personal photo
      </Text>

      {/* Preview Section */}
      <View
        style={{
          borderRadius: radii.lg,
          overflow: 'hidden',
          height: 180,
          borderWidth: 1,
          borderColor: theme.border,
          marginBottom: spacing.md,
          backgroundColor: theme.bgCardAlt,
        }}
      >
        {currentPhotoUri ? (
          <Image
            source={{ uri: currentPhotoUri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              flex: 1,
              backgroundColor: theme.bgCard,
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
            }}
          >
            <Text style={[typography.sectionLabel, { color: theme.accent }]}>
              📷 NO CUSTOM BACKGROUND
            </Text>
            <Text style={[typography.detail, { color: colors.muted }]}>
              Default background will be used
            </Text>
          </View>
        )}
      </View>

      {/* Info Badge */}
      {currentPhotoUri && (
        <View
          style={{
            backgroundColor: `${theme.green}11`,
            borderColor: theme.green,
            borderWidth: 1,
            borderRadius: radii.md,
            padding: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          <Text style={[typography.detail, { color: theme.green, fontWeight: '600' }]}>
            ✓ Custom background active
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <ButtonGroup
        buttons={[
          {
            label: selecting ? 'Selecting...' : '📁 Choose Photo',
            onPress: handlePickPhoto,
            variant: 'primary',
          },
          ...(currentPhotoUri
            ? [
                {
                  label: 'Remove',
                  onPress: handleRemovePhoto,
                  variant: 'ghost' as const,
                },
              ]
            : []),
        ]}
        direction="column"
      />

      {/* Tips */}
      <View
        style={{
          backgroundColor: theme.bgCardAlt,
          borderRadius: radii.md,
          padding: spacing.md,
          marginTop: spacing.md,
          gap: spacing.xs,
        }}
      >
        <Text style={[typography.sectionLabel, { color: theme.accent }]}>
          💡 TIPS
        </Text>
        <Text style={[typography.detail, { color: theme.textMuted, lineHeight: 18 }]}>
          • Use high contrast images for better readability{'\n'}
          • Recommended: 16:9 aspect ratio{'\n'}
          • Works with all theme modes and styles{'\n'}
          • Photo will be automatically blurred when needed
        </Text>
      </View>

      {isLoading && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: radii.lg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      )}
    </Card>
  );
}

export function QuickBackgroundToggle({
  hasCustomBackground,
  onToggleDefault,
}: {
  hasCustomBackground: boolean;
  onToggleDefault: () => void;
}) {
  const { theme, colors } = useTheme();

  return (
    <Pressable
      onPress={onToggleDefault}
      style={{
        backgroundColor: theme.bgCard,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: radii.lg,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View>
        <Text style={[typography.pill, { color: theme.textPrimary, fontWeight: '700' }]}>
          {hasCustomBackground ? '📸 Custom Background' : '🎨 Default Background'}
        </Text>
        <Text style={[typography.detail, { color: theme.textMuted, marginTop: 2 }]}>
          Tap to toggle
        </Text>
      </View>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radii.pill,
          backgroundColor: `${theme.accent}22`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 20 }}>
          {hasCustomBackground ? '📸' : '🎨'}
        </Text>
      </View>
    </Pressable>
  );
}
