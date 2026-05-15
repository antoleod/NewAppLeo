import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  initializeAuth,
  setPersistence,
  type Auth,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

const requiredEnv = (name: string, value: string | undefined) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

// Firebase web config is public client configuration, not a secret.
// Sensitive keys must live in backend secrets or Cloud Functions, not in the Expo bundle.
export const firebaseConfig = {
  apiKey: requiredEnv('EXPO_PUBLIC_FIREBASE_API_KEY', process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
  authDomain: requiredEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: requiredEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: requiredEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: requiredEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: requiredEnv('EXPO_PUBLIC_FIREBASE_APP_ID', process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
} as const;

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/**
 * Firestore initialised with:
 *  - Web: IndexedDB persistent cache → snapshot listeners hydrate instantly
 *    on reload. `persistentMultipleTabManager` lets multiple tabs share one
 *    cache without each tab fighting for the IndexedDB lock.
 *  - Native (Expo): in-memory cache. The Firebase JS SDK's persistent cache
 *    needs IndexedDB which RN doesn't have; for true on-device persistence
 *    you'd switch to @react-native-firebase. Memory cache is still better
 *    than the default because it short-circuits same-session reconnects.
 *  - `experimentalAutoDetectLongPolling`: critical on flaky mobile networks
 *    and corporate proxies that block WebChannel streaming. Without it the
 *    SDK can hang for ~30 s before realising it has to fall back.
 */
let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    localCache:
      Platform.OS === 'web'
        ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        : memoryLocalCache(),
  });
} catch {
  dbInstance = getFirestore(app);
}
export const db = dbInstance;

/**
 * Auth persistence:
 *  - Web: IndexedDB-backed (`browserLocalPersistence`) → user stays logged in
 *    across page reloads / browser restarts.
 *  - Native: AsyncStorage-backed via `getReactNativePersistence`. This export
 *    only resolves once Metro picks up Firebase's RN-specific build, which
 *    requires `unstable_enablePackageExports = false` in `metro.config.js`.
 *    Without that, the import returns `undefined` → in-memory persistence →
 *    user is logged out at every cold start.
 *  - `initializeAuth` MUST run before any `getAuth(app)` call. We try/catch
 *    so HMR re-evaluation doesn't crash on "already initialized".
 */
let authInstance: Auth;
if (Platform.OS === 'web') {
  authInstance = getAuth(app);
  setPersistence(authInstance, browserLocalPersistence).catch((error) => {
    console.warn('Firebase auth persistence could not be set:', error);
  });
} else {
  try {
    // getReactNativePersistence isn't in the public types of firebase/auth v11
    // but is exported at runtime once Metro resolves the RN entry. The
    // dynamic require + cast keeps TypeScript happy without unsafe globals.
    const { getReactNativePersistence } = require('firebase/auth') as {
      getReactNativePersistence?: (storage: typeof AsyncStorage) => unknown;
    };
    if (typeof getReactNativePersistence === 'function') {
      authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage) as any,
      });
    } else {
      console.warn(
        'getReactNativePersistence not found — auth will use in-memory persistence. ' +
        'Confirm metro.config.js disables unstable_enablePackageExports.',
      );
      authInstance = getAuth(app);
    }
  } catch (error) {
    // initializeAuth throws if called twice (e.g. HMR). Fall back to getAuth.
    if (/already-initialized/i.test((error as any)?.code ?? '')) {
      authInstance = getAuth(app);
    } else {
      console.warn('initializeAuth failed, falling back to getAuth:', error);
      authInstance = getAuth(app);
    }
  }
}
export const auth = authInstance;

export { app };
