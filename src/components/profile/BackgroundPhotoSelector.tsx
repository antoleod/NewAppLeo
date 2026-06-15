import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { confirmAction, alertInfo } from '@/utils/confirm';
import { spacing, radii } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { typography } from '@/typography';
import { Card, SectionHeader, ButtonGroup } from '@/components/shared';

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
  const { t } = useTranslation();
  const [selecting, setSelecting] = useState(false);

  const handlePickPhoto = async () => {
    try {
      // On web the picker is an <input type=file> that must be opened within
      // the click's user-gesture. Awaiting a permission request first breaks
      // that gesture chain (browser blocks the file dialog) — and web needs no
      // media-library permission anyway. So only request it on native.
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          alertInfo(t('dataIO.bgPermissionTitle'), t('dataIO.bgPermissionMsg'));
          return;
        }
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
        alertInfo(t('dataIO.successTitle'), t('dataIO.bgUpdated'));
      }
    } catch (error: any) {
      alertInfo(t('dataIO.errorTitle'), error.message || t('dataIO.bgPickFailed'));
    } finally {
      setSelecting(false);
    }
  };

  const handleRemovePhoto = async () => {
    const ok = await confirmAction({
      title: t('dataIO.bgRemoveTitle'),
      message: t('dataIO.bgRemoveMsg'),
      confirmLabel: t('dataIO.bgRemoveConfirm'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    onPhotoRemoved?.();
    alertInfo(t('dataIO.successTitle'), t('dataIO.bgRemoved'));
  };

  return (
    <Card>
      <SectionHeader title={t('dataIO.bgTitle')} />
      <Text style={[typography.body, { color: colors.muted, marginBottom: spacing.md }]}>
        {t('dataIO.bgSubtitle')}
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
              {t('dataIO.bgNoCustom')}
            </Text>
            <Text style={[typography.detail, { color: colors.muted }]}>
              {t('dataIO.bgDefaultUsed')}
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
            {t('dataIO.bgActive')}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <ButtonGroup
        buttons={[
          {
            label: selecting ? t('dataIO.bgSelecting') : t('dataIO.bgChoose'),
            onPress: handlePickPhoto,
            variant: 'primary',
          },
          ...(currentPhotoUri
            ? [
                {
                  label: t('dataIO.bgRemoveConfirm'),
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
          {t('dataIO.bgTips')}
        </Text>
        <Text style={[typography.detail, { color: theme.textMuted, lineHeight: 18 }]}>
          {t('dataIO.bgTipsBody')}
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
  const { theme } = useTheme();
  const { t } = useTranslation();

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
          {hasCustomBackground ? t('dataIO.bgCustomLabel') : t('dataIO.bgDefaultLabel')}
        </Text>
        <Text style={[typography.detail, { color: theme.textMuted, marginTop: 2 }]}>
          {t('dataIO.bgTapToggle')}
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
