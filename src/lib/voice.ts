export type VoiceIntent =
  | { kind: 'feed'; side?: 'left' | 'right'; mode?: 'breast' | 'bottle' }
  | { kind: 'diaper' }
  | { kind: 'sleep' }
  | { kind: 'pump' }
  | { kind: 'stop' }
  | { kind: 'medication' }
  | { kind: 'measurement' }
  | { kind: 'unknown'; transcript: string };

function normalizeTranscript(transcript: string) {
  return transcript
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function findSide(transcript: string): 'left' | 'right' | undefined {
  if (/\b(left|izquierda|gauche)\b/.test(transcript)) return 'left';
  if (/\b(right|derecha|droite)\b/.test(transcript)) return 'right';
  return undefined;
}

function findMode(transcript: string): 'breast' | 'bottle' | undefined {
  if (/\b(breast|breastfeed|sein|pecho)\b/.test(transcript)) return 'breast';
  if (/\b(bottle|biberon|formula|lait)\b/.test(transcript)) return 'bottle';
  return undefined;
}

export function parseVoiceCommand(transcript: string): VoiceIntent {
  const normalized = normalizeTranscript(transcript);
  if (!normalized) {
    return { kind: 'unknown', transcript };
  }

  if (/\b(stop|pause|arrete|stoppe)\b/.test(normalized)) {
    return { kind: 'stop' };
  }

  if (/\b(diaper|couche|nappy)\b/.test(normalized)) {
    return { kind: 'diaper' };
  }

  if (/\b(sleep|nap|dodo|sieste)\b/.test(normalized)) {
    return { kind: 'sleep' };
  }

  if (/\b(pump|tire-lait|tirer|expression)\b/.test(normalized)) {
    return { kind: 'pump' };
  }

  if (/\b(medication|meds|medicament|medicine)\b/.test(normalized)) {
    return { kind: 'medication' };
  }

  if (/\b(weight|poids|height|taille|measure|mesure)\b/.test(normalized)) {
    return { kind: 'measurement' };
  }

  if (/\b(feed|nurse|nourris|log feed|log bottle|log breast)\b/.test(normalized) || findMode(normalized)) {
    return {
      kind: 'feed',
      side: findSide(normalized),
      mode: findMode(normalized),
    };
  }

  return { kind: 'unknown', transcript };
}

export function getVoiceCommandHints() {
  return [
    'Start left breast',
    'Log bottle',
    'Log diaper',
    'Start pump',
    'Log sleep',
    'Log weight',
  ];
}
