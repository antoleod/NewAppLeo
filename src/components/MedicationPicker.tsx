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
    gap: 14,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symptomChip: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symptomChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  noticeWrap: {
    gap: 4,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  notice: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  card: {
    width: '48%',
    minWidth: 148,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  cardMeta: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 16,
  },
  saveButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
