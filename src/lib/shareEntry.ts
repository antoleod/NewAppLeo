import { Share, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { EntryRecord } from '@/types';
import { haptics } from './haptics';
import { GOOGLE_PLAY_URL } from '@/components/history';

type Lang = 'fr' | 'es' | 'en' | 'nl';

interface ShareMessages {
  fr: string;
  es: string;
  en: string;
  nl: string;
}

function pick(messages: ShareMessages, lang: Lang): string {
  return messages[lang] ?? messages.en;
}

function formatHours(min?: number): string {
  if (!min) return '';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m}` : `${h}h`;
}

/**
 * Build a friendly, shareable message for an entry.
 * Medical entries (temperature, symptom, medication) get generic
 * supportive messages — the actual medical data is never shared.
 */
export function buildShareMessage(entry: EntryRecord, babyName: string, lang: Lang): string {
  const name = babyName || (lang === 'fr' ? 'bébé' : lang === 'es' ? 'bebé' : 'baby');
  const p = entry.payload ?? {};

  switch (entry.type) {
    case 'food': {
      const food = p.foodName || '';
      return pick(
        {
          fr: `🍽️ ${name} a goûté ${food} aujourd'hui ! ${p.foodLiked === 'yes' ? '😋 Adoré !' : ''}`.trim(),
          es: `🍽️ ¡${name} probó ${food} hoy! ${p.foodLiked === 'yes' ? '😋 ¡Le encantó!' : ''}`.trim(),
          en: `🍽️ ${name} tried ${food} today! ${p.foodLiked === 'yes' ? '😋 Loved it!' : ''}`.trim(),
          nl: `🍽️ ${name} heeft vandaag ${food} geproefd! ${p.foodLiked === 'yes' ? '😋 Vond het heerlijk!' : ''}`.trim(),
        },
        lang,
      );
    }

    case 'sleep': {
      const dur = formatHours(p.durationMin);
      return pick(
        {
          fr: `😴 ${name} a dormi ${dur} 💤`,
          es: `😴 ${name} durmió ${dur} 💤`,
          en: `😴 ${name} slept ${dur} 💤`,
          nl: `😴 ${name} sliep ${dur} 💤`,
        },
        lang,
      );
    }

    case 'feed': {
      const isBottle = p.mode === 'bottle';
      const amount = p.amountMl ? `${p.amountMl} ml` : '';
      return pick(
        {
          fr: isBottle ? `🍼 ${name} a pris son biberon ${amount} 💕` : `🤱 ${name} a tété ✨`,
          es: isBottle ? `🍼 ${name} terminó su biberón ${amount} 💕` : `🤱 ${name} tomó pecho ✨`,
          en: isBottle ? `🍼 ${name} finished a bottle ${amount} 💕` : `🤱 ${name} had a feeding ✨`,
          nl: isBottle ? `🍼 ${name} dronk een fles ${amount} 💕` : `🤱 ${name} kreeg borstvoeding ✨`,
        },
        lang,
      ).trim();
    }

    case 'diaper': {
      return pick(
        {
          fr: `👶 Encore une couche pour ${name} ! Une journée de plus 💛`,
          es: `👶 ¡Otro pañal para ${name}! Un día más 💛`,
          en: `👶 Another diaper change for ${name}! Another day 💛`,
          nl: `👶 Nog een luier voor ${name}! Weer een dag 💛`,
        },
        lang,
      );
    }

    case 'measurement': {
      const parts: string[] = [];
      if (p.weightKg) parts.push(`${p.weightKg} kg`);
      if (p.heightCm) parts.push(`${p.heightCm} cm`);
      const measures = parts.join(' · ');
      return pick(
        {
          fr: `📏 ${name} grandit ! ${measures} 🌱`,
          es: `📏 ¡${name} está creciendo! ${measures} 🌱`,
          en: `📏 ${name} is growing! ${measures} 🌱`,
          nl: `📏 ${name} groeit! ${measures} 🌱`,
        },
        lang,
      );
    }

    case 'vaccine': {
      return pick(
        {
          fr: `💪 ${name} a fait sa vaccination aujourd'hui. Quel courage ! ✨`,
          es: `💪 ${name} se vacunó hoy. ¡Qué valiente! ✨`,
          en: `💪 ${name} got vaccinated today. So brave! ✨`,
          nl: `💪 ${name} is vandaag gevaccineerd. Wat dapper! ✨`,
        },
        lang,
      );
    }

    case 'temperature':
    case 'symptom':
    case 'medication': {
      return pick(
        {
          fr: `💚 Pensées positives pour ${name} aujourd'hui`,
          es: `💚 Pensamientos positivos para ${name} hoy`,
          en: `💚 Sending good vibes to ${name} today`,
          nl: `💚 Positieve gedachten voor ${name} vandaag`,
        },
        lang,
      );
    }

    case 'pump': {
      const amount = p.amountMl ? `${p.amountMl} ml` : '';
      return pick(
        {
          fr: `💧 Tirage de lait ${amount} 💛`,
          es: `💧 Extracción de leche ${amount} 💛`,
          en: `💧 Pumped ${amount} 💛`,
          nl: `💧 Afgekolfd ${amount} 💛`,
        },
        lang,
      ).trim();
    }

    default: {
      return pick(
        {
          fr: `📔 Nouveau souvenir avec ${name} 💛`,
          es: `📔 Nuevo recuerdo con ${name} 💛`,
          en: `📔 New memory with ${name} 💛`,
          nl: `📔 Nieuwe herinnering met ${name} 💛`,
        },
        lang,
      );
    }
  }
}

