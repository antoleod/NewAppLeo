import { parseVoiceCommand, type VoiceIntent } from '@/lib/voice';

type VoiceRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type VoiceRecognitionCtor = new () => VoiceRecognitionInstance;

function getRecognitionCtor(): VoiceRecognitionCtor | null {
  const global = globalThis as typeof globalThis & {
    SpeechRecognition?: VoiceRecognitionCtor;
    webkitSpeechRecognition?: VoiceRecognitionCtor;
  };

  return global.SpeechRecognition ?? global.webkitSpeechRecognition ?? null;
}

export function isVoiceCaptureAvailable() {
  return Boolean(getRecognitionCtor());
}

export function startVoiceCapture({
  onIntent,
  onTranscript,
  onError,
}: {
  onIntent: (intent: VoiceIntent) => void;
  onTranscript?: (transcript: string) => void;
  onError?: (error: Error) => void;
}) {
  const Recognition = getRecognitionCtor();
  if (!Recognition) {
    const error = new Error('Voice capture is only available in supported browsers.');
    onError?.(error);
    throw error;
  }

  const recognition = new Recognition();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results as ArrayLike<{ 0: { transcript: string } }> )
      .map((result) => result[0].transcript)
      .join(' ')
      .trim();

    if (transcript) {
      onTranscript?.(transcript);
      onIntent(parseVoiceCommand(transcript));
    }
  };

  recognition.onerror = (event) => {
    onError?.(new Error((event as any)?.error ?? 'Voice capture failed.'));
  };

  recognition.start();

  return {
    stop: () => recognition.stop(),
  };
}
