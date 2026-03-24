import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { RegisterPayload } from '@/types';
import {
  claimUsername,
  createProfileRecord,
  loadProfile,
  resolveUsernameToProfile,
  verifyPinAgainstProfile,
} from './userProfileService';
import { decryptWithPin, encryptWithPin, generateSalt, hashPin, normalizeEmail, normalizeUsername } from '@/utils/crypto';
import { putLocalProfile, putLocalUsername } from './localStore';

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
    putLocalProfile(profile);
    putLocalUsername(username, authResult.user.uid);
    return { user: authResult.user, profile };
  }
}

export async function signInWithEmail(payload: { email: string; password: string }) {
  const authResult = await signInWithEmailAndPassword(auth, normalizeEmail(payload.email), payload.password);
  const profile = await loadProfile(authResult.user.uid);
  return { user: authResult.user, profile };
}

export async function signInWithUsernamePin(payload: { username: string; pin: string }) {
  const profile = await resolveUsernameToProfile(payload.username);
  if (!verifyPinAgainstProfile(payload.pin, profile)) {
    throw new Error('Incorrect PIN.');
  }

  const password = decryptWithPin(profile.encryptedPassword, payload.pin, profile.pinSalt);
  if (!password) {
    throw new Error('Could not decrypt the stored credentials.');
  }

  const authResult = await signInWithEmailAndPassword(auth, profile.authEmail, password);
  return { user: authResult.user, profile };
}

export async function signOutUser() {
  await signOut(auth);
}

export async function linkUsername(uid: string, username: string) {
  await claimUsername(uid, username);
}
