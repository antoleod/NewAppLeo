import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EntryRecord } from '@/types';
import { shadow } from '@/lib/shadow';

// ─── Constante configurable para Google Play ─────────────────────────────────
export const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.appleo.baby';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Lang = 'fr' | 'es' | 'en' | 'nl';

interface ShareCardProps {
  entry: EntryRecord;
  babyName?: string;
  lang?: Lang;
}

// ─── Helpers de localización ──────────────────────────────────────────────────

function t(lang: Lang, key: string): string {
  const strings: Record<string, Record<Lang, string>> = {
    sharedFrom: { fr: 'Partagé depuis Leo', es: 'Compartido desde Leo', en: 'Shared from Leo', nl: 'Gedeeld via Leo' },
    findOn: { fr: 'Trouver Leo sur Google Play', es: 'Encuentra Leo en Google Play', en: 'Find Leo on Google Play', nl: 'Vind Leo op Google Play' },
    feed: { fr: 'Alimentation', es: 'Alimentación', en: 'Feeding', nl: 'Voeding' },
    bottle: { fr: 'Biberón', es: 'Biberón', en: 'Bottle', nl: 'Fles' },
    breast: { fr: 'Allaitement', es: 'Lactancia', en: 'Breastfeed', nl: 'Borstvoeding' },
    sleep: { fr: 'Sommeil', es: 'Sueño', en: 'Sleep', nl: 'Slaap' },
    diaper: { fr: 'Couche', es: 'Pañal', en: 'Diaper', nl: 'Luier' },
    pump: { fr: 'Tirage', es: 'Extracción', en: 'Pump', nl: 'Kolven' },
    measurement: { fr: 'Mesures', es: 'Medidas', en: 'Measurements', nl: 'Metingen' },
    food: { fr: 'Repas', es: 'Comida', en: 'Food', nl: 'Eten' },
    vaccine: { fr: 'Vaccin', es: 'Vacuna', en: 'Vaccine', nl: 'Vaccin' },
    milestone: { fr: 'Étape', es: 'Hito', en: 'Milestone', nl: 'Mijlpaal' },
    temperature: { fr: 'Température', es: 'Temperatura', en: 'Temperature', nl: 'Temperatuur' },
    medication: { fr: 'Médicament', es: 'Medicamento', en: 'Medication', nl: 'Medicatie' },
    symptom: { fr: 'Symptôme', es: 'Síntoma', en: 'Symptom', nl: 'Symptoom' },
    amount: { fr: 'Quantité', es: 'Cantidad', en: 'Amount', nl: 'Hoeveelheid' },
    duration: { fr: 'Durée', es: 'Duración', en: 'Duration', nl: 'Duur' },
    weight: { fr: 'Poids', es: 'Peso', en: 'Weight', nl: 'Gewicht' },
    height: { fr: 'Taille', es: 'Talla', en: 'Height', nl: 'Lengte' },
    notes: { fr: 'Notes', es: 'Notas', en: 'Notes', nl: 'Notities' },
    at: { fr: 'à', es: 'a las', en: 'at', nl: 'om' },
  };
  return strings[key]?.[lang] ?? strings[key]?.en ?? key;
}

// ─── Metadata por tipo de registro ───────────────────────────────────────────

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
    milestone:   { icon: '🌟', color: '#F9C74F', bgColor: '#FFFCE8' },
    temperature: { icon: '🌡️', color: '#E63946', bgColor: '#FDEAEB' },
    medication:  { icon: '💊', color: '#457B9D', bgColor: '#EAF2F8' },
    symptom:     { icon: '🤒', color: '#E9C46A', bgColor: '#FEF9EC' },
  };
  return map[type] ?? { icon: '📔', color: '#2A9D8F', bgColor: '#E8F8F6' };
}

// ─── Formatear la fecha ───────────────────────────────────────────────────────

function formatDate(iso: string, lang: Lang): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : lang === 'nl' ? 'nl-NL' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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

// ─── Construir las líneas de detalle ─────────────────────────────────────────

interface DetailLine {
  label: string;
  value: string;
  big?: boolean; // dato principal destacado
}