/**
 * Share a text-only entry via the native share sheet.
 * Returns true if user shared, false if cancelled.
 */
export async function shareEntry(entry: EntryRecord, babyName: string, lang: Lang): Promise<boolean> {
  try {
    const message = buildShareMessage(entry, babyName, lang);
    const result = await Share.share({ message });
    if (result.action === Share.sharedAction) {
      haptics.success();
      return true;
    }
    return false;
  } catch (error) {
    haptics.error();
    return false;
  }
}

/**
 * Capture the ShareCard component as a PNG image and share it.
 * Accepts the `captureRef` result from react-native-view-shot.
 * Falls back to text sharing if image capture fails.
 */
export async function shareEntryAsImage(
  captureAsync: () => Promise<string>,
  entry: EntryRecord,
  babyName: string,
  lang: Lang,
): Promise<boolean> {
  // Web: share as text (image capture not supported on web)
  if (Platform.OS === 'web') {
    return shareEntry(entry, babyName, lang);
  }

  let imageUri: string | null = null;

  try {
    imageUri = await captureAsync();
  } catch {
    // If capture fails, fall back to text
    return shareEntry(entry, babyName, lang);
  }

  try {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      // Sharing not available (simulator / restricted env) → text fallback
      return shareEntry(entry, babyName, lang);
    }

    const caption = buildShareCaption(entry, babyName, lang);
    await Sharing.shareAsync(imageUri, {
      mimeType: 'image/png',
      dialogTitle: caption,
      UTI: 'public.png',
    });

    haptics.success();
    return true;
  } catch {
    haptics.error();
    // Last resort: text-only
    return shareEntry(entry, babyName, lang);
  }
}

/** Short caption text that accompanies the image in the share sheet */
function buildShareCaption(entry: EntryRecord, babyName: string, lang: Lang): string {
  const msg = buildShareMessage(entry, babyName, lang);
  const cta = {
    fr: `Trouver Leo sur Google Play : ${GOOGLE_PLAY_URL}`,
    es: `Encuentra Leo en Google Play: ${GOOGLE_PLAY_URL}`,
    en: `Find Leo on Google Play: ${GOOGLE_PLAY_URL}`,
    nl: `Vind Leo op Google Play: ${GOOGLE_PLAY_URL}`,
  }[lang];
  return `${msg}\n\n${cta}`;
}

/**
 * Detect if this entry is a "first time" milestone — useful for
 * suggesting sharing more prominently. For food: first time eating
 * this specific food. For others: always considered a milestone.
 */
export function isFirstTimeFood(entry: EntryRecord, allEntries: EntryRecord[]): boolean {
  if (entry.type !== 'food') return false;
  const foodName = entry.payload?.foodName?.toLowerCase().trim();
  if (!foodName) return false;
  const previousOccurrences = allEntries.filter(
    (e) =>
      e.id !== entry.id &&
      e.type === 'food' &&
      e.payload?.foodName?.toLowerCase().trim() === foodName &&
      new Date(e.occurredAt).getTime() < new Date(entry.occurredAt).getTime(),
  );
  return previousOccurrences.length === 0;
}
