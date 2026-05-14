import React from 'react';
import { StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button, Input } from '@/components/shared';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocale } from '@/context/LocaleContext';

type Props = {
  title: string;
  setTitle: (next: string) => void;
  icon: string;
  setIcon: (next: string) => void;
  photoUri: string;
  setPhotoUri: (next: string) => void;
};

export const MilestoneSection = React.memo(function MilestoneSection({
  title, setTitle, icon, setIcon, photoUri, setPhotoUri,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLocale();

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const photoLabel = photoUri
    ? (language === 'fr' ? '📷 Remplacer' : language === 'es' ? '📷 Reemplazar' : language === 'nl' ? '📷 Vervangen' : '📷 Replace')
    : (language === 'fr' ? '📷 Ajouter' : language === 'es' ? '📷 Añadir' : language === 'nl' ? '📷 Toevoegen' : '📷 Add');

  return (
    <View style={styles.sectionCard}>
      <Input
        label={t('entry.titleLabel')}
        value={title}
        onChangeText={setTitle}
        placeholder={
          language === 'fr' ? 'Premier sourire...'
            : language === 'es' ? 'Primera sonrisa...'
            : language === 'nl' ? 'Eerste glimlach...'
            : 'First smile...'
        }
      />
      <Input label="Icon" value={icon} onChangeText={setIcon} placeholder="?" />
      <Button label={photoLabel} onPress={() => void pickPhoto()} variant="ghost" />
    </View>
  );
});

const styles = StyleSheet.create({
  sectionCard: {
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
});
