import { Platform } from 'react-native';

function getErrorCode(error: unknown) {
  return String((error as { code?: string } | null | undefined)?.code ?? '').toLowerCase();
}

function getErrorMessage(error: unknown) {
  return String((error as { message?: string } | null | undefined)?.message ?? '');
}

export function isPermissionDenied(error: unknown) {
  const code = getErrorCode(error);
  const message = getErrorMessage(error);
  return code === 'permission-denied' || code === 'firestore/permission-denied' || /permission/i.test(message);
}

export function isBlockedByClient(error: unknown) {
  return /err_blocked_by_client|blocked by client/i.test(getErrorMessage(error));
}

export function isOfflineFirestoreError(error: unknown) {
  const code = getErrorCode(error);
  const message = getErrorMessage(error);
  return (
    code === 'unavailable' ||
    code === 'firestore/unavailable' ||
    code === 'failed-precondition' ||
    code === 'firestore/failed-precondition' ||
    isBlockedByClient(error) ||
    /client is offline|offline|network request failed|failed to fetch|transport errored|cloud firestore backend/i.test(message)
  );
}

export function shouldUseFirestoreFallback(error: unknown) {
  return isPermissionDenied(error) || isOfflineFirestoreError(error);
}

export function isWebOnline() {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') {
    return true;
  }
  return navigator.onLine;
}

export function logFirebaseDevDiagnostics(context: string, error: unknown) {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  const onlineState = Platform.OS === 'web' ? ` online=${String(isWebOnline())}` : '';
  if (isBlockedByClient(error)) {
    console.warn(`[firebase:${context}] Request blocked by the browser or an extension.${onlineState}`, error);
    return;
  }

  if (isOfflineFirestoreError(error)) {
    console.warn(`[firebase:${context}] Using local/offline fallback.${onlineState}`, error);
  }
}