function buildDetails(entry: EntryRecord, lang: Lang): { subtitle: string; details: DetailLine[] } {
  const p = entry.payload ?? {};
  const details: DetailLine[] = [];
  let subtitle = '';

  switch (entry.type) {
    case 'feed': {
      subtitle = p.mode === 'breast' ? t(lang, 'breast') : t(lang, 'bottle');
      if (p.amountMl) details.push({ label: t(lang, 'amount'), value: `${p.amountMl} ml`, big: true });
      if (p.durationMin) details.push({ label: t(lang, 'duration'), value: formatDuration(p.durationMin) });
      break;
    }
    case 'sleep': {
      subtitle = '';
      if (p.durationMin) details.push({ label: t(lang, 'duration'), value: formatDuration(p.durationMin), big: true });
      break;
    }
    case 'pump': {
      if (p.amountMl) details.push({ label: t(lang, 'amount'), value: `${p.amountMl} ml`, big: true });
      if (p.durationMin) details.push({ label: t(lang, 'duration'), value: formatDuration(p.durationMin) });
      break;
    }
    case 'measurement': {
      if (p.weightKg) details.push({ label: t(lang, 'weight'), value: `${p.weightKg} kg`, big: true });
      if (p.heightCm) details.push({ label: t(lang, 'height'), value: `${p.heightCm} cm` });
      break;
    }
    case 'temperature': {
      if (p.tempC) details.push({ label: '°C', value: `${p.tempC}°C`, big: true });
      break;
    }
    case 'food': {
      subtitle = p.foodName ?? '';
      if (p.quantityGrams) details.push({ label: t(lang, 'amount'), value: `${p.quantityGrams} g` });
      break;
    }
    case 'vaccine': {
      subtitle = p.vaccineName ?? '';
      if (p.vaccineDose) details.push({ label: 'Dose', value: String(p.vaccineDose) });
      break;
    }
    case 'medication': {
      subtitle = p.name ?? '';
      if (p.dosage) details.push({ label: 'Dose', value: p.dosage });
      break;
    }
    case 'milestone': {
      subtitle = p.title ?? '';
      break;
    }
    default:
      break;
  }

  if (entry.notes?.trim()) {
    details.push({ label: t(lang, 'notes'), value: entry.notes.trim() });
  }

  return { subtitle, details };
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ShareCard({ entry, babyName, lang = 'fr' }: ShareCardProps) {
  const meta = getTypeMeta(entry.type);
  const { subtitle, details } = buildDetails(entry, lang);
  const bigDetail = details.find((d) => d.big);
  const otherDetails = details.filter((d) => !d.big);
  const typeLabel = t(lang, entry.type);
  const dateStr = formatDate(entry.occurredAt, lang);
  const timeStr = formatTime(entry.occurredAt);

  return (
    <View style={[styles.card, { backgroundColor: '#FFFFFF' }]}>
      {/* Banda de color superior */}
      <View style={[styles.topBand, { backgroundColor: meta.color }]} />

      {/* Header: logo + fecha */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Text style={styles.logoEmoji}>🦁</Text>
          <Text style={styles.logoText}>Leo</Text>
        </View>
        <Text style={styles.dateText}>{dateStr}</Text>
      </View>

      {/* Icono y tipo */}
      <View style={[styles.iconSection, { backgroundColor: meta.bgColor }]}>
        <Text style={styles.typeIcon}>{meta.icon}</Text>
        <Text style={[styles.typeLabel, { color: meta.color }]}>{typeLabel}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {/* Dato principal destacado */}
      {bigDetail ? (
        <View style={[styles.bigValueBox, { borderColor: meta.color, backgroundColor: meta.bgColor }]}>
          <Text style={[styles.bigValue, { color: meta.color }]}>{bigDetail.value}</Text>
          <Text style={styles.bigLabel}>{bigDetail.label}</Text>
        </View>
      ) : null}

      {/* Detalles secundarios */}
      {otherDetails.length > 0 && (
        <View style={styles.detailsSection}>
          {otherDetails.map((d, i) => (
            <View key={i} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{d.label}</Text>
              <Text style={styles.detailValue}>{d.value}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Hora */}
      <View style={styles.timeRow}>
        <Text style={styles.timeIcon}>🕐</Text>
        <Text style={styles.timeText}>{timeStr}</Text>
        {babyName ? <Text style={styles.babyName}> · {babyName}</Text> : null}
      </View>

      {/* Separador */}
      <View style={[styles.divider, { backgroundColor: meta.color + '30' }]} />

      {/* Footer: branding */}
      <View style={styles.footer}>
        <View style={styles.footerBranding}>
          <Text style={styles.footerLogoEmoji}>🦁</Text>
          <Text style={[styles.footerShared, { color: meta.color }]}>{t(lang, 'sharedFrom')}</Text>
        </View>
        <Text style={styles.footerPlayStore}>{t(lang, 'findOn')}</Text>
        <Text style={styles.footerUrl}>{GOOGLE_PLAY_URL}</Text>
      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    width: 360,
    borderRadius: 24,
    overflow: 'hidden',
    ...shadow('#000', 0.12, 24, 0, 8),
    elevation: 8,
  },
  topBand: {
    height: 6,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoEmoji: {
    fontSize: 20,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1A1A2E',
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  iconSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 24,
    borderRadius: 16,
    marginBottom: 16,
  },
  typeIcon: {
    fontSize: 52,
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  bigValueBox: {
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 2,
  },
  bigValue: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -2,
  },
  bigLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailsSection: {
    marginHorizontal: 24,
    marginBottom: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1A1A2E',
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 4,
  },
  timeIcon: {
    fontSize: 14,
  },
  timeText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  babyName: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 4,
  },
  footerBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  footerLogoEmoji: {
    fontSize: 16,
  },
  footerShared: {
    fontSize: 14,
    fontWeight: '700',
  },
  footerPlayStore: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  footerUrl: {
    fontSize: 10,
    color: '#AAA',
  },
});
