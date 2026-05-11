import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { EntryRecord } from '@/types';
import { shadow } from '@/lib/shadow';

const APP_ICON = require('../../../assets/branding/app-icon/babyflow-app-icon-192.png');

export const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.appleo.babytracker';

type Lang = 'fr' | 'es' | 'en' | 'nl';

interface ShareCardProps {
  entry: EntryRecord;
  babyName?: string;
  lang?: Lang;
}

function t(lang: Lang, key: string): string {
  const strings: Record<string, Record<Lang, string>> = {
    sharedFrom: { fr: 'Partagé depuis BabyFlow', es: 'Compartido desde BabyFlow', en: 'Shared from BabyFlow', nl: 'Gedeeld via BabyFlow' },
    findOn:     { fr: 'Trouver BabyFlow sur Google Play', es: 'Encuentra BabyFlow en Google Play', en: 'Find BabyFlow on Google Play', nl: 'Vind BabyFlow op Google Play' },
    feed:        { fr: 'Alimentation', es: 'Alimentación', en: 'Feeding', nl: 'Voeding' },
    bottle:      { fr: 'Biberon', es: 'Biberón', en: 'Bottle', nl: 'Fles' },
    breast:      { fr: 'Allaitement', es: 'Lactancia', en: 'Breastfeed', nl: 'Borstvoeding' },
    sleep:       { fr: 'Sommeil', es: 'Sueño', en: 'Sleep', nl: 'Slaap' },
    diaper:      { fr: 'Couche', es: 'Pañal', en: 'Diaper', nl: 'Luier' },
    pump:        { fr: 'Tirage', es: 'Extracción', en: 'Pump', nl: 'Kolven' },
    measurement: { fr: 'Mesures', es: 'Medidas', en: 'Measurements', nl: 'Metingen' },
    food:        { fr: 'Repas', es: 'Comida', en: 'Food', nl: 'Eten' },
    vaccine:     { fr: 'Vaccin', es: 'Vacuna', en: 'Vaccine', nl: 'Vaccin' },
    milestone:   { fr: 'Étape', es: 'Hito', en: 'Milestone', nl: 'Mijlpaal' },
    temperature: { fr: 'Température', es: 'Temperatura', en: 'Temperature', nl: 'Temperatuur' },
    medication:  { fr: 'Médicament', es: 'Medicamento', en: 'Medication', nl: 'Medicatie' },
    symptom:     { fr: 'Symptôme', es: 'Síntoma', en: 'Symptom', nl: 'Symptoom' },
    amount:      { fr: 'Quantité', es: 'Cantidad', en: 'Amount', nl: 'Hoeveelheid' },
    duration:    { fr: 'Durée', es: 'Duración', en: 'Duration', nl: 'Duur' },
    weight:      { fr: 'Poids', es: 'Peso', en: 'Weight', nl: 'Gewicht' },
    height:      { fr: 'Taille', es: 'Talla', en: 'Height', nl: 'Lengte' },
    notes:       { fr: 'Notes', es: 'Notas', en: 'Notes', nl: 'Notities' },
    at:          { fr: 'à', es: 'a las', en: 'at', nl: 'om' },
  };
  return strings[key]?.[lang] ?? strings[key]?.en ?? key;
}

interface TypeMeta {
  icon: string;
  color: string;
  bgColor: string;
}

function getTypeMeta(type: string): TypeMeta {
  const map: Record<string, TypeMeta> = {
    feed:        { icon: '🍼', color: '#2A9D8F', bgColor: '#E8F8F6' },
    sleep:       { icon: '😴', color: '#5E60CE', bgColor: '#EDECFB' },
    diaper:      { icon: '🩱', color: '#F4A261', bgColor: '#FEF3E8' },
    pump:        { icon: '🤱', color: '#E76F51', bgColor: '#FDEEE9' },
    measurement: { icon: '📏', color: '#2196F3', bgColor: '#E8F4FD' },
    food:        { icon: '🥣', color: '#81B29A', bgColor: '#EDF5F1' },
    vaccine:     { icon: '💉', color: '#9C27B0', bgColor: '#F3E5F5' },
    milestone:   { icon: '🌟', color: '#E6A800', bgColor: '#FFFCE8' },
    temperature: { icon: '🌡️', color: '#E63946', bgColor: '#FDEAEB' },
    medication:  { icon: '💊', color: '#457B9D', bgColor: '#EAF2F8' },
    symptom:     { icon: '🤒', color: '#C87941', bgColor: '#FEF9EC' },
  };
  return map[type] ?? { icon: '📔', color: '#2A9D8F', bgColor: '#E8F8F6' };
}

