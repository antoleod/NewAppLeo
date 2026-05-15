import { Platform } from 'react-native';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
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
 *
 * `initializeFirestore` must run BEFORE any call to `getFirestore`. We guard
 * with try/catch so HMR (which re-evaluates this file) doesn't crash on the
 * "already initialized" error.
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

export const auth = getAuth(app);

// browserLocalPersistence works on Web (IndexedDB) and is a no-op on RN.
// Real RN persistence requires firebase v10's `getReactNativePersistence`
// or migrating to @react-native-firebase/auth — see audit notes.
if (Platform.OS === 'web') {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn('Firebase auth persistence could not be set:', error);
  });
}

export { app };
