import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { RegisterPayload } from '@/types';
import {
  createProfileRecord,
  defaultProfile,
  loadProfile,
  userProfileRef,
  verifyPinAgainstProfile,
} from './userProfileService';
import { decryptWithPin, encryptWithPin, generateSalt, hashPin, normalizeEmail, normalizeUsername } from '@/utils/crypto';
import { Platform } from 'react-native';

function isPermissionDenied(error: unknown) {
  return Boolean((error as any)?.code === 'permission-denied' || /permission/i.test((error as any)?.message ?? ''));
}

export async function registerAccount(payload: RegisterPayload) {
  const email = normalizeEmail(payload.email);
  const username = normalizeUsername(payload.username);
  const authResult = await createUserWithEmailAndPassword(auth, email, payload.password);

  try {
    const profile = await createProfileRecord({
      uid: authResult.user.uid,
      authEmail: email,
      username,
      displayName: payload.displayName,
      password: payload.password,
      pin: payload.pin,
    });

    try {
      await setDoc(
        doc(db, 'emails', email),
        {
          uid: authResult.user.uid,
          email,
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch {
      // This lookup is a convenience index; local fallback keeps registration usable
      // when the live Firestore project denies writes.
    }

    return { user: authResult.user, profile };
  } catch (error) {
    console.warn('Falling back to local registration profile:', error);
    const salt = await generateSalt();
    const profile = {
      uid: authResult.user.uid,
      displayName: payload.displayName,
      username,
      usernameLower: username,
      authEmail: email,
      encryptedPassword: encryptWithPin(payload.password, payload.pin, salt),
      pinHash: hashPin(payload.pin, salt),
      pinSalt: salt,
      role: 'parent' as const,
      status: 'active' as const,
      caregiverName: payload.displayName || email.split('@')[0],
      babyName: 'Leo',
      babyBirthDate: '2025-10-21',
      babySex: 'unspecified' as const,
      language: 'fr' as const,
      goalFeedingsPerDay: 8,
      goalSleepHoursPerDay: 14,
      goalDiapersPerDay: 6,
      themeMode: 'system' as const,
      hasCompletedOnboarding: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { user: authResult.user, profile };
  }
}

export async function signInWithEmail(payload: { email: string; password: string }) {
  const authResult = await signInWithEmailAndPassword(auth, normalizeEmail(payload.email), payload.password);
  let profile = null;
  try {
    profile = await loadProfile(authResult.user.uid);
  } catch (error) {
    if ((error as any)?.code !== 'permission-denied' && !/permission/i.test((error as any)?.message ?? '')) {
      throw error;
    }
  }

  if (!profile) {
    profile = await createProfileRecord({
      uid: authResult.user.uid,
      authEmail: normalizeEmail(payload.email),
      username: normalizeUsername(payload.email.split('@')[0] || authResult.user.uid.slice(0, 8)),
      displayName: payload.email.split('@')[0] || 'Parent',
      password: payload.password,
      pin: '0000',
    });
    await setDoc(
      doc(db, 'emails', normalizeEmail(payload.email)),
      {
        uid: authResult.user.uid,
        email: normalizeEmail(payload.email),
        createdAt: serverTimestamp(),
      },
      { merge: true },
    ).catch(() => undefined);
  }
  return { user: authResult.user, profile };
}

export async function signInWithEmailPin(payload: { email: string; pin: string }) {
  const email = normalizeEmail(payload.email);
  const derivedPassword = `leo:${payload.pin}:${email}`;

  try {
    const authResult = await signInWithEmailAndPassword(auth, email, derivedPassword);
    let profile = null;
    try {
      profile = await loadProfile(authResult.user.uid);
    } catch (error) {
      if (!isPermissionDenied(error)) {
        throw error;
      }
    }
    return { user: authResult.user, profile };
  } catch (directError: any) {
    if (directError?.code && directError.code !== 'auth/wrong-password' && directError.code !== 'auth/invalid-credential') {
      throw directError;
    }
  }

  let lookup;
  try {
    lookup = await getDoc(doc(db, 'emails', email));
  } catch (error) {
    if (isPermissionDenied(error)) {
      throw new Error('This PIN could not be verified. Use your password or reset your access key.');
    }
    throw error;
  }
  if (!lookup.exists()) {
    throw new Error('Unknown email address.');
  }

  const data = lookup.data() as { uid?: string };
  if (!data?.uid) {
    throw new Error('Profile lookup failed.');
  }

  let profile = null;
  try {
    profile = await loadProfile(data.uid);
  } catch (error) {
    if (isPermissionDenied(error)) {
      throw new Error('This PIN could not be verified. Use your password or reset your access key.');
    }
    throw error;
  }
  if (!profile) {
    throw new Error('Profile not found.');
  }

  if (!verifyPinAgainstProfile(payload.pin, profile)) {
    throw new Error('Incorrect PIN.');
  }

  const password = decryptWithPin(profile.encryptedPassword, payload.pin, profile.pinSalt);
  if (!password) {
    throw new Error('Could not unlock this account with the provided PIN.');
  }

  const authResult = await signInWithEmailAndPassword(auth, email, password);
  return { user: authResult.user, profile };
}

export async function signInWithGoogle() {
  if (Platform.OS !== 'web') {
    throw new Error('Google Sign-In is currently available on web only.');
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const authResult = await signInWithPopup(auth, provider);
  let profile = null;
  try {
    profile = await loadProfile(authResult.user.uid);
  } catch (error) {
    if (!isPermissionDenied(error)) {
      throw error;
    }
  }

  if (!profile) {
    const email = authResult.user.email ?? `google_${authResult.user.uid}@local.app`;
    const displayName = authResult.user.displayName ?? email.split('@')[0];
    const bootstrap = {
      ...defaultProfile(authResult.user.uid, email, normalizeUsername(email.split('@')[0] || authResult.user.uid.slice(0, 8)), displayName),
      displayName,
      caregiverName: displayName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(
        userProfileRef(authResult.user.uid),
        {
          ...bootstrap,
          createdAt: serverTimestamp() as any,
          updatedAt: serverTimestamp() as any,
        },
        { merge: true },
      );
      await setDoc(
        doc(db, 'emails', normalizeEmail(email)),
        {
          uid: authResult.user.uid,
          email: normalizeEmail(email),
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch {
      // fall back to local bootstrap profile in restrictive environments
    }

    profile = bootstrap;
  }

  return { user: authResult.user, profile };
}

export async function signOutUser() {
  await signOut(auth);
}

export async function resetPasswordWithEmail(email: string) {
  await sendPasswordResetEmail(auth, normalizeEmail(email));
}
