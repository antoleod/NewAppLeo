import { Platform } from 'react-native';

const DEFAULT_WEB_BASE_PATH = '/NewAppLeo';

export function getWebBasePath() {
  const configured = process.env.EXPO_PUBLIC_BASE_PATH?.trim();
  const basePath = configured && configured !== '/' ? configured : DEFAULT_WEB_BASE_PATH;
  return basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
}

export function blurActiveElementOnWeb() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }

  const activeElement = document.activeElement as HTMLElement | null;
  if (activeElement && typeof activeElement.blur === 'function') {
    activeElement.blur();
  }
}
