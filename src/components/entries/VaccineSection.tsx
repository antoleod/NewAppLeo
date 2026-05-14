import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DateTimeField, Input } from '@/components/shared';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocale } from '@/context/LocaleContext';
import { typeMeta, vaccinePresets } from '@/lib/entryComposer';

type Props = {
  vaccineName: string;
  setVaccineName: (v: string) => void;
  vaccineDose: string;
  setVaccineDose: (v: string) => void;
  vaccineNextDueDate: Date;
  setVaccineNextDueDate: (d: Date) => void;
  onOpenReminder: () => void;
};

export const VaccineSection = React.memo(function VaccineSection({
  vaccineName, setVaccineName,
  vaccineDose, setVaccineDose,
  vaccineNextDueDate, setVaccineNextDueDate,
  onOpenReminder,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { language } = useLocale();
  const meta = typeMeta.vaccine;

  const dose = Number(vaccineDose) || 1;
  const stepDose = (delta: number) => setVaccineDose(String(Math.max(1, Math.min(5, dose + delta))));

  const chooseLabel = language === 'fr' ? 'Choisir un vaccin:' : language === 'es' ? 'Elige una vacuna:' : language === 'nl' ? 'Kies een vaccin:' : 'Choose a vaccine:';
  const nameLabel = language === 'fr' ? 'Nom du vaccin' : language === 'es' ? 'Nombre de la vacuna' : language === 'nl' ? 'Naam van het vaccin' : 'Vaccine name';
  const namePlaceholder = language === 'fr' ? 'Entrez le nom...' : language === 'es' ? 'Introduce el nombre...' : language === 'nl' ? 'Voer naam in...' : 'Enter name...';
  const doseLabel = language === 'fr' ? 'Numéro de dose' : language === 'es' ? 'Número de dosis' : language === 'nl' ? 'Dosisnummer' : 'Dose number';
  const dosePrefix = language === 'fr' ? 'Dose ' : 'Dose ';
  const nextLabel = language === 'fr' ? 'Prochaine dose' : language === 'es' ? 'Próxima dosis' : language === 'nl' ? 'Volgende dosis' : 'Next dose scheduled';
  const nextHint = language === 'fr' ? 'Date prévue pour la prochaine dose' : language === 'es' ? 'Fecha prevista para la próxima dosis' : language === 'nl' ? 'Datum voor de volgende dosis' : 'When is the next dose scheduled';
  const reminderLabel = language === 'fr' ? 'Ajouter un rappel pour plus tard' : language === 'es' ? 'Añadir recordatorio para luego' : language === 'nl' ? 'Herinnering toevoegen' : 'Add reminder for later';

  return (
    <View style={styles.sectionCard}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {language === 'fr' ? 'Vaccin' : language === 'es' ? 'Vacuna' : language === 'nl' ? 'Vaccin' : 'Vaccine'}
      </Text>

      <Text style={[styles.sectionBody, { color: colors.muted, marginBottom: 10 }]}>{chooseLabel}</Text>
      <View style={styles.presetsGrid}>
        {vaccinePresets.map((preset) => {
          const selected = vaccineName === preset;
          return (
            <Pressable
              key={preset}
              onPress={() => setVaccineName(preset)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={preset}
              style={[
                styles.presetBtn,
                { borderColor: colors.border, backgroundColor: colors.card },
                selected && { backgroundColor: meta.toneSoft, borderColor: meta.tone },
              ]}
            >
              <Text
                style={[
                  styles.presetText,
                  { color: colors.text },
                  selected && { color: meta.tone, fontWeight: '900' },
                ]}
              >
                {preset}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setVaccineName('')}
          accessibilityRole="button"
          accessibilityLabel={namePlaceholder}
          style={[styles.presetBtn, styles.addBtn, { borderColor: meta.tone }]}
        >
          <Text style={[styles.presetText, { color: meta.tone, fontSize: 20 }]}>+</Text>
        </Pressable>
      </View>

      {vaccineName === '' && (
        <>
          <Text style={[styles.sectionBody, { color: colors.muted, marginBottom: 10, marginTop: 12 }]}>{nameLabel}</Text>
          <Input label="" value={vaccineName} onChangeText={setVaccineName} placeholder={namePlaceholder} />
        </>
      )}

      {vaccineName ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>{doseLabel}</Text>
          <View style={styles.doseRow}>
            <Pressable
              onPress={() => stepDose(-1)}
              accessibilityRole="button"
              accessibilityLabel="−"
              style={[styles.doseBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <Text style={[styles.doseBtnText, { color: colors.text }]}>−</Text>
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[styles.doseDisplay, { color: meta.tone }]}>{dosePrefix}{dose}</Text>
            </View>
            <Pressable
              onPress={() => stepDose(+1)}
              accessibilityRole="button"
              accessibilityLabel="+"
              style={[styles.doseBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <Text style={[styles.doseBtnText, { color: colors.text }]}>+</Text>
            </Pressable>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>{nextLabel}</Text>
          <Text style={[styles.sectionBody, { color: colors.muted, marginBottom: 8 }]}>{nextHint}</Text>
          <DateTimeField label={t('entry.when')} value={vaccineNextDueDate} onChange={setVaccineNextDueDate} />
        </>
      ) : null}

      <Pressable
        onPress={onOpenReminder}
        accessibilityRole="button"
        accessibilityLabel={reminderLabel}
        style={[
          styles.reminderToggle,
          { borderColor: meta.tone, backgroundColor: meta.toneSoft },
        ]}
      >
        <Text style={[styles.reminderCheckbox, { color: meta.tone }]}>+</Text>
        <Text style={[styles.reminderLabel, { color: meta.tone }]}>{reminderLabel}</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  sectionCard: { borderRadius: 14, padding: 14, gap: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  sectionBody: { fontSize: 12 },
  presetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: {
    minHeight: 44, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  presetText: { fontSize: 13, fontWeight: '700' },
  addBtn: { paddingHorizontal: 16, borderStyle: 'dashed' },
  doseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  doseBtn: {
    width: 44, height: 44, borderRadius: 12,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  doseBtnText: { fontSize: 22, fontWeight: '900' },
  doseDisplay: { fontSize: 18, fontWeight: '800' },
  reminderToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1,
    marginTop: 12,
  },
  reminderCheckbox: { fontSize: 16, fontWeight: '900' },
  reminderLabel: { fontSize: 13, fontWeight: '700' },
});
