import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
export const firebaseConfig = {
  apiKey: 'AIzaSyCRvodMEsVaZ0ynCqTTR8quIAAvW445kzE',
  authDomain: 'appleo-a0ba4.firebaseapp.com',
  projectId: 'appleo-a0ba4',
  storageBucket: 'appleo-a0ba4.firebasestorage.app',
  messagingSenderId: '1045704718169',
  appId: '1:1045704718169:web:c422f19c13176efae6be48',
  measurementId: 'G-BG54P5T72H',
} as const;

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);

export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('Firebase auth persistence could not be set:', error);
});

export { app };
