import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { OnboardingPayload, ThemeMode, UserProfile } from '@/types';
import { encryptWithPin, generateSalt, hashPin, normalizeUsername } from '@/utils/crypto';
import { getLocalProfile, getLocalProfileByUsername, putLocalProfile, putLocalUsername } from './localStore';

const USERS = 'users';
const USERNAMES = 'usernames';

function isPermissionDenied(error: unknown) {
  return Boolean((error as any)?.code === 'permission-denied' || /permission/i.test((error as any)?.message ?? ''));
}

export function userProfileRef(uid: string) {
  return doc(db, USERS, uid);
}

export function usernameRef(usernameLower: string) {
  return doc(db, USERNAMES, usernameLower);
}

export function entriesCollectionRef(uid: string) {
  return collection(db, USERS, uid, 'entries');
}

export function defaultProfile(uid: string, authEmail: string, username = '', displayName = ''): UserProfile {
  return {
    uid,
    displayName: displayName || authEmail.split('@')[0],
    username,
    usernameLower: normalizeUsername(username),
    authEmail,
    encryptedPassword: '',
    pinHash: '',
    pinSalt: '',
    role: 'parent',
    status: 'active',
    caregiverName: displayName || authEmail.split('@')[0],
    babyName: 'Leo',
    babyBirthDate: '2025-10-21',
    goalFeedingsPerDay: 8,
    goalSleepHoursPerDay: 14,
    goalDiapersPerDay: 6,
    themeMode: 'system',
    hasCompletedOnboarding: false,
  };
}

function profileToLocal(profile: UserProfile) {
  return {
    ...profile,
    createdAt: profile.createdAt ?? new Date().toISOString(),
    updatedAt: profile.updatedAt ?? new Date().toISOString(),
  };
}

function withLocalFallback(profile: UserProfile) {
  putLocalProfile(profileToLocal(profile));
  if (profile.usernameLower) {
    putLocalUsername(profile.usernameLower, profile.uid);
  }
  return profileToLocal(profile);
}

export async function loadProfile(uid: string) {
  try {
    const snap = await getDoc(userProfileRef(uid));
    return snap.exists() ? (snap.data() as UserProfile) : getLocalProfile(uid);
  } catch (error) {
    if (isPermissionDenied(error)) {
      return getLocalProfile(uid);
    }
    throw error;
  }
}

export function watchProfile(uid: string, onChange: (profile: UserProfile | null) => void, onError?: (error: unknown) => void) {
  try {
    return onSnapshot(
      userProfileRef(uid),
      (snapshot) => {
        const profile = snapshot.exists() ? (snapshot.data() as UserProfile) : getLocalProfile(uid);
        onChange(profile);
      },
      (error) => {
        if (isPermissionDenied(error)) {
          onChange(getLocalProfile(uid));
          return;
        }
        console.error('Profile listener error:', error);
        onError?.(error);
      },
    );
  } catch (error) {
    onChange(getLocalProfile(uid));
    return () => undefined;
  }
}

export async function createProfileRecord(params: {
  uid: string;
  authEmail: string;
  username: string;
  displayName: string;
  password: string;
  pin: string;
}) {
  const username = normalizeUsername(params.username);
  const pinSalt = await generateSalt();
  const pinHash = hashPin(params.pin, pinSalt);
  const encryptedPassword = encryptWithPin(params.password, params.pin, pinSalt);
  const profile: UserProfile = {
    ...defaultProfile(params.uid, params.authEmail, username, params.displayName),
    displayName: params.displayName,
    username,
    usernameLower: username,
    authEmail: params.authEmail,
    encryptedPassword,
    pinHash,
    pinSalt,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    hasCompletedOnboarding: false,
  };

  try {
    await runTransaction(db, async (transaction) => {
      const usernameDoc = usernameRef(username);
      const usernameSnap = await transaction.get(usernameDoc);
      if (usernameSnap.exists()) {
        throw new Error('That username is already taken.');
      }
      transaction.set(usernameDoc, {
        uid: params.uid,
        username,
        usernameLower: username,
        createdAt: serverTimestamp(),
      });
      transaction.set(userProfileRef(params.uid), {
        ...profile,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      });
    });
    return profile;
  } catch (error) {
    if (isPermissionDenied(error)) {
      return withLocalFallback(profile);
    }
    throw error;
  }
}

export async function updateProfile(uid: string, partial: Partial<UserProfile>) {
  try {
    await setDoc(
      userProfileRef(uid),
      {
        ...partial,
        updatedAt: serverTimestamp() as any,
      },
      { merge: true },
    );
  } catch (error) {
    if (!isPermissionDenied(error)) {
      throw error;
    }
  }

  const current = (await loadProfile(uid)) ?? defaultProfile(uid, 'local@example.com');
  const next = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  } as UserProfile;
  withLocalFallback(next);
}

export async function completeOnboarding(uid: string, payload: OnboardingPayload) {
  await updateProfile(uid, {
    caregiverName: payload.caregiverName,
    babyName: payload.babyName,
    babyBirthDate: payload.babyBirthDate,
    goalFeedingsPerDay: payload.goalFeedingsPerDay,
    goalSleepHoursPerDay: payload.goalSleepHoursPerDay,
    goalDiapersPerDay: payload.goalDiapersPerDay,
    hasCompletedOnboarding: true,
  });
}

export async function updateThemeMode(uid: string, themeMode: ThemeMode) {
  await updateProfile(uid, { themeMode });
}

export async function claimUsername(uid: string, username: string) {
  const normalized = normalizeUsername(username);
  try {
    await runTransaction(db, async (transaction) => {
      const lookup = usernameRef(normalized);
      const snap = await transaction.get(lookup);
      if (snap.exists()) {
        const ownerUid = snap.data()?.uid;
        if (ownerUid && ownerUid !== uid) {
          throw new Error('That username is already in use.');
        }
      }
      transaction.set(lookup, { uid, username: normalized, usernameLower: normalized, updatedAt: serverTimestamp() as any }, { merge: true });
      transaction.set(userProfileRef(uid), { username: normalized, usernameLower: normalized, updatedAt: serverTimestamp() as any }, { merge: true });
    });
  } catch (error) {
    if (!isPermissionDenied(error)) {
      throw error;
    }
  }

  const current = (await loadProfile(uid)) ?? defaultProfile(uid, 'local@example.com');
  withLocalFallback({
    ...current,
    username: normalized,
    usernameLower: normalized,
    updatedAt: new Date().toISOString(),
  });
}

export async function resolveUsernameToProfile(username: string) {
  const normalized = normalizeUsername(username);
  try {
    const snap = await getDoc(usernameRef(normalized));
    if (!snap.exists()) {
      throw new Error('Unknown username.');
    }
    const data = snap.data() as { uid: string };
    const profile = await loadProfile(data.uid);
    if (!profile) {
      throw new Error('Profile not found.');
    }
    return profile;
  } catch (error) {
    if (isPermissionDenied(error)) {
      const localProfile = getLocalProfileByUsername(normalized);
      if (!localProfile) {
        throw new Error('Unknown username.');
      }
      return localProfile;
    }
    throw error;
  }
}

export function verifyPinAgainstProfile(pin: string, profile: UserProfile) {
  return hashPin(pin, profile.pinSalt) === profile.pinHash;
}
