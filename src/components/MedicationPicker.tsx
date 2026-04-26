import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Input } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { MedicationPreset, SavedMedicine } from '@/lib/storage';

interface MedicationPickerProps {
  search: string;
  onSearchChange: (value: string) => void;
  name: string;
  dosage: string;
  onNameChange: (value: string) => void;
  onDosageChange: (value: string) => void;
  onSelectSymptom: (value: string) => void;
  selectedSymptoms: string[];
  symptomOptions: Array<{ label: string; value: string }>;
  mostUsed: SavedMedicine[];
  recommendedSaved: SavedMedicine[];
  recommendedPresets: MedicationPreset[];
  savedByYou: SavedMedicine[];
  filteredPresets: MedicationPreset[];
  onSelectMedicine: (medicine: {
    name: string;
    dosage?: string;
    symptomTags?: string[];
    commonFor?: string[];
    minAgeMonths?: number | null;
    notes?: string;
    isCustom?: boolean;
  }) => void;
  onSavePreset: () => void | Promise<void>;
  showSavePreset: boolean;
  copy: {
    searchLabel: string;
    searchPlaceholder: string;
    medicationName: string;
    dosage: string;
    symptomChips: string;
    mostUsed: string;
    recommended: string;
    savedByYou: string;
    allPresets: string;
    noSavedMedicine: string;
    savePreset: string;
    supportOnly: string;
    checkLabel: string;
    consultDoctor: string;
  };
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{title}</Text>
      {children}
    </View>
  );
}

function SymptomChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.symptomChip,
        {
          borderColor: selected ? theme.accent : theme.border,
          backgroundColor: selected ? `${theme.accent}22` : theme.bgCardAlt,
        },
      ]}
    >
      <Text style={[styles.symptomChipText, { color: selected ? theme.accent : theme.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

function MedicationCard({
  title,
  subtitle,
  meta,
  onPress,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.card, { borderColor: theme.border, backgroundColor: theme.bgCardAlt }]}>
      <Text style={[styles.cardTitle, { color: theme.textPrimary }]} numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.cardSubtitle, { color: theme.textMuted }]} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
      {meta ? (
        <Text style={[styles.cardMeta, { color: theme.accent }]} numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function MedicationPicker(props: MedicationPickerProps) {
  const {
    search,
    onSearchChange,
    name,
    dosage,
    onNameChange,
    onDosageChange,
    onSelectSymptom,
    selectedSymptoms,
    symptomOptions,
    mostUsed,
    recommendedSaved,
    recommendedPresets,
    savedByYou,
    filteredPresets,
    onSelectMedicine,
    onSavePreset,
    showSavePreset,
    copy,
  } = props;
  const { theme } = useTheme();

  const renderMedicineCard = (
    medicine: {
      name: string;
      dosage?: string;
      symptomTags?: string[];
      commonFor?: string[];
      minAgeMonths?: number | null;
      notes?: string;
      useCount?: number;
      isCustom?: boolean;
    },
    key: string,
  ) => (
    <MedicationCard
      key={key}
      title={medicine.name}
      subtitle={medicine.dosage || medicine.notes}
      meta={
        medicine.useCount
          ? `${medicine.useCount} uses`
          : medicine.commonFor?.length
            ? medicine.commonFor.join(' · ')
            : medicine.symptomTags?.length
              ? medicine.symptomTags.join(' · ')
              : undefined
      }
      onPress={() => onSelectMedicine(medicine)}
    />
  );

  return (
    <View style={styles.root}>
      <Input label={copy.searchLabel} value={search} onChangeText={onSearchChange} placeholder={copy.searchPlaceholder} />

      <Section title={copy.symptomChips}>
        <View style={styles.grid}>
          {symptomOptions.map((symptom) => (
            <SymptomChip
              key={symptom.value}
              label={symptom.label}
              selected={selectedSymptoms.includes(symptom.value)}
              onPress={() => onSelectSymptom(symptom.value)}
            />
          ))}
        </View>
      </Section>

      <View style={styles.noticeWrap}>
        <Text style={[styles.notice, { color: theme.textPrimary }]}>{copy.supportOnly}</Text>
        <Text style={[styles.notice, { color: theme.textMuted }]}>{copy.checkLabel}</Text>
        <Text style={[styles.notice, { color: theme.textMuted }]}>{copy.consultDoctor}</Text>
      </View>

      <Section title={copy.mostUsed}>
        <View style={styles.grid}>
          {mostUsed.length ? mostUsed.map((medicine) => renderMedicineCard(medicine, `most-${medicine.name}`)) : <Text style={[styles.emptyText, { color: theme.textMuted }]}>{copy.noSavedMedicine}</Text>}
        </View>
      </Section>

      <Section title={copy.recommended}>
        <View style={styles.grid}>
          {recommendedSaved.map((medicine) => renderMedicineCard(medicine, `saved-${medicine.name}`))}
          {recommendedPresets.map((preset) => renderMedicineCard(preset, `preset-${preset.id}`))}
          {!recommendedSaved.length && !recommendedPresets.length ? <Text style={[styles.emptyText, { color: theme.textMuted }]}>{copy.noSavedMedicine}</Text> : null}
        </View>
      </Section>

      <Section title={copy.savedByYou}>
        <View style={styles.grid}>
          {savedByYou.length ? savedByYou.map((medicine) => renderMedicineCard(medicine, `library-${medicine.name}`)) : <Text style={[styles.emptyText, { color: theme.textMuted }]}>{copy.noSavedMedicine}</Text>}
        </View>
      </Section>

      <Input label={copy.medicationName} value={name} onChangeText={onNameChange} />
      <Input label={copy.dosage} value={dosage} onChangeText={onDosageChange} />

      {showSavePreset ? (
        <Pressable onPress={onSavePreset} style={[styles.saveButton, { borderColor: theme.accent, backgroundColor: `${theme.accent}14` }]}>
          <Text style={[styles.saveButtonText, { color: theme.accent }]}>{copy.savePreset}</Text>
        </Pressable>
      ) : null}

      <Section title={copy.allPresets}>
        <View style={styles.grid}>
          {filteredPresets.map((preset) => renderMedicineCard(preset, `all-${preset.id}`))}
        </View>
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 18,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  symptomChip: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symptomChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  noticeWrap: {
    gap: 6,
    padding: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  notice: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  card: {
    width: '47%',
    minWidth: 148,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.02)',
    elevation: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  cardMeta: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  saveButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