function formatDate(iso: string, lang: Lang): string {
  try {
    return new Date(iso).toLocaleDateString(
      lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : lang === 'nl' ? 'nl-NL' : 'en-GB',
      { day: 'numeric', month: 'long', year: 'numeric' },
    );
  } catch {
    return iso;
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatDuration(min?: number): string {
  if (!min) return '';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m}` : `${h}h`;
}

interface DetailLine {
  label: string;
  value: string;
  big?: boolean;
}

function buildDetails(entry: EntryRecord, lang: Lang): { subtitle: string; details: DetailLine[] } {
  const p = entry.payload ?? {};
  const details: DetailLine[] = [];
  let subtitle = '';

  switch (entry.type) {
    case 'feed':
      subtitle = p.mode === 'breast' ? t(lang, 'breast') : t(lang, 'bottle');
      if (p.amountMl) details.push({ label: t(lang, 'amount'), value: `${p.amountMl} ml`, big: true });
      if (p.durationMin) details.push({ label: t(lang, 'duration'), value: formatDuration(p.durationMin) });
      break;
    case 'sleep':
      if (p.durationMin) details.push({ label: t(lang, 'duration'), value: formatDuration(p.durationMin), big: true });
      break;
    case 'pump':
      if (p.amountMl) details.push({ label: t(lang, 'amount'), value: `${p.amountMl} ml`, big: true });
      if (p.durationMin) details.push({ label: t(lang, 'duration'), value: formatDuration(p.durationMin) });
      break;
    case 'measurement':
      if (p.weightKg) details.push({ label: t(lang, 'weight'), value: `${p.weightKg} kg`, big: true });
      if (p.heightCm) details.push({ label: t(lang, 'height'), value: `${p.heightCm} cm` });
      break;
    case 'temperature':
      if (p.tempC) details.push({ label: '°C', value: `${p.tempC}°C`, big: true });
      break;
    case 'food':
      subtitle = p.foodName ?? '';
      if (p.quantityGrams) details.push({ label: t(lang, 'amount'), value: `${p.quantityGrams} g` });
      break;
    case 'vaccine':
      subtitle = p.vaccineName ?? '';
      if (p.vaccineDose) details.push({ label: 'Dose', value: String(p.vaccineDose) });
      break;
    case 'medication':
      subtitle = p.name ?? '';
      if (p.dosage) details.push({ label: 'Dose', value: p.dosage });
      break;
    case 'milestone':
      subtitle = p.title ?? '';
      break;
    default:
      break;
  }

  if (entry.notes?.trim()) {
    details.push({ label: t(lang, 'notes'), value: entry.notes.trim() });
  }

  return { subtitle, details };
}

export function ShareCard({ entry, babyName, lang = 'fr' }: ShareCardProps) {
  const meta = getTypeMeta(entry.type);
  const { subtitle, details } = buildDetails(entry, lang);
  const bigDetail = details.find((d) => d.big);
  const otherDetails = details.filter((d) => !d.big);
  const typeLabel = t(lang, entry.type);
  const dateStr = formatDate(entry.occurredAt, lang);
  const timeStr = formatTime(entry.occurredAt);

  return (
    <View style={styles.card}>
      {/* Colored top section */}
      <View style={[styles.topSection, { backgroundColor: meta.color }]}>
        <View style={styles.topHeader}>
          <View style={styles.logoRow}>
            <Image source={APP_ICON} style={styles.logoIcon} />
            <Text style={styles.logoText}>BabyFlow</Text>
          </View>
          <Text style={styles.topDate}>{dateStr}</Text>
        </View>

        <View style={[styles.iconBubble, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
          <Text style={styles.typeIcon}>{meta.icon}</Text>
        </View>

        <Text style={styles.topTypeLabel}>{typeLabel.toUpperCase()}</Text>
        {subtitle ? <Text style={styles.topSubtitle}>{subtitle}</Text> : null}
        <Text style={styles.topMeta}>
          {babyName ? `${babyName} · ` : ''}{timeStr}
        </Text>
      </View>

      {/* White bottom section */}
      <View style={styles.bottomSection}>
        {bigDetail ? (
          <View style={styles.bigStatBlock}>
            <Text style={[styles.bigValue, { color: meta.color }]}>{bigDetail.value}</Text>
            <Text style={styles.bigLabel}>{bigDetail.label.toUpperCase()}</Text>
          </View>
        ) : (
          <View style={styles.bigStatBlock}>
            <Text style={[styles.bigValue, { color: meta.color, fontSize: 32, letterSpacing: -1 }]}>
              {subtitle || typeLabel}
            </Text>
          </View>
        )}

        {otherDetails.length > 0 && (
          <View style={styles.pillsRow}>
            {otherDetails.map((d, i) => (
              <View key={i} style={[styles.pill, { backgroundColor: meta.bgColor }]}>
                <Text style={styles.pillLabel}>{d.label}</Text>
                <Text style={[styles.pillValue, { color: meta.color }]}>{d.value}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Image source={APP_ICON} style={styles.footerIcon} />
            <Text style={[styles.footerBrand, { color: meta.color }]}>{t(lang, 'sharedFrom')}</Text>
          </View>
          <Text style={styles.footerUrl}>{GOOGLE_PLAY_URL}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 360,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    ...shadow('#000', 0.18, 32, 0, 8),
    elevation: 10,
  },
  topSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
    alignItems: 'center',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoIcon: { width: 26, height: 26, borderRadius: 6 },
  logoText: {
    fontSize: 18,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: -0.5,
  },
  topDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '500',
  },
  iconBubble: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  typeIcon: { fontSize: 52 },
  topTypeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 2.5,
    marginBottom: 6,
  },
  topSubtitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  topMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '500',
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  bigStatBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  bigValue: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -2,
    lineHeight: 62,
  },
  bigLabel: {
    fontSize: 11,
    color: '#AAAAAA',
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  pillLabel: {
    fontSize: 10,
    color: '#888888',
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  pillValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginBottom: 16,
  },
  footer: { gap: 3 },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerIcon: { width: 18, height: 18, borderRadius: 4 },
  footerBrand: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerUrl: {
    fontSize: 10,
    color: '#BBBBBB',
  },
});
