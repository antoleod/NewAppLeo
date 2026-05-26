import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Input } from '@/components/shared';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { useTranslation } from '@/hooks/useTranslation';
import { typeMeta } from '@/lib/entryComposer';
import { upsertSavedMedicine, type SavedMedicine } from '@/lib/storage';
import commonMedications from '@/data/common-medications.json';

type Props = {
  typeLabel: string;
  name: string;
  setName: (v: string) => void;
  dosage: string;
  setDosage: (v: string) => void;
  medIntervalHours: string;
  setMedIntervalHours: (v: string) => void;
  savedMedicines: SavedMedicine[];
  setSavedMedicines: (next: SavedMedicine[]) => void;
  occurredAt: Date;
};

export const MedicationSection = React.memo(function MedicationSection({
  typeLabel,
  name, setName,
  dosage, setDosage,
  medIntervalHours, setMedIntervalHours,
  savedMedicines, setSavedMedicines,
  occurredAt,
}: Props) {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const { language } = useLocale();
  const { entries } = useAppData();
  const { profile, saveProfile } = useAuth();
  const meta = typeMeta.medication;

  const getRecommendedDose = useCallback((medName: string): string => {
    const med = (commonMedications as any[]).find(
      (item) => item.name.toLowerCase() === medName.trim().toLowerCase(),
    );
    if (!med) return '';
    const kg = Number(profile?.currentWeightKg ?? 0);
    if (Number.isFinite(kg) && kg > 0 && Array.isArray(med.dosingByKg)) {
      const byKg = med.dosingByKg.find((row: any) => kg <= Number(row.maxKg));
      if (byKg?.dosage) return byKg.dosage as string;
    }
    return med.defaultDosage ?? '';
  }, [profile?.currentWeightKg]);

  const recentMedicationEntries = useMemo(
    () => entries.filter((e) => e.type === 'medication' && typeof e.payload?.name === 'string').slice(0, 5),
    [entries],
  );

  const medStatus = useMemo(() => {
    const currentName = name.trim().toLowerCase();
    if (!currentName) {
      return {
        label: 'OK',
        text: language === 'fr' ? 'Choisissez un médicament pour voir le statut.' : 'Select a medicine to see status.',
        color: theme.green,
      };
    }
    const lastSame = entries.find((e) => e.type === 'medication' && (e.payload?.name ?? '').trim().toLowerCase() === currentName);
    if (!lastSame) {
      return { label: 'DUE', text: language === 'fr' ? 'Aucune dose récente trouvée.' : 'No recent dose found.', color: theme.red };
    }
    const intervalHours = Number(medIntervalHours) || 6;
    const hoursSince = (Date.now() - new Date(lastSame.occurredAt).getTime()) / 36e5;
    if (hoursSince >= intervalHours) {
      return { label: 'DUE', text: language === 'fr' ? 'Prochaine dose recommandée maintenant.' : 'Next dose recommended now.', color: theme.red };
    }
    if (hoursSince >= Math.max(1, intervalHours - 2)) {
      return { label: 'SOON', text: language === 'fr' ? 'Dose bientôt possible.' : 'Dose will be due soon.', color: theme.yellow };
    }
    return { label: 'OK', text: language === 'fr' ? 'Fenêtre de sécurité active.' : 'Safe interval active.', color: theme.green };
  }, [entries, language, medIntervalHours, name, theme]);

  const nextDosePreview = useMemo(() => {
    if (!name.trim()) return '';
    const interval = Number(medIntervalHours) || 6;
    const lastSame = entries.find((e) => e.type === 'medication' && (e.payload?.name ?? '').trim().toLowerCase() === name.trim().toLowerCase());
    const baseTime = lastSame ? new Date(lastSame.occurredAt).getTime() : occurredAt.getTime();
    const nextAt = new Date(baseTime + interval * 60 * 60 * 1000);
    const locale = language === 'fr' ? 'fr-FR' : 'en-US';
    return `${nextAt.toLocaleDateString(locale)} ${nextAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;
  }, [entries, language, medIntervalHours, name, occurredAt]);

  const normalized = name.trim().toLowerCase();
  const existingSavedMedicine = useMemo(
    () => savedMedicines.find((item) => item.name.trim().toLowerCase() === normalized),
    [normalized, savedMedicines],
  );

  const isMedicationDirty = useMemo(() => {
    if (!existingSavedMedicine) return Boolean(name.trim());
    return (existingSavedMedicine.dosage ?? '').trim() !== dosage.trim();
  }, [dosage, existingSavedMedicine, name]);

  const medicationSuggestions = useMemo(() => {
    const query = name.trim().toLowerCase();
    if (!query) return [] as { name: string; dosage?: string }[];
    const fromSaved = savedMedicines.map((m) => ({ name: m.name, dosage: m.dosage }));
    const fromCommon = (commonMedications as any[]).map((m) => ({
      name: String(m.name),
      dosage: (getRecommendedDose(String(m.name)) || m.defaultDosage || '') as string,
    }));
    const merged = [...fromSaved, ...fromCommon].filter(
      (item, idx, arr) => arr.findIndex((x) => x.name.toLowerCase() === item.name.toLowerCase()) === idx,
    );
    return merged
      .filter((item) => item.name.toLowerCase().includes(query))
      .filter((item) => item.name.toLowerCase() !== query)
      .slice(0, 6);
  }, [name, savedMedicines, getRecommendedDose]);

  const manualLabel =
    language === 'fr' ? 'Ajouter manuellement'
      : language === 'es' ? 'Agregar manualmente'
      : language === 'nl' ? 'Handmatig toevoegen'
      : 'Add manually';

  const savePresetLabel = !existingSavedMedicine
    ? (language === 'fr' ? 'Ajouter ce médicament' : language === 'es' ? 'Añadir este medicamento' : language === 'nl' ? 'Dit medicijn toevoegen' : 'Add this medicine')
    : isMedicationDirty
      ? (language === 'fr' ? 'Mettre à jour la dose' : language === 'es' ? 'Actualizar dosis' : language === 'nl' ? 'Dosering bijwerken' : 'Update dosage')
      : (language === 'fr' ? 'Déjà enregistré' : language === 'es' ? 'Ya guardado' : language === 'nl' ? 'Reeds opgeslagen' : 'Already saved');

  const handleSavePreset = async () => {
    const next = await upsertSavedMedicine({ name, dosage });
    setSavedMedicines(next);
    const profileList = profile?.customMedicines ?? [];
    const now = new Date().toISOString();
    const merged = [
      { name: name.trim(), dosage: dosage.trim() || undefined, updatedAt: now },
      ...profileList.filter((item) => item.name.toLowerCase() !== name.trim().toLowerCase()),
    ].slice(0, 24);
    await saveProfile({ customMedicines: merged });
  };

  return (
    <View style={styles.sectionCard}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{typeLabel}</Text>
      <View style={styles.medQuickRow}>
        {(commonMedications as any[]).map((med) => (
          <Pressable
            key={med.name}
            onPress={() => {
              setName(med.name);
              setDosage(getRecommendedDose(med.name) || med.defaultDosage || '');
            }}
            accessibilityRole="button"
            accessibilityLabel={med.name}
            style={[styles.medQuickBtn, { borderColor: meta.tone, backgroundColor: colors.card }]}
          >
            <Text style={[styles.medQuickTitle, { color: colors.text }]}>{med.name}</Text>
            <Text style={[styles.medQuickSub, { color: colors.muted }]}>
              {getRecommendedDose(med.name) || med.defaultDosage || ''}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={() => { setName(''); setDosage(''); }}
        accessibilityRole="button"
        accessibilityLabel={manualLabel}
        style={[styles.medManualBtn, { borderColor: meta.tone, backgroundColor: colors.background }]}
      >
        <Text style={[styles.medManualText, { color: meta.tone }]}>{manualLabel}</Text>
      </Pressable>

      {savedMedicines.length > 0 ? (
        <View style={styles.savedWrap}>
          <View style={styles.savedRow}>
            {savedMedicines.slice(0, 4).map((med) => (
              <Pressable
                key={`${med.name}-${med.dosage}`}
                onPress={() => {
                  setName(med.name);
                  if (med.dosage) setDosage(med.dosage);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${med.name} ${med.dosage ?? ''}`}
                style={[
                  styles.savedChip,
                  { borderColor: colors.border, backgroundColor: colors.card },
                  name === med.name && { borderColor: meta.tone },
                ]}
              >
                <Text style={[styles.savedChipTitle, { color: colors.text }]}>{med.name}</Text>
                {med.dosage ? <Text style={[styles.savedChipSubtitle, { color: colors.muted }]}>{med.dosage}</Text> : null}
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {name.trim() ? (
        <Pressable
          onPress={() => void handleSavePreset()}
          accessibilityRole="button"
          accessibilityLabel={savePresetLabel}
          style={[styles.savePresetButton, { marginTop: 8 }]}
        >
          <Text style={styles.savePresetText}>{savePresetLabel}</Text>
        </Pressable>
      ) : null}

      <Input label={t('entry.medicationName')} value={name} onChangeText={setName} />

      {medicationSuggestions.length > 0 ? (
        <View style={[styles.savedWrap, { marginTop: 6 }]}>
          <View style={styles.savedRow}>
            {medicationSuggestions.map((med) => (
              <Pressable
                key={`suggest-${med.name}`}
                onPress={() => {
                  setName(med.name);
                  if (med.dosage) setDosage(med.dosage);
                }}
                style={[styles.savedChip, { borderColor: colors.border, backgroundColor: colors.card }]}
              >
                <Text style={[styles.savedChipTitle, { color: colors.text }]}>{med.name}</Text>
                {med.dosage ? <Text style={[styles.savedChipSubtitle, { color: colors.muted }]}>{med.dosage}</Text> : null}
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Input label={t('entry.dosage')} value={dosage} onChangeText={setDosage} />

      <View style={styles.medIntervalHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {language === 'fr' ? 'Intervalle recommandé' : language === 'es' ? 'Intervalo recomendado' : language === 'nl' ? 'Aanbevolen interval' : 'Recommended interval'}
        </Text>
        {name.trim() ? <Text style={[styles.medStatusLabel, { color: medStatus.color }]}>{medStatus.label}</Text> : null}
      </View>
      <View style={styles.medIntervalRow}>
        {['4', '6', '8'].map((value) => {
          const active = medIntervalHours === value;
          return (
            <Pressable
              key={value}
              onPress={() => setMedIntervalHours(value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${value} h`}
              style={[
                styles.medIntervalBtn,
                { borderColor: colors.border, backgroundColor: colors.card },
                active && { borderColor: meta.tone, backgroundColor: meta.toneSoft },
              ]}
            >
              <Text style={[styles.medIntervalText, { color: colors.text }, active && { color: meta.tone }]}>{value}h</Text>
            </Pressable>
          );
        })}
      </View>

      {name.trim() ? (
        <Text style={[styles.medNextDoseText, { color: colors.muted }]}>
          {language === 'fr' ? 'Prochaine dose:' : language === 'es' ? 'Próxima dosis:' : language === 'nl' ? 'Volgende dosis:' : 'Next dose:'} {nextDosePreview}
        </Text>
      ) : null}

      <Text style={[styles.medStatusText, { color: colors.text }]}>
        {name.trim()
          ? medStatus.text
          : language === 'fr' ? 'Choisissez ou ajoutez un médicament pour voir le statut.'
            : language === 'es' ? 'Elige o añade un medicamento para ver el estado.'
            : language === 'nl' ? 'Kies of voeg een medicijn toe.'
            : 'Choose or add a medicine to see status.'}
      </Text>

      <View style={styles.medTimelineWrap}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {language === 'fr' ? 'Doses récentes' : language === 'es' ? 'Dosis recientes' : language === 'nl' ? 'Recente doses' : 'Recent doses'}
        </Text>
        {recentMedicationEntries.length === 0 ? (
          <Text style={[styles.medTimelineEmpty, { color: colors.muted }]}>
            {language === 'fr' ? "Aucune dose enregistrée aujourd'hui." : language === 'es' ? 'Sin dosis hoy.' : language === 'nl' ? 'Nog geen doses vandaag.' : 'No medication logged yet.'}
          </Text>
        ) : (
          recentMedicationEntries.map((entry) => (
            <View key={entry.id} style={styles.medTimelineItem}>
              <View style={[styles.medTimelineDot, { backgroundColor: meta.tone }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.medTimelineName, { color: colors.text }]}>{entry.payload?.name}</Text>
                <Text style={[styles.medTimelineMeta, { color: colors.muted }]}>
                  {(entry.payload?.dosage || '').trim() || '—'} ·{' '}
                  {new Date(entry.occurredAt).toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  sectionCard: { borderRadius: 14, padding: 14, gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  medQuickRow: { flexDirection: 'row', gap: 8 },
  medQuickBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  medQuickTitle: { fontSize: 12, fontWeight: '700' },
  medQuickSub: { fontSize: 11, marginTop: 2 },
  medManualBtn: { marginTop: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  medManualText: { fontSize: 12, fontWeight: '700' },
  savedWrap: { gap: 8, marginBottom: 4 },
  savedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  savedChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  savedChipTitle: { fontSize: 12, fontWeight: '700' },
  savedChipSubtitle: { fontSize: 10, marginTop: 1 },
  savePresetButton: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#22C55E22', borderWidth: 1, borderColor: '#22C55E55',
    alignItems: 'center', justifyContent: 'center',
  },
  savePresetText: { color: '#22C55E', fontWeight: '800', fontSize: 12 },
  medIntervalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  medIntervalRow: { flexDirection: 'row', gap: 8 },
  medIntervalBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  medIntervalText: { fontSize: 12, fontWeight: '700' },
  medStatusLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  medStatusText: { fontSize: 12 },
  medNextDoseText: { fontSize: 12, fontWeight: '600' },
  medTimelineWrap: { marginTop: 12, gap: 8 },
  medTimelineEmpty: { fontSize: 12 },
  medTimelineItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  medTimelineDot: { width: 8, height: 8, borderRadius: 999, marginTop: 6 },
  medTimelineName: { fontSize: 12, fontWeight: '700' },
  medTimelineMeta: { fontSize: 11 },
});
