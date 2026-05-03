import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type UserCredential,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { RegisterPayload } from '@/types';
import {
  claimUsername,
  createProfileRecord,
  defaultProfile,
  loadProfile,
  userProfileRef,
  resolveUsernameToProfile,
  verifyPinAgainstProfile,
} from './userProfileService';
import { decryptWithPin, encryptWithPin, generateSalt, hashPin, normalizeEmail, normalizeUsername } from '@/utils/crypto';
import { putLocalProfile, putLocalUsername } from './localStore';
import { Platform } from 'react-native';

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

// Errors where the popup approach is blocked or fails for environmental reasons.
// In all these cases we fall back to a full-page redirect, which is more reliable.
const POPUP_FAILURE_CODES = new Set([
  'auth/popup-blocked',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/operation-not-supported-in-this-environment',
  'auth/internal-error',
  'auth/web-storage-unsupported',
  'auth/unauthorized-domain',
]);

function buildGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

async function bootstrapGoogleProfile(authResult: UserCredential) {
  let profile = await loadProfile(authResult.user.uid);
  if (profile) return profile;

  const email = authResult.user.email ?? `google_${authResult.user.uid}@local.app`;
  const displayName = authResult.user.displayName ?? email.split('@')[0];
  const bootstrap = {
    ...defaultProfile(authResult.user.uid, email, '', displayName),
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
  } catch {
    // fall back to local profile in restrictive Firestore environments
  }

  putLocalProfile(bootstrap);
  return bootstrap;
}

export async function signInWithGoogle() {
  if (Platform.OS !== 'web') {
    throw new Error('Google Sign-In is currently available on web only.');
  }

  const provider = buildGoogleProvider();

  // 1. Try popup first — fastest, no page reload, works in most desktop browsers.
  try {
    const authResult = await signInWithPopup(auth, provider);
    const profile = await bootstrapGoogleProfile(authResult);
    return { user: authResult.user, profile };
  } catch (error: any) {
    const code: string | undefined = error?.code;

    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      // User dismissed the popup intentionally — don't fall back.
      throw error;
    }

    if (!code || !POPUP_FAILURE_CODES.has(code)) {
      throw enrichGoogleError(error);
    }

    // 2. Fall back to full-page redirect. The result is captured on next app load
    //    by `consumeGoogleRedirectResult`. This call returns void / never resolves
    //    on this page because the browser navigates away.
    try {
      await signInWithRedirect(auth, provider);
    } catch (redirectError: any) {
      throw enrichGoogleError(redirectError ?? error);
    }
    // Should be unreachable; redirect navigates the page.
    throw new Error('Redirecting to Google sign-in...');
  }
}

function enrichGoogleError(error: any): Error {
  const code: string | undefined = error?.code;
  const detail = (() => {
    switch (code) {
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized for Google sign-in. Add it to Firebase Console → Authentication → Settings → Authorized domains.';
      case 'auth/operation-not-allowed':
        return 'Google sign-in is not enabled for this Firebase project. Enable it in Firebase Console → Authentication → Sign-in method.';
      case 'auth/internal-error':
        return 'Google sign-in failed. Check that Google is enabled in Firebase Console → Authentication, and that the app domain is in Authorized domains.';
      case 'auth/web-storage-unsupported':
        return 'Your browser blocks storage required for Google sign-in. Allow third-party cookies / local storage and try again.';
      default:
        return error?.message ?? 'Google sign-in failed.';
    }
  })();
  const wrapped = new Error(detail);
  (wrapped as any).code = code;
  return wrapped;
}

/**
 * Resolves a pending Google redirect, if any. Call once on app boot.
 * Returns a profile when the user just completed the redirect flow,
 * or null when there was nothing pending.
 */
export async function consumeGoogleRedirectResult() {
  if (Platform.OS !== 'web') return null;
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    const profile = await bootstrapGoogleProfile(result);
    return { user: result.user, profile };
  } catch (error) {
    console.warn('Google redirect result error:', error);
    return null;
  }
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
