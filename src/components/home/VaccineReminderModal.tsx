import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Input , DateTimeField } from '@/components/shared';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import type { Theme } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  language: string;
  colors: Record<string, string>;
  metaTone: string;
  metaToneSoft: string;
  reminderStep: 'vaccine' | 'date';
  setReminderStep: (step: 'vaccine' | 'date') => void;
  vaccinePresets: string[];
  reminderVaccineName: string;
  setReminderVaccineName: (name: string) => void;
  reminderVaccineDate: Date;
  setReminderVaccineDate: (date: Date) => void;
  onSave: () => void;
  saving: boolean;
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    reminderModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
    reminderModalContent: { backgroundColor: theme.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 40, maxHeight: '85%' },
    reminderModalHeader: { marginBottom: 24 },
    reminderModalTitle: { color: theme.textPrimary, fontSize: 20, fontWeight: '900', marginBottom: 4 },
    reminderModalSubtitle: { fontSize: 12, fontWeight: '600' },
    reminderModalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    reminderPresetBtn: { flex: 1, minWidth: '31%', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bgCardAlt, alignItems: 'center' },
    reminderPresetText: { color: theme.textPrimary, fontSize: 11, fontWeight: '700', textAlign: 'center' },
    reminderCustomSection: { marginBottom: 20 },
    reminderLabel: { fontSize: 12, marginBottom: 8, fontWeight: '600' },
    reminderDateSection: { marginBottom: 20 },
    reminderSummary: { backgroundColor: 'rgba(201, 162, 39, 0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(201, 162, 39, 0.3)', paddingHorizontal: 12, paddingVertical: 12, marginBottom: 20, gap: 10 },
    reminderSummaryTitle: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
    reminderSummaryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reminderActions: { gap: 8 },
  });
}

export function VaccineReminderModal({
  visible,
  onClose,
  language,
  colors,
  metaTone,
  metaToneSoft,
  reminderStep,
  setReminderStep,
  vaccinePresets,
  reminderVaccineName,
  setReminderVaccineName,
  reminderVaccineDate,
  setReminderVaccineDate,
  onSave,
  saving,
}: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.reminderModalOverlay}>
        <View style={styles.reminderModalContent}>
          {reminderStep === 'vaccine' && (
            <>
              <View style={styles.reminderModalHeader}>
                <Text style={styles.reminderModalTitle}>{t('vaccine.reminderTitle')}</Text>
                <Text style={[styles.reminderModalSubtitle, { color: colors.muted }]}>
                  {t('vaccine.step1')}
                </Text>
              </View>

              <View style={styles.reminderModalGrid}>
                {vaccinePresets.map((preset: string) => (
                  <Pressable
                    key={preset}
                    onPress={() => setReminderVaccineName(preset)}
                    style={[
                      styles.reminderPresetBtn,
                      reminderVaccineName === preset && { backgroundColor: metaToneSoft, borderColor: metaTone },
                    ]}
                  >
                    <Text style={[styles.reminderPresetText, reminderVaccineName === preset && { color: metaTone, fontWeight: '900' }]}>
                      {preset}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.reminderCustomSection}>
                <Text style={[styles.reminderLabel, { color: colors.muted }]}>
                  {t('vaccine.orEnterName')}
                </Text>
                <Input label="" value={reminderVaccineName} onChangeText={setReminderVaccineName} placeholder={t('vaccine.namePlaceholder')} />
              </View>

              <View style={styles.reminderActions}>
                <Button label={t('common.continue')} onPress={() => setReminderStep('date')} disabled={!reminderVaccineName.trim()} />
                <Button label={t('common.cancel')} variant="ghost" onPress={onClose} />
              </View>
            </>
          )}

          {reminderStep === 'date' && (
            <>
              <View style={styles.reminderModalHeader}>
                <Text style={styles.reminderModalTitle}>{t('vaccine.reminderTitle')}</Text>
                <Text style={[styles.reminderModalSubtitle, { color: colors.muted }]}>
                  {t('vaccine.step2')}
                </Text>
              </View>

              <View style={styles.reminderDateSection}>
                <Text style={[styles.reminderLabel, { color: colors.muted, marginBottom: 12 }]}>
                  {t('vaccine.nextDoseQuestion')}
                </Text>
                <DateTimeField label={t('vaccine.dateTimeLabel')} value={reminderVaccineDate} onChange={setReminderVaccineDate} />
              </View>

              <View style={styles.reminderSummary}>
                <Text style={[styles.reminderSummaryTitle, { color: colors.text }]}>
                  {t('vaccine.summary')}
                </Text>
                <View style={styles.reminderSummaryItem}>
                  <Text style={{ color: colors.muted }}>{t('vaccine.vaccineLabel')}</Text>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{reminderVaccineName}</Text>
                </View>
                <View style={styles.reminderSummaryItem}>
                  <Text style={{ color: colors.muted }}>{t('vaccine.dateTimeLabel')}</Text>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>
                    {new Intl.DateTimeFormat(language, { day: '2-digit', month: 'short', year: 'numeric' }).format(reminderVaccineDate instanceof Date ? reminderVaccineDate : new Date(reminderVaccineDate))}
                  </Text>
                </View>
              </View>

              <View style={styles.reminderActions}>
                <Button label={t('vaccine.createReminder')} onPress={onSave} loading={saving} />
                <Button label={t('common.back')} variant="ghost" onPress={() => setReminderStep('vaccine')} />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
