import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Input } from '@/components/ui';
import { DateTimeField } from '@/components/DateTimeField';

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
}: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.reminderModalOverlay}>
        <View style={styles.reminderModalContent}>
          {reminderStep === 'vaccine' && (
            <>
              <View style={styles.reminderModalHeader}>
                <Text style={styles.reminderModalTitle}>{language === 'fr' ? 'Rappel de vaccin' : 'Vaccine Reminder'}</Text>
                <Text style={[styles.reminderModalSubtitle, { color: colors.muted }]}>
                  {language === 'fr' ? '1/2 - Choisir le vaccin' : '1/2 - Choose vaccine'}
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
                  {language === 'fr' ? 'Ou saisir un autre nom:' : 'Or enter another name:'}
                </Text>
                <Input label="" value={reminderVaccineName} onChangeText={setReminderVaccineName} placeholder={language === 'fr' ? 'Nom du vaccin...' : 'Vaccine name...'} />
              </View>

              <View style={styles.reminderActions}>
                <Button label={language === 'fr' ? 'Continuer' : 'Continue'} onPress={() => setReminderStep('date')} disabled={!reminderVaccineName.trim()} />
                <Button label={language === 'fr' ? 'Annuler' : 'Cancel'} variant="ghost" onPress={onClose} />
              </View>
            </>
          )}

          {reminderStep === 'date' && (
            <>
              <View style={styles.reminderModalHeader}>
                <Text style={styles.reminderModalTitle}>{language === 'fr' ? 'Rappel de vaccin' : 'Vaccine Reminder'}</Text>
                <Text style={[styles.reminderModalSubtitle, { color: colors.muted }]}>
                  {language === 'fr' ? '2/2 - Choisir la date' : '2/2 - Choose date'}
                </Text>
              </View>

              <View style={styles.reminderDateSection}>
                <Text style={[styles.reminderLabel, { color: colors.muted, marginBottom: 12 }]}>
                  {language === 'fr' ? 'Quand sera la prochaine dose?' : 'When will the next dose be?'}
                </Text>
                <DateTimeField label={language === 'fr' ? 'Date et heure' : 'Date and time'} value={reminderVaccineDate} onChange={setReminderVaccineDate} />
              </View>

              <View style={styles.reminderSummary}>
                <Text style={[styles.reminderSummaryTitle, { color: colors.text }]}>
                  {language === 'fr' ? 'Récapitulatif' : 'Summary'}
                </Text>
                <View style={styles.reminderSummaryItem}>
                  <Text style={{ color: colors.muted }}>{language === 'fr' ? 'Vaccin:' : 'Vaccine:'}</Text>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{reminderVaccineName}</Text>
                </View>
              </View>

              <View style={styles.reminderActions}>
                <Button label={language === 'fr' ? 'Créer le rappel' : 'Create reminder'} onPress={onSave} loading={saving} />
                <Button label={language === 'fr' ? 'Retour' : 'Back'} variant="ghost" onPress={() => setReminderStep('vaccine')} />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  reminderModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  reminderModalContent: { backgroundColor: '#0D1117', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 40, maxHeight: '85%' },
  reminderModalHeader: { marginBottom: 24 },
  reminderModalTitle: { color: '#F0F6FC', fontSize: 20, fontWeight: '900', marginBottom: 4 },
  reminderModalSubtitle: { fontSize: 12, fontWeight: '600' },
  reminderModalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  reminderPresetBtn: { flex: 1, minWidth: '31%', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: '#21262D', backgroundColor: '#1C2128', alignItems: 'center' },
  reminderPresetText: { color: '#F0F6FC', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  reminderCustomSection: { marginBottom: 20 },
  reminderLabel: { fontSize: 12, marginBottom: 8, fontWeight: '600' },
  reminderDateSection: { marginBottom: 20 },
  reminderSummary: { backgroundColor: 'rgba(201, 162, 39, 0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(201, 162, 39, 0.3)', paddingHorizontal: 12, paddingVertical: 12, marginBottom: 20, gap: 10 },
  reminderSummaryTitle: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  reminderSummaryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reminderActions: { gap: 8 },
});
